import React, { useState } from 'react';
import './playerAction.css';

export interface ActionItem {
  id: string;
  name: string;
  icon: string;
  cost: number;
  description: string;
}

export const PLAYER_ACTIONS: ActionItem[] = [
  { id: 'playerMoveSurvivor', name: 'Di chuyển', icon: '👢', cost: 1, description: 'Di chuyển 1 người sống sót sang vị trí mới' },
  { id: 'playerAttackZombie', name: 'Đánh Zombie', icon: '🗡️', cost: 1, description: 'Tấn công tiêu diệt 1 zombie tại cùng vị trí' },
  { id: 'playerSearch', name: 'Tìm kiếm', icon: '🔍', cost: 1, description: 'Rút bài tìm kiếm tại các địa điểm ngoài Colony' },
  { id: 'playerBarricade', name: 'Dựng rào', icon: '🔨', cost: 1, description: 'Xây dựng 1 rào chắn tại cổng hoặc địa điểm' },
  { id: 'playerCleanWaste', name: 'Dọn rác', icon: '🗑️', cost: 1, description: 'Dọn 3 thẻ bài rác khỏi khu phế liệu Colony' },
  { id: 'playerAttractZombies', name: 'Thu hút', icon: '📢', cost: 1, description: 'Dụ 2 zombie từ các nơi khác về vị trí của mình' },
  { id: 'playerAttackSurvivor', name: 'Tấn công người', icon: '🥊', cost: 1, description: 'Cướp bài và tấn công nhân vật người chơi khác' },
  { id: 'playerHandOff', name: 'Chuyển đồ', icon: '🤝', cost: 0, description: 'Đưa 1 trang bị cho nhân vật khác cùng địa điểm' },
  { id: 'playerContributeToCrisis', name: 'Góp Crisis', icon: '📦', cost: 0, description: 'Đóng góp 1 lá bài vào cọc giải quyết Khủng hoảng' },
  { id: 'playerRequestCard', name: 'Yêu cầu bài', icon: '✋', cost: 0, description: 'Hỏi xin thẻ bài từ người chơi khác' },
];

interface PlayerActionPanelProps {
  selectedActionId: string | null;
  onSelectAction: (actionId: string | null) => void;
}

export const PlayerActionPanel: React.FC<PlayerActionPanelProps> = ({
  selectedActionId,
  onSelectAction,
}) => {
  const [isOpen, setIsOpen] = useState(true);

  // Xử lý khi click vào nút vuông lớn ở mép phải
  const handleMainButtonClick = () => {
    if (selectedActionId) {
      // Đang có hành động được chọn -> Chữ X lớn bấm vào để HỦY chọn (Cancel)
      onSelectAction(null);
    } else {
      // Đang ở trạng thái thường -> Đóng / Mở khay hành động
      setIsOpen((prev) => !prev);
    }
  };

  // Chọn một hành động
  const handleActionClick = (actionId: string) => {
    if (selectedActionId === actionId) {
      onSelectAction(null); // Bỏ chọn nếu click lại chính nó
    } else {
      onSelectAction(actionId);
    }
  };

  return (
    <div className="action-dock-container" data-component="player-action-panel">
      <div className="action-box-panel">
        {/* Lưới các ô vuông hành động (2 hàng) */}
        {isOpen && (
          <div className="action-slots-grid" data-slots-container>
            {PLAYER_ACTIONS.map((act) => {
              const isSelected = selectedActionId === act.id;
              return (
                <div
                  key={act.id}
                  data-action-id={act.id}
                  data-selected={isSelected}
                  className={`action-slot-item ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => handleActionClick(act.id)}
                  title={`${act.name}: ${act.description} (Tốn ${act.cost} xúc xắc)`}
                >
                  <span className="action-slot-icon">{act.icon}</span>
                  {act.cost > 0 && <span className="action-slot-badge">{act.cost}</span>}
                </div>
              );
            })}
          </div>
        )}

        {/* Nút cơ bản hình vuông lớn ở mép phải (Toggle / Big Red X Cancel) */}
        <button
          className={`action-main-button ${selectedActionId ? 'is-cancel-state' : 'is-toggle-state'
            }`}
          onClick={handleMainButtonClick}
          data-button="main-action-toggle"
          data-action-state={selectedActionId ? 'cancel' : 'toggle'}
          title={
            selectedActionId
              ? 'Hủy hành động đang chọn'
              : isOpen
                ? 'Thu gọn bảng hành động'
                : 'Mở bảng hành động'
          }
        >
          {selectedActionId ? (
            // Khi đang chọn hành động -> Chữ X LỚN màu trắng
            <span className="action-big-x" data-icon="cancel-x">✕</span>
          ) : (
            // Trạng thái cơ bản -> Ký hiệu đóng/mở
            <>
              <span className="action-toggle-icon">{isOpen ? '▶' : '◀'}</span>
              <span className="action-toggle-label">{isOpen ? 'ĐÓNG' : 'MỞ'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

