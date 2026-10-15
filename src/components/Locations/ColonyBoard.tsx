import React from 'react';
import './locations.css';

export interface ColonyEntranceState {
  zombie: number;
  barricade: number;
  maxZombieCapacity: number;
}

export interface ColonyOccupant {
  id: string;
  type: 'survivor' | 'helpless';
  name?: string;
}

interface ColonyBoardProps {
  entrances: ColonyEntranceState[];
  occupants: ColonyOccupant[];
  food: number;
  starvation: number;
  onSlotClick?: (type: 'entrance' | 'occupant' | 'food', index?: number) => void;
}

// Tọa độ 3 slot Biohazard cho từng cổng từ 1 đến 6 (theo % của chiều rộng và chiều cao)
const ENTRANCE_SLOT_COORDS = [
  // Cổng 1 (Trên - Phải)
  [
    { left: '72.8%', top: '15.5%' },
    { left: '76.8%', top: '11.8%' },
    { left: '76.8%', top: '20.0%' },
  ],
  // Cổng 2 (Trên - Trái)
  [
    { left: '59.5%', top: '16.5%' },
    { left: '64.0%', top: '11.8%' },
    { left: '63.8%', top: '20.0%' },
  ],
  // Cổng 3 (Giữa trên - Trái)
  [
    { left: '47.5%', top: '34.8%' },
    { left: '52.2%', top: '34.8%' },
    { left: '50.5%', top: '42.5%' },
  ],
  // Cổng 4 (Giữa dưới - Trái)
  [
    { left: '47.5%', top: '57.8%' },
    { left: '52.2%', top: '57.8%' },
    { left: '50.5%', top: '65.5%' },
  ],
  // Cổng 5 (Dưới - Trái)
  [
    { left: '59.5%', top: '81.5%' },
    { left: '64.0%', top: '77.0%' },
    { left: '63.8%', top: '85.5%' },
  ],
  // Cổng 6 (Dưới - Phải)
  [
    { left: '72.8%', top: '81.5%' },
    { left: '76.8%', top: '77.0%' },
    { left: '76.8%', top: '85.5%' },
  ],
];

// Lưới 24 ô Colony Occupants (3 cột x 8 hàng)
const OCCUPANT_SLOT_COORDS = (() => {
  const coords: { left: string; top: string }[] = [];
  const cols = ['84.3%', '89.9%', '95.5%'];
  const rows = ['14.8%', '23.8%', '32.8%', '41.8%', '50.8%', '59.8%', '68.8%', '77.8%'];

  for (const r of rows) {
    for (const c of cols) {
      coords.push({ left: c, top: r });
    }
  }
  return coords;
})();

export const ColonyBoard: React.FC<ColonyBoardProps> = ({
  entrances,
  occupants,
  food,
  starvation,
  onSlotClick,
}) => {
  return (
    <div
      className="location-board-wrapper colony-board"
      data-location="colony"
      data-component="colony-board"
    >
      {/* Hình nền bảng Colony chính gốc */}
      <img
        src="/image/location/colony-panel.png"
        alt="Colony Board"
        className="location-bg-image"
      />

      {/* 1. Render 6 Cổng Zombie & Barricade */}
      {entrances.map((entrance, entranceIdx) => {
        const slots = ENTRANCE_SLOT_COORDS[entranceIdx] || [];
        const { zombie, barricade } = entrance;

        return slots.map((coord, slotIdx) => {
          const hasBarricade = slotIdx < barricade;
          const hasZombie = !hasBarricade && slotIdx < barricade + zombie;

          return (
            <div
              key={`colony-ent-${entranceIdx}-slot-${slotIdx}`}
              className="location-slot"
              style={{
                left: coord.left,
                top: coord.top,
                width: 'var(--token-colony-zombie-size)',
                height: 'var(--token-colony-zombie-size)',
              }}
              data-slot-type="entrance"
              data-entrance-index={entranceIdx + 1}
              data-slot-index={slotIdx}
              onClick={() => onSlotClick?.('entrance', entranceIdx + 1)}
              title={`Cổng ${entranceIdx + 1} • Barricade: ${barricade}, Zombie: ${zombie}`}
            >
              {hasBarricade && (
                <img
                  src="/image/token/barricade.webp"
                  alt="Barricade"
                  className="board-token-img board-token-barricade"
                />
              )}
              {hasZombie && (
                <img
                  src="/image/token/zombie.webp"
                  alt="Zombie"
                  className="board-token-img"
                />
              )}
            </div>
          );
        });
      })}

      {/* 2. Render 24 Ô Người sống sót / Helpless (Occupants) */}
      {OCCUPANT_SLOT_COORDS.map((coord, idx) => {
        const occupant = occupants[idx];

        return (
          <div
            key={`colony-occupant-${idx}`}
            className="location-slot"
            style={{
              left: coord.left,
              top: coord.top,
              width: 'var(--token-colony-occupant-size)',
              height: 'var(--token-colony-occupant-size)',
            }}
            data-slot-type="occupant"
            data-slot-index={idx}
            onClick={() => onSlotClick?.('occupant', idx)}
            title={occupant ? (occupant.type === 'helpless' ? 'Helpless Survivor' : occupant.name || 'Survivor') : 'Ô trống'}
          >
            {occupant && occupant.type === 'helpless' && (
              <img
                src="/image/token/helpless.webp"
                alt="Helpless"
                className="board-token-img"
              />
            )}
            {occupant && occupant.type === 'survivor' && (
              <div className="board-survivor-token">
                <span className="board-survivor-token-name">{occupant.name || 'Survivor'}</span>
              </div>
            )}
          </div>
        );
      })}

      {/* 3. Render Food Supply Token */}
      <div
        className="location-slot"
        style={{
          left: '90.2%',
          top: '91.2%',
          width: 'var(--token-colony-food-size)',
          height: 'var(--token-colony-food-size)',
        }}
        data-slot-type="food-supply"
        onClick={() => onSlotClick?.('food')}
        title={`Food Supply: ${food} thức ăn, ${starvation} đói ăn`}
      >
        {starvation > 0 ? (
          <>
            <img src="/image/token/starvation.webp" alt="Starvation" className="board-token-img" />
            <span className="food-count-badge" style={{ background: '#7f1d1d', borderColor: '#ef4444' }}>
              -{starvation}
            </span>
          </>
        ) : food > 0 ? (
          <>
            <img src="/image/token/food.webp" alt="Food" className="board-token-img" />
            <span className="food-count-badge">{food}</span>
          </>
        ) : null}
      </div>
    </div>
  );
};

