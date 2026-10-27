// Danh sách mẫu: mỗi việc là [tiêu đề, số ngày trước ngày cưới, [việc con]]
// Số âm = sau ngày cưới.
var TEMPLATE = [
  { k: 'kh', t: 'Khởi động & lên kế hoạch', e: '💍', tasks: [
    ['Chốt ngày cưới (xem ngày tốt, hỏi ý hai bên gia đình)', 365],
    ['Lập ngân sách tổng và chia theo hạng mục', 350],
    ['Dự kiến số lượng khách mỗi bên', 330],
    ['Chọn phong cách/chủ đề tiệc cưới', 300],
    ['Chọn người hỗ trợ (phù dâu, phù rể, người điều phối ngày cưới)', 270]
  ]},
  { k: 'ah', t: 'Lễ ăn hỏi / đính hôn', e: '🎁', tasks: [
    ['Chọn ngày giờ tốt', 100],
    ['Chuẩn bị tráp ăn hỏi', 60, ['Đặt hộp tráp', 'Trầu cau', 'Trà, rượu', 'Bánh, trái cây']],
    ['Chuẩn bị trang phục (áo dài cô dâu, chú rể, gia đình)', 60],
    ['Đặt trang trí, bàn thờ/cổng hoa (nếu có)', 45],
    ['Đặt tiệc/nhà hàng cho buổi lễ', 45],
    ['Thuê đội bưng tráp, MC, quay chụp', 40],
    ['Danh sách người nhà dự lễ và thông báo', 30]
  ]},
  { k: 'anh', t: 'Chụp ảnh cưới', e: '📸', tasks: [
    ['Chọn studio, ký hợp đồng, đặt cọc', 90],
    ['Chọn concept và địa điểm chụp', 80],
    ['Chọn ngày chụp (dự phòng ngày mưa)', 75],
    ['Thử trang điểm, chọn váy/vest chụp', 65],
    ['Chuẩn bị phụ kiện (giày, hoa cầm tay, nhẫn)', 60],
    ['Chọn ảnh, duyệt hậu kỳ', 40],
    ['In ảnh treo tiệc, album, ảnh cưới lớn', 20]
  ]},
  { k: 'tp', t: 'Nhẫn, trang sức & trang phục', e: '👗', tasks: [
    ['Chọn và đặt nhẫn cưới', 150],
    ['Chọn váy cưới, đặt may/thuê', 120, ['Thử lần 1', 'Thử lần 2']],
    ['Vest chú rể, áo dài cô dâu chú rể', 90],
    ['Trang phục cho phù dâu, phù rể', 60],
    ['Giày, phụ kiện, trang sức cô dâu', 45],
    ['Chỉnh sửa lần cuối', 14]
  ]},
  { k: 'th', t: 'Thiệp & danh sách khách mời', e: '💌', tasks: [
    ['Chốt danh sách khách hai bên', 90],
    ['Chọn mẫu thiệp, in thiệp', 70],
    ['Viết, ghi tên và phát thiệp', 40],
    ['Mời qua tin nhắn/điện thoại với khách xa', 30],
    ['Theo dõi xác nhận tham dự, chốt số bàn', 10]
  ]},
  { k: 'tc', t: 'Tiệc cưới / nhà hàng', e: '🍽️', tasks: [
    ['Tham quan, chọn nhà hàng, đặt cọc', 180],
    ['Chọn thực đơn, ăn thử', 90],
    ['Chọn MC, ban nhạc/ca sĩ, âm thanh ánh sáng', 75],
    ['Trang trí tiệc', 60, ['Cổng hoa', 'Bàn gallery', 'Hoa bàn', 'Backdrop']],
    ['Chuẩn bị chương trình, nhạc, video, slide', 30],
    ['Quà cảm ơn khách (quà tặng bàn)', 30],
    ['Sơ đồ chỗ ngồi', 14],
    ['Chốt số bàn cuối với nhà hàng', 7]
  ]},
  { k: 'rd', t: 'Lễ rước dâu / lễ gia tiên', e: '🚗', tasks: [
    ['Chọn giờ tốt, thống nhất lịch trình hai bên', 90],
    ['Xe hoa, xe đưa đón gia đình', 45],
    ['Đội bưng tráp, bê quả, phù dâu phù rể', 30],
    ['Hoa cầm tay, hoa cài áo', 14],
    ['Chuẩn bị lễ vật, mâm cúng gia tiên', 7],
    ['Phân công người dẫn lễ, người lo đón khách', 7]
  ]},
  { k: 'td', t: 'Trang điểm & làm đẹp', e: '💄', tasks: [
    ['Chọn thợ trang điểm, làm tóc, ký hợp đồng', 60],
    ['Trang điểm thử', 30],
    ['Chăm sóc da, tóc, móng', 14],
    ['Đặt lịch ngày cưới, kèm lịch cho mẹ và phù dâu', 14]
  ]},
  { k: 'gt', t: 'Giấy tờ pháp lý', e: '📄', tasks: [
    ['Giấy xác nhận tình trạng hôn nhân', 60],
    ['Khám sức khoẻ tiền hôn nhân (nếu cần)', 50],
    ['Làm thủ tục đăng ký kết hôn', 30],
    ['Giấy tờ liên quan nhập hộ khẩu/đổi giấy tờ sau cưới', -14]
  ]},
  { k: 'qc', t: 'Quay chụp ngày cưới', e: '🎥', tasks: [
    ['Chọn nhiếp ảnh, quay phim ngày cưới', 90],
    ['Lên danh sách khoảnh khắc cần chụp', 30],
    ['Thống nhất lịch quay chụp theo từng lễ', 14]
  ]},
  { k: 'tw', t: 'Tuần cưới & ngày cưới', e: '🎉', tasks: [
    ['Xác nhận lại với tất cả nhà cung cấp', 7],
    ['Chuẩn bị phong bì cảm ơn, tiền lẻ', 5],
    ['Túi đồ cô dâu (đồ dặm, sạc, thuốc, giày dự phòng)', 3],
    ['Phân công người lo từng phần ngày cưới', 3],
    ['Nghỉ ngơi, ngủ đủ đêm trước', 1]
  ]},
  { k: 'tt', t: 'Trăng mật & sau cưới', e: '✈️', tasks: [
    ['Chọn điểm đến, đặt vé, khách sạn, visa', 60],
    ['Chuẩn bị hành lý', 3],
    ['Gửi lời cảm ơn khách, trả đồ thuê, thanh toán còn lại', -7],
    ['Nhận ảnh/video và album', -30]
  ]}
];
