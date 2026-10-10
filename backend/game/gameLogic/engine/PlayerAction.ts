import type { Ctx } from "boardgame.io";
import { CardPrimitives, type ItemSymbol } from "../../deck/Card.js";
import type { SurvivorId, LocationId, CardId, PlayerId, EffectId, SurvivorLocationId } from "../Type.js";
import { type GameState, type BasicReturnState, DicePrimitives } from "./EffectEngine.js";
import type { G } from "../GameState.js";
import { INVALID_MOVE } from 'boardgame.io/core';
import type { FnContext } from "boardgame.io";
import { SpatialPrimitives } from "./Spatial.js";
import { ITEM_CARDS, SURVIVOR_CARDS } from "./GameData.js";

export type RandomAPI = NonNullable<FnContext["random"]>;

export interface IPlayerActions {
  attack(
    state: G,
    ctx: Ctx,
    survivorId: SurvivorId,
    targetType: "ZOMBIE" | "SURVIVOR",
    targetLocationId: LocationId,
    dieIndex: number,
    targetSurvivorId?: SurvivorId
  ): BasicReturnState;

  search(
    state: G,
    ctx: Ctx,
    survivorId: SurvivorId,
    locationId: LocationId,
    dieIndex: number
  ): BasicReturnState;

  barricade(
    state: G,
    ctx: Ctx,
    survivorId: SurvivorId,
    locationId: LocationId,
    dieIndex: number,
    entranceNumber?: number
  ): BasicReturnState;

  cleanWaste(
    state: G,
    ctx: Ctx,
    dieIndex: number
  ): BasicReturnState;

  attract(
    state: G,
    ctx: Ctx,
    survivorId: SurvivorId,
    fromLocationId: LocationId,
    targetLocationId: LocationId,
    dieIndex: number,
    amount?: number
  ): BasicReturnState;

  useSurvivorAbility(
    state: G,
    ctx: Ctx,
    survivorId: SurvivorId,
    dieIndex?: number,
    payload?: unknown
  ): BasicReturnState;

  moveSurvivor(
    state: G,
    ctx: Ctx,
    survivorId: SurvivorId,
    toLocationId: LocationId
  ): BasicReturnState;

  moveSurvivorWithFuel(
    state: G,
    ctx: Ctx,
    survivorId: SurvivorId,
    toLocationId: LocationId,
    fuelCardId: CardId
  ): BasicReturnState;

  playCard(
    state: G,
    ctx: Ctx,
    playerId: PlayerId,
    cardId: CardId,
    targetSurvivorId?: SurvivorId
  ): BasicReturnState;

  contributeToCrisis(
    state: G,
    ctx: Ctx,
    playerId: PlayerId,
    cardIds: CardId[]
  ): BasicReturnState;

  spendFoodToken(
    state: G,
    ctx: Ctx,
    playerId: PlayerId,
    dieIndex: number
  ): BasicReturnState;

  requestCard(
    state: G,
    ctx: Ctx,
    fromPlayerId: PlayerId,
    targetPlayerId: PlayerId,
    requestedSymbol: ItemSymbol
  ): BasicReturnState;

  transferEquipment(
    state: G,
    ctx: Ctx,
    fromSurvivorId: SurvivorId,
    toSurvivorId: SurvivorId,
    cardId: CardId
  ): BasicReturnState;

  voteExile(
    state: G,
    ctx: Ctx,
    initiatorPlayerId: PlayerId,
    targetPlayerId: PlayerId
  ): BasicReturnState;

  triggerActiveEffect(
    state: G,
    ctx: Ctx,
    effectId: EffectId,
    dieIndex?: number
  ): BasicReturnState;
}

function applyExposureRoll(
  state: G,
  ctx: Ctx,
  random: RandomAPI,
  survivorId: SurvivorId,
  locationId: SurvivorLocationId
): BasicReturnState {
  const result = DicePrimitives.rollExposureDice(random);

  if (result === "blank")
    return;

  if (result === "wound")
    return SpatialPrimitives.receiveWound(state.public, survivorId, "wound", 1);

  if (result === "frostbite")
    return SpatialPrimitives.receiveWound(state.public, survivorId, "frostbite", 1);

  SpatialPrimitives.killSurvivor(state.public, survivorId);
  // Following spread effect
}

export const PlayerActions = {
  attack(
    state: G,
    ctx: Ctx,
    random: RandomAPI,
    survivorId: SurvivorId,
    targetType: "ZOMBIE" | "SURVIVOR",
    targetLocationId: LocationId | 'colony',
    dieIndex: number,
    entranceIndex?: number,
    targetSurvivorId?: SurvivorId
  ): BasicReturnState {
    const survivor = state.public.survivors[survivorId];
    const activePlayerId = ctx.currentPlayer;

    if (!survivor || survivor.owner !== activePlayerId)
      return INVALID_MOVE;

    if (survivor.location !== targetLocationId)
      return INVALID_MOVE;

    const survivorData = SURVIVOR_CARDS.get(survivorId);
    const player = state.public.players[activePlayerId];
    const dieValue = player?.dice.unused[dieIndex];

    if (dieValue === undefined || (survivorData && dieValue < survivorData.attack))
      return INVALID_MOVE;

    if (targetType === "ZOMBIE") {
      const isColony = targetLocationId === "colony";
      const entrance = isColony
        ? state.public.colony.entrances[0]
        : state.public.locations[targetLocationId]?.entrance;

      if (!entrance || entrance.zombies === 0)
        return INVALID_MOVE;

      spendDieByIndex(state, activePlayerId, dieIndex);
      SpatialPrimitives.destroyZombie(state.public, targetLocationId, 1, entranceIndex);
      return applyExposureRoll(state, ctx, random, survivorId, targetLocationId);
    }

    if (targetType === "SURVIVOR") {
      if (!targetSurvivorId || targetSurvivorId === survivorId)
        return INVALID_MOVE;

      const targetSurvivor = state.public.survivors[targetSurvivorId];
      if (!targetSurvivor || targetSurvivor.location !== targetLocationId)
        return INVALID_MOVE;

      spendDieByIndex(state, activePlayerId, dieIndex);
      const attackValue = DicePrimitives.rollSixSideDice(random);
      if (attackValue <= SURVIVOR_CARDS.get(targetSurvivorId)!.attack)
        SpatialPrimitives.receiveWound(state.public, targetSurvivorId, "wound", 1);
    }
  },

  search(
    state: G,
    ctx: Ctx,
    survivorId: SurvivorId,
    locationId: LocationId | 'colony',
    dieIndex: number
  ): BasicReturnState {
    const survivor = state.public.survivors[survivorId];
    const activePlayerId = ctx.currentPlayer;

    if (!survivor || survivor.owner !== activePlayerId || survivor.location !== locationId)
      return INVALID_MOVE;

    if (locationId === "colony")
      return INVALID_MOVE;

    const survivorData = SURVIVOR_CARDS.get(survivorId);
    const player = state.public.players[activePlayerId];
    const dieValue = player?.dice.unused[dieIndex];

    if (dieValue === undefined || (survivorData && dieValue < survivorData.search))
      return INVALID_MOVE;

    const searchDeck = state.private.searchDecks[locationId];
    if (!searchDeck || searchDeck.deck.length === 0)
      return INVALID_MOVE;

    spendDieByIndex(state, activePlayerId, dieIndex);
    return CardPrimitives.drawCard(state, locationId, activePlayerId, 1);
  },

  barricade(
    state: G,
    ctx: Ctx,
    survivorId: SurvivorId,
    locationId: LocationId,
    dieIndex: number,
    entranceNumber?: number
  ): BasicReturnState {
    const survivor = state.public.survivors[survivorId];
    const activePlayerId = ctx.currentPlayer;

    if (!survivor || survivor.owner !== activePlayerId || survivor.location !== locationId)
      return INVALID_MOVE;

    const die = spendDieByIndex(state, activePlayerId, dieIndex);
    if (die === null)
      return INVALID_MOVE;

    return SpatialPrimitives.placeBarricade(
      state.public,
      locationId,
      1,
      entranceNumber
    );
  },

  cleanWaste(state: G, ctx: Ctx, dieIndex: number): BasicReturnState {
    const activePlayerId = ctx.currentPlayer;
    const hasSurvivorAtColony = Object.values(state.public.survivors).some(
      s => s.owner === activePlayerId && s.location === "colony"
    );

    if (!hasSurvivorAtColony || state.public.colony.wastePile === 0)
      return INVALID_MOVE;

    const die = spendDieByIndex(state, activePlayerId, dieIndex);
    if (die === null)
      return INVALID_MOVE;

    state.public.colony.wastePile = Math.max(0, state.public.colony.wastePile - 3);
  },

  attract(
    state: G,
    ctx: Ctx,
    survivorId: SurvivorId,
    fromLocationId: LocationId,
    targetLocationId: LocationId,
    dieIndex: number,
    amount = 2
  ): BasicReturnState {
    const survivor = state.public.survivors[survivorId];
    const activePlayerId = ctx.currentPlayer;

    if (!survivor || survivor.owner !== activePlayerId || survivor.location !== targetLocationId)
      return INVALID_MOVE;

    const die = spendDieByIndex(state, activePlayerId, dieIndex);
    if (die === null)
      return INVALID_MOVE;

    return SpatialPrimitives.moveZombie(state.public, fromLocationId, targetLocationId, amount);
  },

  useSurvivorAbility(
    state: G,
    ctx: Ctx,
    survivorId: SurvivorId,
    dieIndex?: number,
    payload?: unknown
  ): BasicReturnState {
    const survivor = state.public.survivors[survivorId];
    const activePlayerId = ctx.currentPlayer;

    if (!survivor || survivor.owner !== activePlayerId)
      return INVALID_MOVE;

    if (dieIndex !== undefined) {
      const die = spendDieByIndex(state, activePlayerId, dieIndex);
      if (die === null)
        return INVALID_MOVE;
    }
  },

  moveSurvivor(
    state: G,
    ctx: Ctx,
    random: RandomAPI,
    survivorId: SurvivorId,
    toLocationId: LocationId
  ): BasicReturnState {
    const survivor = state.public.survivors[survivorId];
    if (!survivor || survivor.owner !== ctx.currentPlayer)
      return INVALID_MOVE;

    const moveResult = SpatialPrimitives.moveSurvivor(
      state.public,
      survivorId,
      toLocationId,
    );

    if (moveResult === INVALID_MOVE)
      return INVALID_MOVE;

    return applyExposureRoll(state, ctx, random, survivorId, toLocationId);
  },

  moveSurvivorWithFuel(
    state: G,
    ctx: Ctx,
    survivorId: SurvivorId,
    toLocationId: LocationId,
    fuelCardId: CardId
  ): BasicReturnState {
    const survivor = state.public.survivors[survivorId];
    const activePlayerId = ctx.currentPlayer;

    if (!survivor || survivor.owner !== activePlayerId)
      return INVALID_MOVE;

    const playerHand = state.private.players[activePlayerId]?.hand;
    if (!playerHand || !playerHand.includes(fuelCardId))
      return INVALID_MOVE;

    const discardResult = CardPrimitives.discardCard(state, activePlayerId, fuelCardId);
    if (discardResult === INVALID_MOVE)
      return INVALID_MOVE;

    return SpatialPrimitives.moveSurvivor(
      state.public,
      survivorId,
      toLocationId,
    );
  },

  playCard(
    state: G,
    ctx: Ctx,
    playerId: PlayerId,
    cardId: CardId,
    targetSurvivorId?: SurvivorId
  ): BasicReturnState {
    if (playerId !== ctx.currentPlayer)
      return INVALID_MOVE;

    const playerPrivate = state.private.players[playerId];
    if (!playerPrivate || !playerPrivate.hand.includes(cardId))
      return INVALID_MOVE;

    const cardInfo = ITEM_CARDS.get(cardId);
    if (cardInfo?.isEquip) {
      if (!targetSurvivorId)
        return INVALID_MOVE;
      return CardPrimitives.equipCard(state, cardId, targetSurvivorId);
    }

    return CardPrimitives.discardCard(state, playerId, cardId);
  },

  contributeToCrisis(
    state: G,
    ctx: Ctx,
    playerId: PlayerId,
    cardIds: CardId[]
  ): BasicReturnState {
    const playerPrivate = state.private.players[playerId];
    const playerPublic = state.public.players[playerId];

    if (!playerPrivate || !playerPublic || cardIds.length === 0)
      return INVALID_MOVE;

    for (const cardId of cardIds) {
      const idx = playerPrivate.hand.indexOf(cardId);
      if (idx === -1)
        return INVALID_MOVE;
      playerPrivate.hand.splice(idx, 1);
      state.private.crisisContribution.push(cardId);
    }

    playerPublic.handSize = playerPrivate.hand.length;
  },

  spendFoodToken(
    state: G,
    ctx: Ctx,
    playerId: PlayerId,
    dieIndex: number
  ): BasicReturnState {
    if (state.public.colony.food <= 0)
      return INVALID_MOVE;

    const player = state.public.players[playerId];
    if (!player || dieIndex < 0 || dieIndex >= player.dice.unused.length)
      return INVALID_MOVE;

    state.public.colony.food -= 1;
    player.dice.unused[dieIndex] = Math.min(6, player.dice.unused[dieIndex]! + 1);
  },

  requestCard(
    state: G,
    ctx: Ctx,
    fromPlayerId: PlayerId,
    targetPlayerId: PlayerId,
    requestedSymbol: ItemSymbol
  ): BasicReturnState {
    if (fromPlayerId !== ctx.currentPlayer || fromPlayerId === targetPlayerId)
      return INVALID_MOVE;

    const targetHand = state.private.players[targetPlayerId]?.hand;
    if (!targetHand)
      return INVALID_MOVE;

    const matchedCardId = targetHand.find(id => ITEM_CARDS.get(id)?.symbol === requestedSymbol);
    if (!matchedCardId)
      return INVALID_MOVE;

    return CardPrimitives.transferCard(state, matchedCardId, targetPlayerId, fromPlayerId);
  },

  transferEquipment(
    state: G,
    ctx: Ctx,
    fromSurvivorId: SurvivorId,
    toSurvivorId: SurvivorId,
    cardId: CardId
  ): BasicReturnState {
    const fromSurvivor = state.public.survivors[fromSurvivorId];
    const toSurvivor = state.public.survivors[toSurvivorId];

    if (!fromSurvivor || !toSurvivor)
      return INVALID_MOVE;

    return CardPrimitives.transferEquipment(
      state,
      fromSurvivor.owner,
      toSurvivor.owner,
      fromSurvivorId,
      toSurvivorId,
      cardId
    );
  },

  voteExile(
    state: G,
    ctx: Ctx,
    initiatorPlayerId: PlayerId,
    targetPlayerId: PlayerId
  ): BasicReturnState {
    if (initiatorPlayerId !== ctx.currentPlayer || initiatorPlayerId === targetPlayerId)
      return INVALID_MOVE;

    const targetPlayer = state.public.players[targetPlayerId];
    if (!targetPlayer || targetPlayer.status == 'exiled')
      return INVALID_MOVE;
    return INVALID_MOVE;
  },

  triggerActiveEffect(
    state: G,
    ctx: Ctx,
    effectId: EffectId,
    dieIndex?: number
  ): BasicReturnState {
    if (dieIndex !== undefined) {
      const die = spendDieByIndex(state, ctx.currentPlayer, dieIndex);
      if (die === null)
        return INVALID_MOVE;
    }
  },
};

function spendDieByIndex(state: G, activePlayerId: string, dieIndex: number) {
  DicePrimitives.spendActionDie(state.public, activePlayerId, dieIndex);
}
