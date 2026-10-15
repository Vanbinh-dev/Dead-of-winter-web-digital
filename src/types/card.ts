export type CardCategory = 'item' | 'crisis' | 'survivor' | 'mainObjective';

export type CardSymbol = 'food' | 'fuel' | 'medicine' | 'weapon' | 'tool' | 'book' | 'outside';

export interface HandCard {
  id: string;
  name: string;
  category: CardCategory;
  imageUrl: string;
  symbol?: CardSymbol;
  cost?: number;
  description: string;
  isEquippable?: boolean;
  isEligible: boolean; // Trạng thái khả dụng (Affordance & Eligibility)
}

export type DropTargetId = 'colony' | 'location_police' | 'location_store' | 'crisis' | 'waste';

export interface DropZone {
  id: DropTargetId;
  name: string;
  description: string;
  acceptedCategories: CardCategory[];
}

