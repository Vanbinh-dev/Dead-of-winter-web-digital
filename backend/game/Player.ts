import type { PlayerId, SurvivorId, CardId } from "./gameLogic/Type.js";

export interface PlayerState {
  id: PlayerId;
  status: "active" | "exiled" | "eliminated";
  survivorIds: SurvivorId[];
  leaderId: SurvivorId;
  hand: CardId[];
  secretObjectiveId: CardId | null;       
  exileObjectiveId: CardId | null;
  dice: { unused: number[]; used: number[] };
  hasInitiatedExileVote: boolean;         
  vote: "yes" | "no" | null;
  heldCrossroadId: CardId | null;         
}