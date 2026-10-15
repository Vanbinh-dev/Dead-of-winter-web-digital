import React from 'react';
import './locations.css';

export interface LocationSurvivor {
  id: string;
  name: string;
  playerName?: string;
}

interface LocationGroceryStoreProps {
  survivors: LocationSurvivor[];
  zombies: number;
  barricades: number;
  noise: number;
  onSlotClick?: (type: 'survivor' | 'entrance' | 'noise', index?: number) => void;
}

// 3 ô Người sống sót
const SURVIVOR_SLOTS = [
  { left: '31.5%', top: '39.0%' },
  { left: '50.0%', top: '39.0%' },
  { left: '68.5%', top: '39.0%' },
];

// 4 ô Zombie / Rào chắn ở cổng địa điểm
const ENTRANCE_SLOTS = [
  { left: '21.8%', top: '54.0%' },
  { left: '40.8%', top: '54.0%' },
  { left: '59.5%', top: '54.0%' },
  { left: '78.5%', top: '54.0%' },
];

// 4 ô Tiếng ồn (Noise)
const NOISE_SLOTS = [
  { left: '85.0%', top: '66.0%' },
  { left: '85.0%', top: '74.0%' },
  { left: '85.0%', top: '82.0%' },
  { left: '85.0%', top: '90.0%' },
];

export const LocationGroceryStore: React.FC<LocationGroceryStoreProps> = ({
  survivors,
  zombies,
  barricades,
  noise,
  onSlotClick,
}) => {
  return (
    <div
      className="location-board-wrapper grocery-board"
      data-location="groceryStore"
      data-component="location-grocery-store"
    >
      {/* Hình nền bảng Grocery Store */}
      <img
        src="/image/location/location-grocery-store.png"
        alt="Grocery Store Board"
        className="location-bg-image"
      />

      {/* 1. Render 3 Ô Người sống sót */}
      {SURVIVOR_SLOTS.map((coord, idx) => {
        const survivor = survivors[idx];

        return (
          <div
            key={`grocery-survivor-slot-${idx}`}
            className="location-slot"
            style={{
              left: coord.left,
              top: coord.top,
              width: 'var(--token-grocery-survivor-size)',
              height: 'var(--token-grocery-survivor-size)',
            }}
            data-slot-type="survivor"
            data-slot-index={idx}
            onClick={() => onSlotClick?.('survivor', idx)}
            title={survivor ? `Survivor: ${survivor.name}` : 'Ô nhân vật trống'}
          >
            {survivor && (
              <div className="board-survivor-token">
                <span className="board-survivor-token-name">{survivor.name}</span>
                <span className="board-survivor-token-badge">P1</span>
              </div>
            )}
          </div>
        );
      })}

      {/* 2. Render 4 Ô Zombie & Barricade */}
      {ENTRANCE_SLOTS.map((coord, idx) => {
        const hasBarricade = idx < barricades;
        const hasZombie = !hasBarricade && idx < barricades + zombies;

        return (
          <div
            key={`grocery-entrance-slot-${idx}`}
            className="location-slot"
            style={{
              left: coord.left,
              top: coord.top,
              width: 'var(--token-grocery-zombie-size)',
              height: 'var(--token-grocery-zombie-size)',
            }}
            data-slot-type="entrance"
            data-slot-index={idx}
            onClick={() => onSlotClick?.('entrance', idx)}
            title={`Cổng Grocery • Barricade: ${barricades}, Zombie: ${zombies}`}
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
      })}

      {/* 3. Render 4 Ô Tiếng ồn (Noise) */}
      {NOISE_SLOTS.map((coord, idx) => {
        const hasNoise = idx < noise;

        return (
          <div
            key={`grocery-noise-slot-${idx}`}
            className="location-slot"
            style={{
              left: coord.left,
              top: coord.top,
              width: 'var(--token-grocery-noise-size)',
              height: 'var(--token-grocery-noise-size)',
            }}
            data-slot-type="noise"
            data-slot-index={idx}
            onClick={() => onSlotClick?.('noise', idx)}
            title={hasNoise ? 'Token Tiếng Ồn' : 'Ô tiếng ồn trống'}
          >
            {hasNoise && <div className="board-token-noise">🔊</div>}
          </div>
        );
      })}
    </div>
  );
};

