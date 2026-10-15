import React, { useState } from 'react';
import type { HandCard, DropTargetId } from './types/card';
import { CardHandContainer } from './components/CardHand/CardHandContainer';
import { PlayerActionPanel } from './components/PlayerAction/PlayerActionPanel';
import { ColonyBoard, type ColonyEntranceState, type ColonyOccupant } from './components/Locations/ColonyBoard';
import { LocationGroceryStore, type LocationSurvivor } from './components/Locations/LocationGroceryStore';
import './components/Locations/locations.css';

// Bộ bài mẫu trên tay
const SAMPLE_HAND_CARDS: HandCard[] = [
  {
    id: 'card_item_1',
    name: 'Súng Lục (Pistol)',
    category: 'item',
    imageUrl: '/image/item.png',
    symbol: 'weapon',
    cost: 1,
    description: 'Trang bị: Tiêu 1 xúc xắc để tiêu diệt 1 zombie mà không cần đổ xúc xắc mạo hiểm.',
    isEquippable: true,
    isEligible: true,
  },
  {
    id: 'card_item_2',
    name: 'Đồ Hộp (Food Canned)',
    category: 'item',
    imageUrl: '/image/item.png',
    symbol: 'food',
    description: 'Bỏ bài: Thêm 1 thức ăn vào kho Colony hoặc đổi xúc xắc.',
    isEquippable: false,
    isEligible: true,
  },
  {
    id: 'card_survivor_1',
    name: 'Người Sống Sót (Mike Cho)',
    category: 'survivor',
    imageUrl: '/image/survivor.png',
    description: 'Nhân vật ninja: Miễn đổ xúc xắc mạo hiểm khi tấn công.',
    isEquippable: false,
    isEligible: true,
  },
  {
    id: 'card_item_3',
    name: 'Bình Xăng (Fuel)',
    category: 'item',
    imageUrl: '/image/item.png',
    symbol: 'fuel',
    description: 'Chơi khi di chuyển: Không phải đổ xúc xắc mạo hiểm.',
    isEquippable: false,
    isEligible: true,
  },
  {
    id: 'card_crisis_1',
    name: 'Khủng Hoảng: Bão Tuyết',
    category: 'crisis',
    imageUrl: '/image/crisis.png',
    description: 'Yêu cầu quyên góp nhiên liệu trước khi hết vòng chơi.',
    isEquippable: false,
    isEligible: true,
  },
];

export const App: React.FC = () => {
  const [cards, setCards] = useState<HandCard[]>(SAMPLE_HAND_CARDS);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);

  // Trạng thái mẫu các cổng Colony (6 cổng)
  const [colonyEntrances, setColonyEntrances] = useState<ColonyEntranceState[]>([
    { zombie: 2, barricade: 1, maxZombieCapacity: 3 }, // Cổng 1: 1 rào, 2 zombie (đầy)
    { zombie: 1, barricade: 0, maxZombieCapacity: 3 }, // Cổng 2: 1 zombie
    { zombie: 0, barricade: 1, maxZombieCapacity: 3 }, // Cổng 3: 1 rào
    { zombie: 0, barricade: 0, maxZombieCapacity: 3 }, // Cổng 4
    { zombie: 1, barricade: 0, maxZombieCapacity: 3 }, // Cổng 5
    { zombie: 0, barricade: 0, maxZombieCapacity: 3 }, // Cổng 6
  ]);

  // Trạng thái mẫu 24 ô người sống sót / helpless ở Colony
  const [colonyOccupants, setColonyOccupants] = useState<ColonyOccupant[]>([
    { id: 's1', type: 'survivor', name: 'Mike Cho' },
    { id: 's2', type: 'survivor', name: 'Sparky' },
    { id: 'h1', type: 'helpless' },
    { id: 'h2', type: 'helpless' },
  ]);

  const [colonyFood, setColonyFood] = useState<number>(3);
  const [colonyStarvation, setColonyStarvation] = useState<number>(0);

  // Trạng thái mẫu Grocery Store
  const [grocerySurvivors, setGrocerySurvivors] = useState<LocationSurvivor[]>([
    { id: 'g_s1', name: 'Ashley Ross' },
  ]);
  const [groceryZombies, setGroceryZombies] = useState<number>(2);
  const [groceryBarricades, setGroceryBarricades] = useState<number>(1);
  const [groceryNoise, setGroceryNoise] = useState<number>(2);

  // Tương tác bấm vào ô trên Colony để thử nghiệm animation đặt/thay đổi token
  const handleColonySlotClick = (type: 'entrance' | 'occupant' | 'food', index?: number) => {
    if (type === 'entrance' && index !== undefined) {
      setColonyEntrances((prev) => {
        const next = [...prev];
        const ent = next[index - 1];
        if (!ent) return prev;
        // Xoay vòng trạng thái: trống -> 1 zombie -> 1 rào -> đầy
        if (ent.barricade === 0 && ent.zombie === 0) {
          next[index - 1] = { ...ent, zombie: 1 };
        } else if (ent.barricade === 0 && ent.zombie > 0) {
          next[index - 1] = { ...ent, barricade: 1, zombie: 0 };
        } else if (ent.barricade > 0 && ent.zombie === 0) {
          next[index - 1] = { ...ent, barricade: 1, zombie: 2 };
        } else {
          next[index - 1] = { ...ent, barricade: 0, zombie: 0 };
        }
        return next;
      });
    } else if (type === 'occupant' && index !== undefined) {
      setColonyOccupants((prev) => {
        const next = [...prev];
        const cur = next[index];
        if (!cur) {
          next[index] = { id: `s_${Date.now()}`, type: 'survivor', name: 'Survivor' };
        } else if (cur.type === 'survivor') {
          next[index] = { id: `h_${Date.now()}`, type: 'helpless' };
        } else {
          delete next[index];
        }
        return next;
      });
    } else if (type === 'food') {
      setColonyFood((prev) => (prev >= 6 ? 0 : prev + 1));
    }
  };

  // Tương tác bấm vào Grocery Store
  const handleGrocerySlotClick = (type: 'survivor' | 'entrance' | 'noise', index?: number) => {
    if (type === 'entrance') {
      setGroceryZombies((prev) => (prev >= 4 ? 0 : prev + 1));
    } else if (type === 'noise') {
      setGroceryNoise((prev) => (prev >= 4 ? 0 : prev + 1));
    } else if (type === 'survivor') {
      setGrocerySurvivors((prev) =>
        prev.length >= 3 ? [] : [...prev, { id: `g_${Date.now()}`, name: 'Officer Grey' }]
      );
    }
  };

  const handleCardAction = (card: HandCard, action: 'play' | 'equip' | 'discard') => {
    if (action === 'discard') {
      setCards((prev) => prev.filter((c) => c.id !== card.id));
    }
  };

  const handleCardDrop = (_card: HandCard, _targetId: DropTargetId) => {
    // Xử lý kéo thả
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--color-bg, #ffffff)',
        fontFamily: 'var(--font-main, system-ui, sans-serif)',
        position: 'relative',
        overflow: 'hidden',
      }}
      data-screen="game-tabletop"
    >
      {/* 1. Khu vực hiển thị Bản đồ Location & Tokens chính */}
      <main className="locations-stage-container">
        {/* Bảng Colony chính */}
        <ColonyBoard
          entrances={colonyEntrances}
          occupants={colonyOccupants}
          food={colonyFood}
          starvation={colonyStarvation}
          onSlotClick={handleColonySlotClick}
        />

        {/* Bảng Grocery Store (Địa điểm bên ngoài) */}
        <LocationGroceryStore
          survivors={grocerySurvivors}
          zombies={groceryZombies}
          barricades={groceryBarricades}
          noise={groceryNoise}
          onSlotClick={handleGrocerySlotClick}
        />
      </main>

      {/* 2. Bảng hành động của Player (Góc dưới bên phải - phong cách Root Digital) */}
      <PlayerActionPanel
        selectedActionId={selectedActionId}
        onSelectAction={setSelectedActionId}
      />

      {/* 3. Cụm cầm bài trên tay (Bottom-Center) */}
      <CardHandContainer
        cards={cards}
        onCardAction={handleCardAction}
        onCardDrop={handleCardDrop}
      />
    </div>
  );
};
