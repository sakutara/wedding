# Kế hoạch app kiểm việc đám cưới (dành cho cô dâu)

## 1. Mục tiêu
- Một web app để **cô dâu** theo dõi các sự kiện và công việc chuẩn bị đám cưới.
- Nhắc việc khi chưa hoàn thành.
- Dùng một mình: không đăng nhập, không chia sẻ, không server.

## 2. Hình thức & công nghệ
| Phần | Lựa chọn |
|---|---|
| Hình thức | Web app thuần, mở bằng trình duyệt trên điện thoại/máy tính |
| Frontend | React + Vite + TypeScript + Tailwind, giao diện tiếng Việt, ưu tiên dùng một tay |
| Lưu trữ | IndexedDB trong trình duyệt (chạy offline, không tốn phí) |
| Sao lưu | Nút Xuất/Nhập file JSON (dữ liệu nằm trong từng trình duyệt, dùng JSON để chuyển thiết bị) |
| Triển khai | Vercel hoặc Cloudflare Pages (miễn phí) để có một đường link |

## 3. Cấu trúc dữ liệu
`Sự kiện → Việc → Việc con`

- `settings`: ngày cưới, tên cô dâu/chú rể
- `event`: tên, ngày, màu/biểu tượng, thứ tự, ẩn/hiện
- `task`: event_id, tiêu đề, hạn, ghi chú, đã xong, ngày xong, ẩn
- `subtask`: task_id, tiêu đề, hạn, ghi chú, đã xong

Hạn mặc định của mẫu tính lùi từ ngày cưới (N-90 ngày...). Đổi ngày cưới thì hạn tự dời theo.

## 4. Tính năng
### MVP
1. **Sự kiện và việc**: danh sách theo sự kiện, tick xong một chạm, tiến độ theo sự kiện (ví dụ 4/9) và tổng.
2. **Chia nhỏ việc**: mỗi việc có việc con, tiến độ việc cha tự tính theo việc con.
3. **Trang chính**: đếm ngược ngày cưới, việc quá hạn (đỏ), việc 7 ngày tới, việc chưa có hạn, % hoàn thành.
4. **Mẫu có sẵn**: danh sách đề xuất ở mục 6, nạp một lần là có sẵn khung.
5. **Nhắc việc** (mục 5).
6. **Tự thêm/sửa/xoá** ở mọi cấp (mục 7).
7. **Xuất/Nhập JSON**, xuất lịch `.ics`.

### Giai đoạn 2 (tuỳ chọn)
- Ngân sách: dự kiến và thực chi theo hạng mục.
- Danh sách khách mời, xác nhận tham dự.
- Danh sách nhà cung cấp: liên hệ, báo giá, tiền cọc.
- Push thông báo lặp mỗi ngày (ví dụ ntfy.sh) cho đến khi xong.

## 5. Nhắc việc khi chưa xong
- **Trong app**: mỗi lần mở web hiện banner "Có X việc quá hạn / đến hạn hôm nay".
- **Ngoài app**: xuất việc sang lịch điện thoại (`.ics`) kèm báo thức trước 3 ngày, 1 ngày và trong ngày. Lịch của máy tự nhắc dù không mở web.
- Chỉ tính việc **chưa xong, chưa ẩn, có hạn**. Xoá việc thì nhắc tương ứng biến mất.
- Việc chưa đặt hạn nằm ở mục "Chưa có hạn" trên trang chính.
- Lưu ý: web thuần không tự gửi thông báo khi đã đóng trang.

## 6. Danh sách đề xuất sự kiện và việc (mẫu)
Hạn tính lùi từ ngày cưới (N).

### 6.1 Khởi động & lên kế hoạch (N-12 đến N-9 tháng)
- Chốt ngày cưới (xem ngày tốt, hỏi ý hai bên gia đình)
- Lập ngân sách tổng và chia theo hạng mục
- Dự kiến số lượng khách mỗi bên
- Chọn phong cách/chủ đề tiệc cưới
- Chọn người hỗ trợ (phù dâu, phù rể, người điều phối ngày cưới)

### 6.2 Lễ ăn hỏi / đính hôn (N-3 đến N-2 tháng)
- Chọn ngày giờ tốt
- Chuẩn bị tráp ăn hỏi (đặt tráp, trà, rượu, bánh, trái cây, trầu cau)
- Chuẩn bị trang phục (áo dài cô dâu, chú rể, gia đình)
- Đặt trang trí, bàn thờ/cổng hoa (nếu có)
- Đặt tiệc/nhà hàng cho buổi lễ
- Thuê đội bưng tráp, MC, quay chụp
- Danh sách người nhà dự lễ và thông báo

### 6.3 Chụp ảnh cưới (N-3 đến N-2 tháng)
- Chọn studio, ký hợp đồng, đặt cọc
- Chọn concept và địa điểm chụp
- Chọn ngày chụp (dự phòng ngày mưa)
- Thử trang điểm, chọn váy/vest chụp
- Chuẩn bị phụ kiện (giày, hoa cầm tay, nhẫn)
- Chọn ảnh, duyệt hậu kỳ
- In ảnh treo tiệc, album, ảnh cưới lớn

### 6.4 Nhẫn, trang sức & trang phục (N-5 đến N-1 tháng)
- Chọn và đặt nhẫn cưới
- Chọn váy cưới, đặt may/thuê (thử lần 1, lần 2)
- Vest chú rể, áo dài cô dâu chú rể
- Trang phục cho phù dâu, phù rể
- Giày, phụ kiện, trang sức cô dâu
- Chỉnh sửa lần cuối (N-2 tuần)

### 6.5 Thiệp & danh sách khách mời (N-3 đến N-1 tháng)
- Chốt danh sách khách hai bên
- Chọn mẫu thiệp, in thiệp
- Viết, ghi tên và phát thiệp
- Mời qua tin nhắn/điện thoại với khách xa
- Theo dõi xác nhận tham dự, chốt số bàn

### 6.6 Tiệc cưới / nhà hàng (N-6 đến N-1 tháng)
- Tham quan, chọn nhà hàng, đặt cọc
- Chọn thực đơn, ăn thử
- Chọn MC, ban nhạc/ca sĩ, âm thanh ánh sáng
- Trang trí tiệc: cổng hoa, bàn gallery, hoa bàn, backdrop
- Chuẩn bị chương trình, nhạc, video, slide
- Quà cảm ơn khách (quà tặng bàn, bonbonniere)
- Sơ đồ chỗ ngồi
- Chốt số bàn cuối với nhà hàng (N-1 tuần)

### 6.7 Lễ rước dâu / lễ gia tiên (N-3 tháng đến ngày cưới)
- Chọn giờ tốt, thống nhất lịch trình hai bên
- Xe hoa, xe đưa đón gia đình
- Đội bưng tráp, bê quả, phù dâu phù rể
- Hoa cầm tay, hoa cài áo
- Chuẩn bị lễ vật, mâm cúng gia tiên
- Phân công người dẫn lễ, người lo đón khách

### 6.8 Trang điểm & làm đẹp (N-2 tháng đến ngày cưới)
- Chọn thợ trang điểm, làm tóc, ký hợp đồng
- Trang điểm thử
- Chăm sóc da, tóc, móng
- Đặt lịch ngày cưới, kèm lịch cho mẹ và phù dâu

### 6.9 Giấy tờ pháp lý (N-2 đến N-1 tháng)
- Giấy xác nhận tình trạng hôn nhân
- Khám sức khoẻ tiền hôn nhân (nếu cần)
- Làm thủ tục đăng ký kết hôn
- Giấy tờ liên quan nhập hộ khẩu/đổi giấy tờ sau cưới

### 6.10 Quay chụp & ghi hình ngày cưới (N-3 đến N-1 tháng)
- Chọn nhiếp ảnh, quay phim ngày cưới
- Lên danh sách khoảnh khắc cần chụp
- Thống nhất lịch quay chụp theo từng lễ

### 6.11 Tuần cưới & ngày cưới (N-7 đến N)
- Xác nhận lại với tất cả nhà cung cấp
- Chuẩn bị phong bì cảm ơn, tiền lẻ
- Túi đồ cô dâu (đồ dặm, sạc, thuốc, giày dự phòng)
- Phân công người lo từng phần ngày cưới
- Nghỉ ngơi, ngủ đủ đêm trước

### 6.12 Tuần trăng mật & sau cưới
- Chọn điểm đến, đặt vé, khách sạn, visa
- Chuẩn bị hành lý
- Gửi lời cảm ơn khách, trả đồ thuê, thanh toán còn lại
- Nhận ảnh/video và album

## 7. Tự thêm, sửa, xoá
| Đối tượng | Thêm | Sửa | Xoá |
|---|---|---|---|
| Sự kiện | "+ Thêm sự kiện" (tên, ngày, màu/biểu tượng) | Đổi tên, ngày, thứ tự kéo thả | Xoá cả sự kiện kèm việc bên trong |
| Việc | Ô "+ Thêm việc" cuối mỗi sự kiện, gõ tên rồi Enter | Sửa tên, hạn, ghi chú, chuyển sự kiện | Xoá từng việc |
| Việc con | "+ Thêm việc con" trong từng việc | Sửa tên, hạn | Xoá từng việc con |

Quy tắc:
- **Xoá có Hoàn tác**: hiện thanh "Đã xoá. Hoàn tác" trong vài giây thay vì hộp thoại xác nhận.
- **Việc từ mẫu cũng xoá được** như việc tự thêm, không bị khoá.
- **Ẩn thay vì xoá**: sự kiện/việc ẩn không tính vào tiến độ và nhắc việc, bật lại được.
- **Khôi phục mẫu**: nút "Thêm lại việc mẫu đã xoá" trong Cài đặt.
- **Nhân bản việc** khi cần nhiều việc giống nhau.
- **Thêm việc nhanh**: chỉ cần tên việc; sự kiện, hạn, ghi chú, việc con đều tuỳ chọn.

## 8. Lộ trình
| Bước | Nội dung | Ước tính |
|---|---|---|
| 1 | Khung app, CRUD sự kiện/việc/việc con, tick xong | 1 ngày |
| 2 | Trang chính, đếm ngược, quá hạn, tiến độ | 1 ngày |
| 3 | Mẫu checklist, ẩn/hoàn tác, xuất/nhập JSON, xuất `.ics`, deploy | 1 ngày |
| 4 | Giai đoạn 2: ngân sách, khách mời, nhà cung cấp (tuỳ chọn) | tuỳ chọn |

## 9. Câu hỏi còn mở
- Sự kiện nào cần bỏ hoặc thêm (ví dụ lễ vu quy, tiệc nhà trai/nhà gái riêng, lễ nhà thờ)?
- Có cần nhắc lặp mỗi ngày bằng push, hay lịch điện thoại là đủ?
