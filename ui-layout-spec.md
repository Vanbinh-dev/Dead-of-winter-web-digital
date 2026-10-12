# Dead of Winter - Đề xuất Giao diện Người dùng (UI/UX)

Tài liệu này mô tả cấu trúc và luồng tương tác cho giao diện Web của game Dead of Winter, nhằm mục đích tối ưu hóa trải nghiệm người dùng, đơn giản hóa các thao tác và loại bỏ các form nhập liệu (input) thủ công bằng các menu thả xuống (dropdown/select) linh hoạt.

## 1. Cấu trúc Layout Tổng thể

Giao diện sẽ được chia thành **3 Panel chính** theo chiều dọc, cộng thêm 1 thanh **Action Log** ở dưới:

*   **Left Panel (Thông tin chung & Player):** Nằm ở cột trái, cung cấp thông số ván chơi, thông tin người chơi hiện tại, tay bài và chỉ số chi tiết của các Survivor.
*   **Middle Panel (Bản đồ / Địa điểm):** Vùng trung tâm, tập trung hiển thị trực quan thông tin của **một** địa điểm duy nhất tại một thời điểm, giúp giao diện không bị rối mắt.
*   **Right Panel (Khu vực Hành động):** Nằm ở góc phải, là nơi người chơi đưa ra mọi quyết định. Nó sẽ hiển thị linh hoạt (dynamic) các tuỳ chọn tuỳ thuộc vào Survivor được chọn.
*   **Bottom Panel (Action Log / Terminal):** Nằm ở viền dưới màn hình, hiển thị kết quả thao tác, xúc xắc đổ ra, hoặc các thông báo lỗi.

---

## 2. Chi tiết từng Panel

### 2.1. Player Info Panel (Cột Trái)
*   **Thông tin ván đấu & Player:**
    *   Mã Player (Player ID) và người đang giữ lượt chơi (Current Player).
    *   Giai đoạn hiện tại (Phase: `PlayerTurns` hoặc `ColonyPhase`), Vòng chơi (Round).
    *   Tài nguyên chung: Morale, Food, Waste, Starvation.
    *   Xúc xắc hành động (Action Dice): Liệt kê Xúc xắc chưa dùng (Unused) và Đã dùng (Used).
*   **Tay Bài (Hand):**
    *   Danh sách các lá bài đang giữ (chỉ hiện tên do chưa có UI thẻ bài).
*   **Quản lý Survivor:**
    *   Danh sách các Survivor thuộc quyền điều khiển của Player này.
    *   Hiển thị **đầy đủ** mọi chỉ số (lấy từ dữ liệu `SurvivorDef`): `Name`, `Influence`, `Attack Requirement`, `Search Requirement`, số vết thương (`Wounds`), đồ đang trang bị, và mô tả chức năng (`Ability`).

### 2.2. Location View (Middle Panel)
*   **Bộ chọn Địa điểm (Location Selector):** Một thanh `<select>` hoặc dãy Tab trên cùng để chuyển đổi xem các địa điểm (Colony, Police Station, School, v.v.).
*   **Hiển thị Thông tin (Chỉ của địa điểm đang chọn):**
    *   **Tên Địa điểm & Sức chứa Survivor:** Ví dụ: *Police Station (1/4 Survivors)*.
    *   **Zombie & Lối vào (Entrances):**
        *   Tổng số Zombie hiện tại / Sức chứa Zombie tối đa.
        *   Số lượng rào chắn (Barricades) hiện có.
    *   **Survivors đang có mặt:** Danh sách những ai đang đứng tại đây.
    *   **Deck / Tiếng ồn:**
        *   Mức độ ồn ào (Noise tokens).
        *   Số thẻ vật phẩm còn lại trong Search Deck của địa điểm này.

### 2.3. Action Panel (Cột Phải)
*Mọi hành động đều xoay quanh Survivor. Các ô nhập liệu text (input) hoàn toàn được thay thế bằng menu thả xuống.*

1.  **Chọn Survivor (Select):** Người chơi bắt đầu bằng việc mở dropdown chọn 1 Survivor mà họ quản lý.
2.  **Thông tin ngữ cảnh (Context):** UI ngay lập tức hiển thị Survivor đó đang đứng ở đâu để người chơi dễ hình dung.
3.  **Các lựa chọn Hành động (Dropdown-driven):** Các nút hành động hiện ra với cơ chế chọn bằng select:
    *   **Di chuyển (Move):** Chọn `[Địa điểm đến]` từ Dropdown -> Nhấn Di chuyển.
    *   **Tấn công (Attack):** Chọn `[Mục tiêu]` (Zombie hoặc tên Survivor) -> Chọn `[Xúc xắc sẽ sử dụng]` -> Nhấn Tấn công.
    *   **Tìm kiếm (Search):** Chọn `[Xúc xắc sẽ sử dụng]` -> Nhấn Tìm kiếm (Nút này sẽ bị vô hiệu hoá - disabled nếu đang ở Colony).
    *   **Xây rào (Barricade):** Chọn `[Xúc xắc sẽ sử dụng]` -> Nhấn Xây rào.
    *   **Chơi bài (Play Card) / Clean Waste:** Thao tác qua dropdown các lá bài / các xúc xắc có sẵn.

### 2.4. Action Log (Bottom Panel)
*   **Lịch sử & Thông báo (Logs):** Bảng cuộn chứa danh sách các hành động vừa diễn ra trong game.
*   **Lỗi (Errors):** Nếu Server/Client báo lỗi (vd: Hết xí ngầu, Invalid Move), bảng log sẽ hiện cảnh báo chữ đỏ nổi bật.
*   **Kết quả Xúc xắc (Dice Results):** Hiển thị rõ ràng các sự kiện ngẫu nhiên từ hệ thống (Ví dụ: Đổ xúc xắc lây nhiễm ra "Frostbite").

---

## 3. Lý do áp dụng thiết kế này
1.  **Dễ sử dụng & Không gây lỗi đánh máy:** Thay thế text input bằng Dropdown đảm bảo người chơi không bao giờ truyền sai ID (ví dụ: gõ nhầm `sparky` thành `Sparky`).
2.  **Logic Ràng Buộc (Fail-safe):** Giao diện sẽ chủ động giấu/khoá (disable) các hành động không hợp lý. Ví dụ: Khi Survivor đứng ở Colony, thanh chọn vị trí sẽ không có tuỳ chọn Search, từ đó "dắt tay" người dùng tuân thủ đúng luật.
3.  **Không gian ngăn nắp:** Dữ liệu Dead of Winter quá lớn. Bằng cách dùng Panel ở giữa (chỉ hiện 1 vị trí lúc chọn), màn hình sẽ không bị quá tải bởi hàng tá thông số hiển thị cùng lúc.

