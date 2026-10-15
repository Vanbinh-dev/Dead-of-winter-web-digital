import React, { useState, useRef, useCallback } from 'react';
import type { HandCard, DropTargetId } from '../../types/card';

interface CardItemProps {
  card: HandCard;
  index: number;
  totalCards: number;
  isSelected: boolean;
  isHovered: boolean;
  lateralShift: number; // Khoảng cách dạt sang bên do lá bài khác đang được hover
  onSelect: (card: HandCard) => void;
  onHoverStart: (index: number) => void;
  onHoverEnd: () => void;
  onActionTrigger: (card: HandCard, action: 'play' | 'equip' | 'discard') => void;
  onCardDrop: (card: HandCard, targetId: DropTargetId) => void;
  onDragStart?: (card: HandCard) => void;
  onDragMove?: (x: number, y: number) => void;
  onDragEnd?: () => void;
}

export const CardItem: React.FC<CardItemProps> = ({
  card,
  index,
  totalCards,
  isSelected,
  isHovered,
  lateralShift,
  onSelect,
  onHoverStart,
  onHoverEnd,
  onActionTrigger,
  onCardDrop,
  onDragStart,
  onDragMove,
  onDragEnd,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isSnappingBack, setIsSnappingBack] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Khóa chống click liên tục (Debounce / Cooldown Lock)
  const isLockedRef = useRef(false);
  const pointerStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasMovedBeyondThreshold = useRef(false);
  const cardElemRef = useRef<HTMLDivElement>(null);

  // Tính toán góc nghiêng tự nhiên (Fan Arc)
  const normalizedIndex = totalCards > 1 ? index - (totalCards - 1) / 2 : 0;
  // Mỗi bước lệch khoảng 2.5 đến 4 độ tùy số lượng bài
  const baseAngle = normalizedIndex * Math.min(3.5, 24 / Math.max(totalCards, 1));
  // Uốn cong đáy (Parabolic curve offset)
  const baseArcY = Math.abs(normalizedIndex) * 2.8;

  // Xử lý bắt đầu chạm / click chuột
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isLockedRef.current || isSnappingBack) return;
    if (!card.isEligible && !isSelected) return;

    pointerStartPos.current = { x: e.clientX, y: e.clientY };
    hasMovedBeyondThreshold.current = false;

    // Gắn capture để theo dõi drag toàn màn hình mượt mà
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  // Di chuyển con trỏ (phân biệt Click và Drag)
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerStartPos.current.x) return;

    const dx = e.clientX - pointerStartPos.current.x;
    const dy = e.clientY - pointerStartPos.current.y;

    // Ngưỡng 5px để xác định người dùng muốn kéo thả hay chỉ click
    if (!hasMovedBeyondThreshold.current && Math.hypot(dx, dy) > 5) {
      hasMovedBeyondThreshold.current = true;
      setIsDragging(true);
      onDragStart?.(card);
    }

    if (hasMovedBeyondThreshold.current) {
      setDragOffset({ x: dx, y: dy });
      onDragMove?.(e.clientX, e.clientY);
    }
  };

  // Thả chuột / kết thúc thao tác
  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerStartPos.current.x) return;

    // Bật khóa chống spam click tạm thời (200ms)
    isLockedRef.current = true;
    setTimeout(() => {
      isLockedRef.current = false;
    }, 200);

    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture was already lost
    }

    const wasDragging = hasMovedBeyondThreshold.current;
    pointerStartPos.current = { x: 0, y: 0 };
    hasMovedBeyondThreshold.current = false;

    if (wasDragging) {
      setIsDragging(false);
      onDragEnd?.();

      // Kiểm tra vùng Drop Target tại tọa độ thả
      // Tạm thời ẩn thẻ để lấy element bên dưới
      if (cardElemRef.current) {
        cardElemRef.current.style.visibility = 'hidden';
      }
      const elemBelow = document.elementFromPoint(e.clientX, e.clientY);
      if (cardElemRef.current) {
        cardElemRef.current.style.visibility = '';
      }

      const dropZoneElem = elemBelow?.closest('[data-drop-zone-id]');
      const targetId = dropZoneElem?.getAttribute('data-drop-zone-id') as DropTargetId | null;

      if (targetId) {
        // Thả thành công vào vùng hợp lệ
        onCardDrop(card, targetId);
        setDragOffset({ x: 0, y: 0 });
      } else {
        // Thả không hợp lệ -> Kích hoạt Snap-Back lướt mượt về chỗ cũ
        setIsSnappingBack(true);
        setDragOffset({ x: 0, y: 0 });
        setTimeout(() => {
          setIsSnappingBack(false);
        }, 320);
      }
    } else {
      // Thao tác click thông thường -> Chọn hoặc bỏ chọn bài
      onSelect(card);
    }
  };

  // Xác định transform cuối cùng
  let transformStyle = '';
  let zIndex = 100 + index;

  if (isDragging || isSnappingBack) {
    // Đang kéo hoặc đang snap-back
    transformStyle = `translate(${dragOffset.x}px, ${dragOffset.y}px) scale(1.15)`;
    zIndex = 2000;
  } else if (isSelected) {
    // Được chọn cố định
    transformStyle = `translateX(${lateralShift}px) translateY(-110px) scale(1.2) rotate(0deg)`;
    zIndex = 1600;
  } else if (isHovered) {
    // Đang hover nhấc lên đọc chi tiết
    transformStyle = `translateX(${lateralShift}px) translateY(-95px) scale(1.18) rotate(0deg)`;
    zIndex = 1500;
  } else {
    // Trạng thái nghỉ (Resting/Peeking Fan)
    transformStyle = `translateX(${lateralShift}px) translateY(${baseArcY}px) rotate(${baseAngle}deg)`;
  }

  return (
    <div
      ref={cardElemRef}
      className={`card-wrapper ${isDragging ? 'is-dragging' : ''} ${
        isSnappingBack ? 'is-snapping-back' : ''
      } ${isSelected ? 'is-selected' : ''} ${!card.isEligible ? 'is-ineligible' : ''}`}
      style={{
        transform: transformStyle,
        zIndex,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onMouseEnter={() => {
        if (!isDragging) onHoverStart(index);
      }}
      onMouseLeave={() => {
        if (!isDragging) onHoverEnd();
      }}
    >
      {/* Menu thao tác nhanh khi lá bài được Selected */}
      {isSelected && !isDragging && (
        <div className="card-action-menu" onClick={(e) => e.stopPropagation()}>
          <button
            className="card-action-btn"
            onClick={() => onActionTrigger(card, 'play')}
            title="Sử dụng lá bài"
          >
            Sử dụng
          </button>
          {card.isEquippable && (
            <button
              className="card-action-btn"
              onClick={() => onActionTrigger(card, 'equip')}
              title="Trang bị cho nhân vật"
            >
              Trang bị
            </button>
          )}
          <button
            className="card-action-btn"
            onClick={() => onActionTrigger(card, 'discard')}
            title="Bỏ vào thùng rác"
          >
            Bỏ rác
          </button>
          <button
            className="card-action-btn cancel-btn"
            onClick={() => onSelect(card)}
            title="Đóng menu"
          >
            ✕
          </button>
        </div>
      )}

      {/* Thẻ bài hiển thị */}
      <div className="card-visual">
        <div className="card-peek-badge">
          <span>{card.name}</span>
          {card.symbol && <span className="card-symbol-tag">{card.symbol}</span>}
        </div>
        <img
          src={card.imageUrl}
          alt={card.name}
          loading="lazy"
          draggable={false}
          onError={(e) => {
            // Fallback nếu ảnh tải chậm
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      </div>
    </div>
  );
};

