import React from 'react';
import type { DropZone, HandCard } from '../../types/card';

interface SandboxBoardProps {
  draggingCard: HandCard | null;
  dropZones: DropZone[];
  actionLogs: string[];
  onAddCard: (category?: 'item' | 'crisis' | 'survivor') => void;
  onRemoveCard: () => void;
  onToggleEligibility: () => void;
  onResetSample: () => void;
}

export const SandboxBoard: React.FC<SandboxBoardProps> = ({
  draggingCard,
  dropZones,
  actionLogs,
  onAddCard,
  onRemoveCard,
  onToggleEligibility,
  onResetSample,
}) => {
  return (
    <div style={{ padding: '20px 24px 200px 24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header & Thanh điều khiển Sandbox */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '16px 24px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)',
          marginBottom: '24px',
        }}
      >
        <div>
          <h1
            style={{
              margin: '0 0 6px 0',
              fontSize: '22px',
              fontWeight: 800,
              background: 'linear-gradient(90deg, #38bdf8, #818cf8)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Dead of Winter • Card Hand Sandbox
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
            Kiểm thử độc lập giao diện cầm bài • Kéo thả, xếp quạt, phóng to & chống spam click
          </p>
        </div>

        {/* Cụm nút thao tác thử nghiệm */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => onAddCard('item')}
            style={btnStyle}
            title="Thêm 1 lá trang bị / vật phẩm"
          >
            + Rút Item
          </button>
          <button
            onClick={() => onAddCard('survivor')}
            style={btnStyle}
            title="Thêm 1 thẻ người sống sót"
          >
            + Rút Survivor
          </button>
          <button
            onClick={() => onAddCard('crisis')}
            style={btnStyle}
            title="Thêm 1 lá bài khủng hoảng"
          >
            + Rút Crisis
          </button>
          <button
            onClick={onRemoveCard}
            style={{ ...btnStyle, background: '#475569' }}
            title="Bớt 1 lá trên tay"
          >
            - Bớt bài
          </button>
          <button
            onClick={onToggleEligibility}
            style={{ ...btnStyle, background: '#d97706' }}
            title="Bật/tắt trạng thái đủ điều kiện để kiểm tra thẻ xám mờ"
          >
            Đổi Khả dụng (Dim)
          </button>
          <button
            onClick={onResetSample}
            style={{ ...btnStyle, background: '#0284c7' }}
            title="Khôi phục lại bộ bài mẫu ban đầu"
          >
            Reset Mẫu
          </button>
        </div>
      </header>

      {/* Bản đồ giả lập các khu vực nhận bài (Drop Zones) */}
      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '15px', color: '#cbd5e1', marginBottom: '12px' }}>
          Vùng nhận bài trên bản đồ (Kéo bài từ tay thả vào đây để kích hoạt):
        </h2>
        <div className="drop-zones-grid">
          {dropZones.map((zone) => {
            const isEligible = draggingCard
              ? zone.acceptedCategories.includes(draggingCard.category)
              : false;

            return (
              <div
                key={zone.id}
                data-drop-zone-id={zone.id}
                className={`drop-zone-card ${
                  draggingCard ? (isEligible ? 'is-candidate-eligible' : 'is-candidate-ineligible') : ''
                }`}
              >
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>
                  {zone.id === 'colony' && '🏰'}
                  {zone.id === 'location_police' && '🚨'}
                  {zone.id === 'location_store' && '🥫'}
                  {zone.id === 'crisis' && '❄️'}
                  {zone.id === 'waste' && '🗑️'}
                </div>
                <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '4px' }}>
                  {zone.name}
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>{zone.description}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Nhật ký hành động tương tác (Action Log) */}
      <section
        style={{
          background: 'rgba(15, 23, 42, 0.65)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '16px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '13px', color: '#94a3b8', textTransform: 'uppercase' }}>
            Nhật ký tương tác (Action Log)
          </h3>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Chống click liên tục hoạt động</span>
        </div>
        <div
          style={{
            marginTop: '8px',
            maxHeight: '120px',
            overflowY: 'auto',
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#38bdf8',
            display: 'flex',
            flexDirection: 'column-reverse',
            gap: '4px',
          }}
        >
          {actionLogs.length === 0 ? (
            <div style={{ color: '#64748b' }}>Chưa có thao tác nào. Hãy click hoặc kéo thả lá bài!</div>
          ) : (
            actionLogs.map((log, index) => <div key={index}>▸ {log}</div>)
          )}
        </div>
      </section>
    </div>
  );
};

const btnStyle: React.CSSProperties = {
  background: '#2563eb',
  color: '#ffffff',
  border: 'none',
  borderRadius: '8px',
  padding: '8px 14px',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'transform 0.1s ease, background 0.15s ease',
};

