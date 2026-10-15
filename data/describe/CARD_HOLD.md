Bố cục & Trạng thái hiển thị của khu vực cầm bài (Hand Container Layout)
Vị trí neo (Anchor Position):
Neo cố định ở chính giữa mép dưới màn hình (Bottom-Center).
Nằm đè lên lớp hiển thị của bản đồ thế giới (Z-index cao hơn Game Board, nhưng thấp hơn Modal/Popup xác nhận).
Cơ chế xếp lớp (Card Fan / Stacking Behavior):
Xếp chồng ngang có độ trễ (Overlapping Horizontal Row): Các lá bài xếp so le, lá bài sau đè nhẹ lên góc hoặc cạnh của lá bài trước để tiết kiệm diện tích bề ngang.
Cố định đường đáy hoặc uốn cong nhẹ (Flat/Curved Baseline): Các mép bài có thể nằm trên cùng một đường chân phẳng hoặc hơi xoay góc nhẹ (fan out) để tạo cảm giác tự nhiên như cầm trên tay.
Trạng thái thu gọn (Resting/Peeking State): Ở trạng thái bình thường, các lá bài chỉ nhô lên khoảng 40% – 60% chiều cao (chỉ để lộ phần đỉnh hiển thị biểu tượng, chi phí hoặc tên lá bài), tránh che khuất tầm nhìn vào trung tâm bản đồ.
Co giãn linh hoạt theo số lượng (Dynamic Scaling / Margin Clamping):
Khi số lượng bài ít: Khoảng cách giữa các lá bài giãn ra để thấy rõ nội dung.
Khi số lượng bài nhiều: Độ chồng lấn (negative margin) tự động tăng lên, hoặc toàn bộ cụm bài thu nhỏ tỉ lệ (scale down) để không lấn sang bảng điều khiển bên trái và các nút chức năng bên phải.
2. Các hành động và tương tác người chơi mong muốn thực hiện (User Interaction & Mechanics)

Khu vực cầm bài cần hỗ trợ một tập hợp các hành vi trực quan, phản ánh chính xác thao tác vật lý trên bàn cờ:

A. Duyệt và Kiểm tra thông tin (Inspection & Preview)

Hover / Focus (Nhấc bài lên để đọc):
Khi rê chuột (hoặc chạm giữ trên màn hình cảm ứng) vào một lá bài bất kỳ, lá bài đó lập tức:
Nâng cao vị trí lên hẳn so với các lá xung quanh (nổi lên trên, Z-index tối đa trong bộ bài).
Phóng to nhẹ (Scale up) để người chơi đọc toàn bộ văn bản chi tiết, chỉ số và luật mà không cần bấm mở menu riêng.
Các lá bài lân cận tự động dạt sang hai bên nhẹ để tạo không gian cho lá bài đang được kiểm tra.
Toggle / Collapse (Ẩn/Hiện toàn bộ cụm bài):
Khả năng thu nhỏ hoàn toàn khu vực cầm bài xuống mép đáy để người chơi quan sát trọn vẹn khu vực phía dưới của bản đồ khi cần.
B. Chọn và Kích hoạt hành động (Card Selection & Play)

Kéo - Thả theo ngữ cảnh (Drag and Drop):
Kéo vào vùng đích (Drop Target): Người chơi có thể kéo lá bài thả vào các khu vực hợp lệ:
Kéo vào một ô/địa điểm trên bản đồ để di chuyển hoặc kích hoạt hiệu ứng tại đó.
Kéo vào bảng của đối thủ/đồng minh để viện trợ (Aid/Trade).
Kéo vào vùng trống giữa màn hình để kích hoạt hiệu ứng toàn cục (Craft/Play).
Phản hồi trực quan khi kéo (Visual Affordance): Khi một lá bài được nhấc lên, các vị trí/đối tượng có thể nhận lá bài đó phải sáng lên (highlight), các vùng không hợp lệ bị mờ đi.
Click-to-Select (Thao tác nhấp chuột trực tiếp):
Nhấp một lần để chọn (lá bài nhô lên cố định ở trạng thái Selected).
Một bảng tùy chọn hành động nhỏ xuất hiện gần lá bài (ví dụ: Craft, Spend, Discard, Cancel) hoặc bản đồ hiển thị các ô tương ứng có thể nhấp tiếp.
C. Lọc và Quản lý tài nguyên bài (Management & Filtering)

Sắp xếp tự do (Manual Reordering):
Kéo trượt một lá bài sang trái hoặc phải giữa các lá khác để đổi vị trí hiển thị theo thói quen của người chơi.
Trạng thái khả dụng (Affordance & Eligibility State):
Tùy vào giai đoạn lượt (Turn Phase) và tài nguyên hiện có:
Những lá bài đủ điều kiện sử dụng sẽ phát sáng nhẹ hoặc giữ màu sắc bình thường.
Những lá bài chưa đủ điều kiện sẽ bị tối màu (dim/grayscale), không thể tương tác kéo thả để tránh thao tác nhầm.
Hủy thao tác mượt mà (Snap-back / Cancel):
Nếu người chơi kéo lá bài ra ngoài nhưng thả vào vị trí không hợp lệ hoặc bấm nút hủy (dấu X), lá bài phải tự động lướt (animate/tween) trôi mượt mà về đúng vị trí cũ trong bộ bài trên tay.