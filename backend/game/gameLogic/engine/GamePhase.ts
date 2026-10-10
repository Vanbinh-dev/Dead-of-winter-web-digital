import type { Ctx } from "boardgame.io";
import { INVALID_MOVE } from "boardgame.io/dist/types/packages/core.js";
import type { Effect } from "../Effect.js";
import type { G } from "../GameState.js";
import type { EffectId, PlayerId } from "../Type.js";
import { type BasicReturnState, DicePrimitives, TokenAndSupplyPrimitives } from "./EffectEngine.js";
import { CRISIS_CARDS, ITEM_CARDS } from "./GameData.js";
import type { RandomAPI } from "./PlayerAction.js";
import { countSurvivorsAt, SpatialPrimitives } from "./Spatial.js";

export interface IPhaseManagementRules {
     setupPhase(G: G, ctx: Ctx, random: RandomAPI): BasicReturnState;
     colonyPhase(G: G, ctx: Ctx): BasicReturnState;

     registerEffect(G: G, effectId: EffectId, effect: Effect): BasicReturnState;
     unregisterEffect(G: G, effectId: EffectId): BasicReturnState;

     endGame(G: G, ctx: Ctx): BasicReturnState;

     payFood(G: G, ctx: Ctx): BasicReturnState;
     checkWaste(G: G, ctx: Ctx): BasicReturnState;
     resolveCrisis(G: G, ctx: Ctx): BasicReturnState;
     spawnZombiesStep(G: G, ctx: Ctx): BasicReturnState;
     resolveNoise(G: G, ctx: Ctx): BasicReturnState;
     checkMainObjective(G: G, ctx: Ctx): boolean;
     passFirstPlayerToken(G: G, ctx: Ctx): BasicReturnState;

     rollPlayerDiceOnTurnBegin(G: G, playerId: PlayerId, ctx: Ctx, random: RandomAPI): BasicReturnState;
     drawCrossroadsCard(G: G, activePlayerId: PlayerId, ctx: Ctx): BasicReturnState;
     resetTurnActionTracking(G: G, playerId: PlayerId): BasicReturnState;
}
export const PhaseManagementRules: IPhaseManagementRules = {
     setupPhase(G: G, ctx: Ctx, random: RandomAPI): BasicReturnState {
          const crisisDeck = G.private.decks.crisis;
          if (crisisDeck.deck.length > 0)
               G.public.currentCrisisId = crisisDeck.deck.shift() ?? null;

          G.private.crisisContribution = [];

          for (const playerId of ctx.playOrder)
               this.rollPlayerDiceOnTurnBegin(G, playerId, ctx, random);

          for (const survivor of Object.values(G.public.survivors))
               survivor.movedThisTurn = false;
     },

     colonyPhase(G: G, ctx: Ctx): BasicReturnState {
          this.payFood(G, ctx);
          this.checkWaste(G, ctx);
          this.resolveCrisis(G, ctx);
          this.spawnZombiesStep(G, ctx);
          this.resolveNoise(G, ctx);

          if (this.checkMainObjective(G, ctx))
               this.endGame(G, ctx);

          this.passFirstPlayerToken(G, ctx);
     },

     payFood(G: G, ctx: Ctx): BasicReturnState {
          const colonySurvivors = countSurvivorsAt(G.public, "colony");
          const totalPeople = colonySurvivors + (G.public.colony.helpless ?? 0);
          const requiredFood = Math.ceil(totalPeople / 2);

          if (G.public.colony.food >= requiredFood)
               G.public.colony.food -= requiredFood;
          else {
               G.public.colony.food = 0;
               TokenAndSupplyPrimitives.modifyStarvationToken(G, 1);
               TokenAndSupplyPrimitives.modifyMorale(G, -G.public.colony.starvation);
          }
     },

     checkWaste(G: G, ctx: Ctx): BasicReturnState {
          if (G.public.colony.wastePile >= 10)
               TokenAndSupplyPrimitives.modifyMorale(G, -1);
     },

     resolveCrisis(G: G, ctx: Ctx): BasicReturnState {
          if (!G.public.currentCrisisId)
               return;

          const crisisData = CRISIS_CARDS.get(G.public.currentCrisisId);
          if (!crisisData)
               return;

          const contributions = G.private.crisisContribution;
          let score = 0;

          for (const cardId of contributions) {
               const card = ITEM_CARDS.get(cardId);
               if (card && CRISIS_CARDS.get(cardId)?.prevent.includes(card.symbol))
                    score += 1;
               else
                    score -= 1;
          }

          let nonExilePlayers = Object.values(G.public.players).filter(p => p.status != 'exiled').length;
          const requiredThreshold = nonExilePlayers;

          if (score < requiredThreshold)
               console.log('Crisis fail!')
          if (score + 2 == requiredThreshold)
               TokenAndSupplyPrimitives.modifyMorale(G, 2);

          G.private.crisisContribution = [];
          G.public.currentCrisisId = null;
     },

     spawnZombiesStep(G: G, ctx: Ctx): BasicReturnState {
          const colonyPeople = countSurvivorsAt(G.public, "colony") + (G.public.colony.helpless ?? 0);
          const zombiesToSpawnAtColony = Math.ceil(colonyPeople / 2);
          const locationInfo = Object.values(G.public.locations)

          for (const locState of locationInfo.values())
               SpatialPrimitives.spawnZombie(G.public, locState.id, locState.survivorSlot);
          for (let i = 1; i <= zombiesToSpawnAtColony; i++)
               SpatialPrimitives.spawnZombie(G.public, 'colony', 1, i % 7);
     },
     resolveNoise(G: G, ctx: Ctx): BasicReturnState {
          return;
     },

     checkMainObjective(G: G, ctx: Ctx): boolean {
          return false;
     },

     passFirstPlayerToken(G: G, ctx: Ctx): BasicReturnState {
     },


     rollPlayerDiceOnTurnBegin(G: G, playerId: PlayerId, ctx: Ctx, random: RandomAPI): BasicReturnState {
          const player = G.public.players[playerId];
          if (!player)
               return INVALID_MOVE;

          const survivorCount = player.survivorIds.length;
          const totalDice = 1 + survivorCount;
          const rolledDice: number[] = [];

          for (let i = 0; i < totalDice; i++)
               rolledDice.push(DicePrimitives.rollSixSideDice(random));

          player.dice.unused = rolledDice;
          player.dice.used = [];
     },

     drawCrossroadsCard(G: G, activePlayerId: PlayerId, ctx: Ctx): BasicReturnState {
          const crossroadsDeck = G.private.decks.crossroads;
          if (crossroadsDeck.deck.length === 0)
               return INVALID_MOVE;

          const cardId = crossroadsDeck.deck.shift();
          if (cardId)
               console.log("Drawing new crossroad card")
     },

     resetTurnActionTracking(G: G, playerId: PlayerId): BasicReturnState {
          const player = G.public.players[playerId];
          if (!player)
               return INVALID_MOVE;

          for (const survivorId of player.survivorIds) {
               const survivor = G.public.survivors[survivorId];
               if (survivor)
                    survivor.movedThisTurn = false;
          }
     },

     registerEffect(G: G, effectId: EffectId, effect: Effect): BasicReturnState {
          if (!G.public.additionEffect)
               G.public.additionEffect = [];
          G.public.additionEffect.push(effect.id);
     },

     unregisterEffect(G: G, effectId: EffectId): BasicReturnState {
          if (G.public.additionEffect) {
               const index = G.public.additionEffect.indexOf(effectId);
               G.public.additionEffect.splice(index, 1);
          }
     },

     endGame(G: G, ctx: Ctx): BasicReturnState {
          ctx.gameover = true;
     },
};