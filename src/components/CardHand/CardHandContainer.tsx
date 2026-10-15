import React, { useState, useMemo, useRef } from 'react';
import type { HandCard, DropTargetId } from '../../types/card';
import { CardItem } from './CardItem';
import './cardHand.css';

interface CardHandContainerProps {
  cards: HandCard[];
  onCardAction: (card: HandCard, action: 'play' | 'equip' | 'discard') => void;
  onCardDrop: (card: HandCard, targetId: DropTargetId) => void;
  onDragStart?: (card: HandCard) => void;
  onDragEnd?: () => void;
}

export const CardHandContainer: React.FC<CardHandContainerProps> = ({
  cards,
  onCardAction,
  onCardDrop,
  onDragStart,
  onDragEnd,
}) => {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  // Khóa chống click liên tục trên container toggle
  const toggleCooldownRef = useRef(false);

  // Tính toán negative margin động dựa theo số lượng bài (Dynamic Margin Clamping)
  const cardMargin = useMemo(() => {
    const n = cards.length;
    if (n <= 3) return -10;
    if (n <= 5) return -30;
    if (n <= 7) return -50;
    return -65; // Chồng lấn nhiều hơn khi có 8+ lá bài
  }, [cards.length]);

  // Xử lý chọn lá bài (có chống click lặp)
  const handleSelect = (card: HandCard) => {
    setSelectedCardId((prev) => (prev === card.id ? null : card.id));
  };

  // Toggle ẩn/hiện bộ bài có cooldown
  const handleToggleCollapse = () => {
    if (toggleCooldownRef.current) return;
    toggleCooldownRef.current = true;
    setIsCollapsed((prev) => !prev);
    setSelectedCardId(null); // Đóng menu nếu đang mở
    setTimeout(() => {
      toggleCooldownRef.current = false;
    }, 250);
  };

  return (
    <div className={`hand-root-container ${isCollapsed ? 'is-collapsed' : ''}`}>
      {/* Thanh Toggle Thu gọn / Mở rộng */}
      <button
        className="hand-toggle-bar"
        onClick={handleToggleCollapse}
        title={isCollapsed ? 'Mở rộng bộ bài' : 'Thu gọn bộ bài'}
      >
        <span>{isCollapsed ? '▲' : '▼'}</span>
        <span>Bài trên tay ({cards.length})</span>
      </button>

      {/* Khay bài xếp lớp (Card Fan Tray) */}
      <div className="hand-fan-tray">
        {cards.map((card, idx) => {
          // Tính toán dạt sang 2 bên khi có 1 lá đang hover/focus
          let lateralShift = 0;
          if (hoveredIndex !== null && hoveredIndex !== idx) {
            const distance = idx - hoveredIndex;
            // Lá bên trái dạt sang trái, bên phải dạt sang phải
            lateralShift = distance < 0 ? -28 : 28;
          }

          return (
            <div
              key={card.id}
              style={{
                marginLeft: idx > 0 ? `${cardMargin}px` : undefined,
              }}
            >
              <CardItem
                card={card}
                index={idx}
                totalCards={cards.length}
                isSelected={selectedCardId === card.id}
                isHovered={hoveredIndex === idx}
                lateralShift={lateralShift}
                onSelect={handleSelect}
                onHoverStart={(i) => setHoveredIndex(i)}
                onHoverEnd={() => setHoveredIndex(null)}
                onActionTrigger={(c, action) => {
                  setSelectedCardId(null);
                  onCardAction(c, action);
                }}
                onCardDrop={(c, target) => {
                  setSelectedCardId(null);
                  onCardDrop(c, target);
                }}
                onDragStart={(c) => {
                  setSelectedCardId(null);
                  onDragStart?.(c);
                }}
                onDragEnd={() => {
                  onDragEnd?.();
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

