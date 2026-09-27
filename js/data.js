/* ============================================================
   DATA — bảng dịch vụ, dụng cụ, nâng cấp, sự cố, lời thoại

   Ba thứ định hình cả game, đọc ba cái này là hiểu hết:
   1) MENUS   — đúng BA menu, giống bảng giá ngoài tiệm thật
   2) STEPS   — đúng TÁM bước spa, làm theo thứ tự trên xuống
   3) TIERS   — giá tính theo CÂN NẶNG của bé, không phải giá chết
   ============================================================ */

const GAME_VERSION = '2.0';
const SAVE = 'petSpa2', OWNER_SAVE = 'petSpaOwner';

/* ============================================================
   BẬC CÂN NẶNG — tiệm thật tính tiền theo kg nên game cũng vậy.
   Người chơi phải cân bé rồi bấm đúng bậc; bấm sai bậc là tính
   sai tiền, chủ nuôi phát hiện ngay.
   ============================================================ */
const TIERS = [
  { id: 'w5', n: 'Dưới 5kg', s: '<5kg', max: 5, m: 1 },
  { id: 'w10', n: '5 – 10kg', s: '5-10kg', max: 10, m: 1.4 },
  { id: 'w20', n: '10 – 20kg', s: '10-20kg', max: 20, m: 1.9 },
  { id: 'w30', n: 'Trên 20kg', s: '>20kg', max: 999, m: 2.5 }
];
const TIER_IDS = TIERS.map(t => t.id);
const tierOf = kg => (TIERS.find(t => kg <= t.max) || TIERS[TIERS.length - 1]).id;
const tierN = id => (TIERS.find(t => t.id === id) || TIERS[0]).n;

/* ============================================================
   TÁM BƯỚC SPA
   Thứ tự trong mảng này CHÍNH LÀ thứ tự bàn dụng cụ trên màn hình,
   xếp từ trên xuống, và cũng là thứ tự bắt buộc phải làm.

   tool : thiết bị cần có (khoá trong TOOLS), null là làm bằng tay
   need : vật tư tiêu hao mỗi lần làm
   base : số giây cơ bản — chia cho tốc độ thiết bị
   noise: bước ồn, bé sốt ruột nhanh hơn nếu máy còn cấp thấp
   ============================================================ */
const STEPS = [
  { id: 'cao', n: 'Cạo chân, bụng, hậu môn', s: 'Cạo', tool: 'tongdo', need: ['luoi'], base: 4.2, i: 'clipper', lbl: 'Cạo gọn!' },
  { id: 'tai', n: 'Vệ sinh tai', s: 'Tai', tool: null, need: ['taiset'], base: 3.2, i: 'ear', lbl: 'Tai sạch' },
  { id: 'mong', n: 'Cắt & mài móng', s: 'Móng', tool: 'kim', need: ['nhamong'], base: 4, i: 'nail', lbl: 'Móng gọn' },
  { id: 'tuyen', n: 'Lấy tuyến hôi', s: 'Tuyến hôi', tool: null, need: ['gangtay'], base: 3, i: 'glove', lbl: 'Xong tuyến hôi' },
  { id: 'tam', n: 'Tắm', s: 'Tắm', tool: 'voi', need: ['sualam'], base: 5.4, i: 'shampoo', lbl: 'Tắm thơm!' },
  { id: 'say', n: 'Sấy + chải tơi lông', s: 'Sấy', tool: 'say', need: ['khan'], base: 6, i: 'dryer', noise: true, lbl: 'Bông xù!' },
  { id: 'kieu', n: 'Cắt tạo kiểu', s: 'Tạo kiểu', tool: 'keo', need: [], base: 5.2, i: 'scissors', pick: 'style', lbl: 'Đẹp trai/xinh quá!' },
  { id: 'nhoa', n: 'Bôi nước hoa', s: 'Nước hoa', tool: null, need: [], base: 2.2, i: 'perfume', pick: 'scent', lbl: 'Thơm lừng' }
];
const STEP_IDS = STEPS.map(s => s.id);
const stepOf = id => STEPS.find(s => s.id === id);

/* ============================================================
   BA MENU — đúng như bảng giá dán tường tiệm spa
   ============================================================ */
const MENUS = {
  vscb: {
    n: 'Vệ sinh cơ bản', s: 'Vệ sinh', c: '#a8c99a', i: 'nail',
    steps: ['cao', 'tai', 'mong', 'tuyen'],
    d: 'Cạo chân bụng hậu môn · vệ sinh tai · cắt và mài móng · lấy tuyến hôi. <b>Không có tắm.</b>',
    base: 120000
  },
  tam: {
    n: 'Tắm', s: 'Tắm', c: '#8fb8d8', i: 'shampoo',
    steps: ['cao', 'tai', 'mong', 'tuyen', 'tam', 'say', 'nhoa'],
    d: 'Trọn bộ <b>vệ sinh cơ bản + tắm</b>, sấy chải tơi lông rồi bôi nước hoa.',
    base: 200000
  },
  tamtia: {
    n: 'Tắm + cắt tỉa', s: 'Tắm+tỉa', c: '#ef9bb0', i: 'scissors',
    steps: ['cao', 'tai', 'mong', 'tuyen', 'tam', 'say', 'kieu', 'nhoa'],
    d: 'Trọn bộ <b>vệ sinh cơ bản + tắm + cắt tạo kiểu</b> theo đúng kiểu chủ chọn.',
    base: 300000
  }
};
const MENU_IDS = Object.keys(MENUS);
/* menu nào mở ở cấp mấy */
const MENU_LV = { vscb: 1, tam: 1, tamtia: 2 };

/* ---------- ba kiểu tạo kiểu ---------- */
const STYLES = {
  gaubong: { n: 'Kiểu gấu bông', s: 'Gấu bông', d: 'Bo tròn đầu và má cho tròn vo như gấu bông', add: 90000, hard: 1.25 },
  muahe: { n: 'Kiểu mùa hè', s: 'Mùa hè', d: 'Cạo sát cho mát, chừa chỏm đỉnh đầu', add: 60000, hard: 1 },
  thietke: { n: 'Kiểu thiết kế', s: 'Thiết kế', d: 'Tạo hình theo ý chủ, khó nhất và lâu nhất', add: 140000, hard: 1.55 }
};
const STYLE_IDS = Object.keys(STYLES);

/* ---------- ba mùi nước hoa ---------- */
const SCENTS = {
  he: { n: 'Nước hoa mùa hè', s: 'Mùa hè', item: 'nhoaHe', c: '#a8c99a', d: 'Mùi cỏ chanh, mát và nhẹ' },
  thu: { n: 'Nước hoa mùa thu', s: 'Mùa thu', item: 'nhoaThu', c: '#e8a86a', d: 'Mùi vani gỗ ấm' },
  dong: { n: 'Nước hoa mùa đông', s: 'Mùa đông', item: 'nhoaDong', c: '#a8bcd4', d: 'Mùi bạc hà thông, se lạnh' }
};
const SCENT_IDS = Object.keys(SCENTS);

/* ============================================================
   THIẾT BỊ — mỗi thứ ba cấp, cấp 1 có sẵn từ đầu.
   Thứ tự trong TOOL_ORDER là thứ tự bàn dụng cụ trên màn hình.
   spd  : nhân tốc độ bước đó
   calm : bé bớt sốt ruột (trừ bao nhiêu phần trăm mức tụt kiên nhẫn)
   qual : cộng điểm tay nghề, chỉ kéo tạo kiểu mới có
   quiet: giảm tiếng ồn, chỉ máy sấy mới có
   ============================================================ */
const TOOLS = {
  tongdo: {
    n: 'Tông đơ', i: 'clipper', step: 'cao',
    tiers: [
      { n: 'Tông đơ tay', d: 'Chậm và hơi rung, bé không thích', cost: 0, spd: 1, calm: 0 },
      { n: 'Tông đơ pin cấp 2', d: 'Nhanh hơn 35%, êm hơn hẳn', cost: 850000, spd: 1.35, calm: .08 },
      { n: 'Tông đơ pin cấp 3', d: 'Nhanh gần gấp đôi, gần như không rung', cost: 2100000, spd: 1.75, calm: .16 }
    ]
  },
  kim: {
    n: 'Kìm cắt móng + máy mài', i: 'nail', step: 'mong',
    tiers: [
      { n: 'Kìm thường', d: 'Cắt được nhưng bé giật mình luôn', cost: 0, spd: 1, calm: 0 },
      { n: 'Kìm có chặn + máy mài', d: 'Nhanh hơn 35%, không lo cắt vào thịt', cost: 780000, spd: 1.35, calm: .1 },
      { n: 'Kìm điện + mài kim cương', d: 'Nhanh gấp đôi, bé gần như không hay biết', cost: 1900000, spd: 1.9, calm: .2 }
    ]
  },
  voi: {
    n: 'Bồn tắm + vòi sen', i: 'bath', step: 'tam',
    tiers: [
      { n: 'Chậu nhựa + vòi thường', d: 'Nước lúc nóng lúc lạnh, bé sợ', cost: 0, spd: 1, calm: 0 },
      { n: 'Bồn inox + vòi nước ấm', d: 'Nhanh hơn 35%, nước luôn ấm', cost: 1000000, spd: 1.35, calm: .14 },
      { n: 'Bồn massage sủi bọt', d: 'Nhanh gấp đôi, bé còn thích tắm', cost: 2400000, spd: 1.9, calm: .26 }
    ]
  },
  say: {
    n: 'Máy sấy công nghiệp', i: 'dryer', step: 'say',
    tiers: [
      { n: 'Máy sấy công nghiệp cấp 1', d: 'Sấy được nhưng gào rất to, bé rất sợ tiếng', cost: 0, spd: 1, calm: 0, quiet: 0 },
      { n: 'Máy sấy công nghiệp cấp 2', d: 'Sấy nhanh hơn 40%, tiếng ồn giảm một nửa', cost: 1200000, spd: 1.4, calm: .1, quiet: .5 },
      { n: 'Máy sấy công nghiệp cấp 3', d: 'Sấy nhanh gấp đôi, êm gần như không nghe thấy', cost: 2800000, spd: 2, calm: .2, quiet: .9 }
    ]
  },
  luoc: {
    n: 'Lược chải lông', i: 'comb', step: 'say',
    tiers: [
      { n: 'Lược nhựa', d: 'Kéo rít lông, chải tơi rất lâu', cost: 0, spd: 1, calm: 0 },
      { n: 'Lược răng thưa thép', d: 'Chải tơi nhanh hơn 25%', cost: 520000, spd: 1.25, calm: .06 },
      { n: 'Lược gỡ rối chuyên dụng', d: 'Gỡ rối gọn, bé không bị giật lông', cost: 1400000, spd: 1.55, calm: .14 }
    ]
  },
  keo: {
    n: 'Kéo tạo kiểu', i: 'scissors', step: 'kieu',
    tiers: [
      { n: 'Kéo thẳng cơ bản', d: 'Tay nghề mới học, tỉa được kiểu dễ thôi', cost: 0, spd: 1, calm: 0, qual: 0 },
      { n: 'Bộ kéo cong + kéo tỉa thưa', d: 'Nâng tay nghề: kiểu khó cũng làm đẹp, tip cao hơn', cost: 1300000, spd: 1.3, calm: .06, qual: 1 },
      { n: 'Bộ kéo Nhật + tay nghề thợ chính', d: 'Tay nghề thợ chính, kiểu thiết kế cũng ăn chắc 5 sao', cost: 3000000, spd: 1.6, calm: .12, qual: 2 }
    ]
  }
};
/* xếp từ trên xuống đúng như dòng chảy công việc */
const TOOL_ORDER = ['tongdo', 'kim', 'voi', 'say', 'luoc', 'keo'];

/* ============================================================
   VẬT TƯ TIÊU HAO — phải nhập ở màn chuẩn bị
   life: số ngày để được, 0 là không hết hạn
   ============================================================ */
const SUPPLY = {};
const sup = (k, n, s, grp, life, cost, unlock) => { SUPPLY[k] = { n, s, grp, life, cost, unlock } };
sup('luoi', 'Lưỡi cạo thay', 'Lưỡi cạo', 'spa', 0, 9000, 0);
sup('taiset', 'Bộ vệ sinh tai', 'Bộ tai', 'spa', 0, 11000, 0);
sup('nhamong', 'Giấy nhám mài móng', 'Nhám', 'spa', 0, 7000, 0);
sup('gangtay', 'Găng tay lấy tuyến hôi', 'Găng', 'spa', 0, 6000, 0);
sup('sualam', 'Sữa tắm thảo mộc', 'Sữa tắm', 'spa', 120, 22000, 0);
sup('khan', 'Khăn tắm sạch', 'Khăn', 'spa', 0, 8000, 0);
sup('nhoaHe', 'Nước hoa mùa hè', 'NH hè', 'nhoa', 90, 15000, 0);
sup('nhoaThu', 'Nước hoa mùa thu', 'NH thu', 'nhoa', 90, 15000, 0);
sup('nhoaDong', 'Nước hoa mùa đông', 'NH đông', 'nhoa', 90, 15000, 0);
sup('suatan', 'Suất ăn cho bé', 'Suất ăn', 'suco', 4, 24000, 0);
sup('banhthuong', 'Bánh thưởng', 'Bánh', 'suco', 25, 12000, 0);
sup('bovesinh', 'Bộ dọn vệ sinh', 'Bộ dọn', 'suco', 0, 10000, 0);
sup('ga', 'Bộ ga + lót chuồng', 'Ga', 'luutru', 0, 9000, 0);

const SUPPLY_KEYS = Object.keys(SUPPLY);
const SUP_GROUPS = [
  { g: 'spa', n: 'Vật tư spa', i: 'shampoo' },
  { g: 'nhoa', n: 'Nước hoa', i: 'perfume' },
  { g: 'suco', n: 'Đồ xử lý sự cố', i: 'warn' },
  { g: 'luutru', n: 'Lưu trú', i: 'bed' }
];
const supN = k => SUPPLY[k] ? SUPPLY[k].n : k;
const low = s => String(s).toLowerCase();

/* ============================================================
   LƯU TRÚ — làm spa xong có chủ gửi bé lại
   Luật do chính chủ tiệm đặt ra:
     trong ngày  → Phòng thường là đủ
     qua đêm     → PHẢI có Phòng Deluxe trở lên
   ============================================================ */
const ROOMS = [
  { id: 'thuong', n: 'Phòng thường', s: 'Thường', d: 'Chỉ nhận gửi trong ngày, chủ đón trước 19:00', over: false, cost: 0, i: 'bed' },
  { id: 'deluxe', n: 'Phòng Deluxe', s: 'Deluxe', d: 'Rộng, có đệm êm — nhận được gửi qua đêm', over: true, cost: 1500000, i: 'bed' },
  { id: 'vip', n: 'Phòng VIP', s: 'VIP', d: 'Qua đêm, phòng riêng có camera — chủ chịu trả thêm nhiều', over: true, cost: 3200000, i: 'crown' }
];
const STAYS = {
  ngay: { n: 'Gửi trong ngày', s: 'Trong ngày', d: 'Chủ đi làm, chiều qua đón', need: false, i: 'sun' },
  dem: { n: 'Gửi qua đêm', s: 'Qua đêm', d: 'Chủ đi công tác, sáng mai mới đón', need: true, i: 'moon' }
};

/* ============================================================
   LỚP HỌC CHO CHỦ NUÔI — mở bằng tiền, sau đó khách mới đặt được
   ============================================================ */
const CLASSES = [
  { id: 'hocchai', n: 'Học chải lông', s: 'Học chải', d: 'Dạy chủ cách chải tơi lông ở nhà cho bé không bị rối', cost: 900000, i: 'comb', sec: 4 },
  { id: 'hocmong', n: 'Học cắt móng', s: 'Học móng', d: 'Dạy chủ cách cắt móng mà không cắt vào phần thịt', cost: 800000, i: 'nail', sec: 3.6 }
];

/* ============================================================
   NÂNG CẤP TIỆM
   ============================================================ */
const UPG = [
  { id: 'bien', n: 'Biển hiệu đèn LED', d: 'Thêm 20% khách ghé tiệm', cost: 500000, i: 'sun' },
  { id: 'ghe', n: 'Ghế chờ cho chủ nuôi', d: 'Chủ ngồi thoải mái nên chịu chờ lâu hơn 25%', cost: 600000, i: 'people' },
  { id: 'nhac', n: 'Dàn nhạc thư giãn', d: 'Nhạc nhẹ cả tiệm, bé bớt căng — kiên nhẫn tụt chậm hơn 12%', cost: 750000, i: 'music' },
  { id: 'ads', n: 'Quảng cáo mạng xã hội', d: 'Thêm 25% khách ghé tiệm', cost: 850000, i: 'star' },
  { id: 'lanh', n: 'Máy lạnh toàn tiệm', d: 'Mát mẻ, bé dễ chịu — kiên nhẫn tụt chậm hơn 15%', cost: 1200000, i: 'ac' },
  { id: 'ban', n: 'Bàn spa nâng hạ', d: 'Đỡ bé đúng tầm tay, mọi bước nhanh hơn 12%', cost: 1400000, i: 'tools' },
  { id: 'cam', n: 'Camera cho chủ xem', d: 'Chủ ngồi ngoài nhìn được bé, yên tâm nên chấm sao rộng tay hơn', cost: 1900000, i: 'phone' },
  { id: 'autofeed', n: 'Máy cho ăn tự động', d: 'Bé đói là máy rót suất ăn — <b>ăn là ăn hết</b>, không bỏ mứa, xử lý xong ngay và tip thêm 25%', cost: 2400000, i: 'bowl' }
];
const STAFF = [
  { id: 'tro', n: 'Bạn phụ việc', d: 'Tự làm giúp bốn bước vệ sinh cơ bản cho bé đang trên bàn', cost: 900000, wage: 'wage1', i: 'hand' },
  { id: 'groomer', n: 'Bạn groomer', d: 'Tự lo trọn một bé trong hàng chờ, khoảng 12 giây', cost: 2200000, wage: 'wage2', i: 'scissors' },
  { id: 'appstaff', n: 'Bạn trực đơn app', d: 'Tự nhận và xử lý đơn PetPal. Thuê sẵn cũng là một cách để PetPal mời tiệm lên sàn', cost: 1800000, wage: 'wageOn', i: 'phone' }
];
const upgCount = () => UPG.filter(u => S.upg[u.id]).length;

/* ============================================================
   BA SỰ CỐ TRÊN BÀN SPA
   Hiện giữa lúc đang làm, có đếm ngược. Bấm đúng đồ là xong,
   bấm sai hoặc để hết giờ là bé tụt kiên nhẫn rất nhanh.
   ============================================================ */
const INCS = {
  doi: {
    n: 'Bé đói bụng', d: 'Bé cứ ngoái đi tìm đồ ăn, không chịu ngồi yên',
    fix: 'suatan', btn: 'Cho bé ăn', i: 'bowl', sec: 8, pay: true,
    miss: 'Bé đói mà không được ăn, gào suốt buổi'
  },
  du: {
    n: 'Bé dữ, chực cắn', d: 'Bé gồng người, nhe răng, không cho chạm vào nữa',
    fix: 'banhthuong', btn: 'Cho bánh thưởng', i: 'bone', sec: 7, pay: false,
    miss: 'Bé cắn một cái, bạn phải dừng tay một lúc'
  },
  te: {
    n: 'Bé tè bậy trên bàn', d: 'Phải dọn ngay không thì bẩn cả bàn và người bé',
    fix: 'bovesinh', btn: 'Dọn vệ sinh', i: 'mop', sec: 7, pay: false,
    miss: 'Bàn ướt nhẹp, bé nằm lên chỗ bẩn'
  }
};
const INC_IDS = Object.keys(INCS);

/* ============================================================
   TÍNH KHÍ CHỦ NUÔI — có người dễ tính, có người khó tính
   patM: nhân mức kiên nhẫn   strict: khắt khe khi chấm sao
   ============================================================ */
const MOODS = {
  de: { n: 'Dễ tính', i: 'heart', c: '#a8c99a', patM: 1.45, strict: -1, w: 26, d: 'Chủ thoải mái, chờ được lâu và chấm sao rộng tay' },
  thuong: { n: 'Bình thường', i: 'people', c: '#8fb8d8', patM: 1, strict: 0, w: 40, d: 'Chủ bình thường, làm đúng là hài lòng' },
  kho: { n: 'Khó tính', i: 'warn', c: '#e8a86a', patM: .8, strict: 1, w: 18, d: 'Soi từng chi tiết: sai một thứ nhỏ là trừ sao ngay' },
  hoi: { n: 'Đang vội', i: 'clock', c: '#e88a8a', patM: .55, strict: 0, w: 10, d: 'Chủ đứng chờ ngay cửa, kiên nhẫn chỉ bằng nửa người khác' },
  doi: { n: 'Hay đổi ý', i: 'reload', c: '#c9a9d4', patM: 1.05, strict: 0, w: 6, d: 'Đang làm dở thì đổi yêu cầu, nhớ xem lại phiếu' }
};
const MOOD_IDS = Object.keys(MOODS);

/* ============================================================
   SỰ KIỆN NGÀY
   ============================================================ */
const EVS = {
  hot: { n: 'Trời nóng bức', d: 'Khách đông hơn 30%, nhiều bé đòi cạo kiểu mùa hè', i: 'sun', mul: 1.3 },
  rain: { n: 'Trời mưa dầm', d: 'Khách tới tận tiệm ít hơn 30%, nhưng đơn app nhiều hơn', i: 'rain', mul: .7 },
  weekend: { n: 'Cuối tuần', d: 'Khách đông hơn 25%, hàng chờ lúc nào cũng có bé', i: 'heart', mul: 1.25 },
  tet: { n: 'Giáp Tết', d: 'Ai cũng muốn bé thơm tho đón Tết — khách đông gấp đôi, tip gấp đôi', i: 'gift', mul: 2 },
  trend: { n: 'Kiểu tóc hot trên mạng', d: 'Rất nhiều chủ đòi cùng một kiểu tạo kiểu, nhớ chuẩn bị', i: 'star', mul: 1.15 },
  sale: { n: 'Nhà cung cấp giảm giá', d: 'Nhập vật tư rẻ hơn 30% trong hôm nay', i: 'price', mul: 1 },
  vlog: { n: 'Vlogger thú cưng ghé', d: 'Làm tốt được 3 lời khen, làm dở thì cũng 3 lời chê', i: 'phone', mul: 1 },
  group: { n: 'Hội nhóm yêu chó', d: 'Giữa ngày cả nhóm kéo tới cùng lúc, hàng chờ đầy ngay', i: 'people', mul: 1 }
};

const GIFTS = [
  { n: 'Chủ quen tặng quà cảm ơn', d: 'Một chủ quen thấy bé về thơm quá nên gửi quà', min: 70000, max: 240000 },
  { n: 'Trả lại đồ khách để quên', d: 'Bạn trả lại chiếc vòng cổ hàng hiệu, chủ gửi tiền cảm ơn', min: 60000, max: 190000 },
  { n: 'Giải tiệm spa dễ thương nhất khu', d: 'Được bình chọn là chỗ làm đẹp đáng gửi nhất quanh đây', min: 240000, max: 380000, need: () => upgCount() >= 2 },
  { n: 'Nhãn sữa tắm tài trợ', d: 'Đánh giá cao nên được một nhãn sữa tắm tài trợ vật tư', min: 480000, max: 750000, need: () => S.reviews.length >= 20 && rating() >= 4.5 },
  { n: 'Bán lông vụn cho xưởng nhồi gối', d: 'Gom lông tỉa cả tuần, bán được ít tiền', min: 25000, max: 80000 },
  { n: 'Nhận làm spa cho cả đàn', d: 'Một trại nuôi gửi cả đàn tới làm, trả trước một cục', min: 250000, max: 600000, need: () => S.day >= 12 },
  { n: 'Cho thuê tiệm quay clip', d: 'Một nhãn hàng mượn tiệm quay clip quảng cáo', min: 180000, max: 450000, need: () => upgCount() >= 3 },
  { n: 'Nhà cung cấp hoàn tiền', d: 'Lô vật tư tuần trước giao thiếu, được trả lại tiền', min: 60000, max: 260000 }
];

const BAD = [
  { id: 'vo', n: 'Bé làm vỡ đồ', d: 'Một bé nghịch nhảy khỏi bàn, làm đổ kệ nước hoa', min: 60000, max: 180000 },
  { id: 'hong', n: 'Máy sấy cháy mô tơ', d: 'Máy sấy chạy cả ngày nên cháy mô tơ, phải gọi thợ', min: 120000, max: 320000 },
  { id: 'thuoc', n: 'Cắt vào thịt, phải đi thú y', d: 'Một bé bị cắt móng quá sâu, bạn đưa đi thú y ngay', min: 130000, max: 360000 },
  { id: 'dien', n: 'Hoá đơn điện nước tăng', d: 'Máy sấy với máy lạnh chạy suốt nên tiền điện vọt lên', min: 70000, max: 220000 }
];

/* ============================================================
   TÊN
   ============================================================ */
const PET_NAMES = ['Bơ', 'Mít', 'Sữa', 'Su Su', 'Bin', 'Tôm', 'Cún', 'Kem', 'Na Na', 'Gấu', 'Bống', 'Bi', 'Xoài', 'Chuối',
  'Heo', 'Cà Rốt', 'Bắp', 'Ốc', 'Nấm', 'Mochi', 'Khoai', 'Đậu', 'Lucky', 'Milo', 'Coco', 'Simba', 'Bông', 'Mật Ong',
  'Bánh Mì', 'Lu Lu', 'Tép', 'Mun', 'Đen', 'Vàng', 'Miu', 'Bủm', 'Xù', 'Nhím', 'Pudding', 'Cookie', 'Dâu', 'Bơ Sữa',
  'Mập', 'Tí', 'Bo Bo', 'Kiki', 'Lla', 'Mumu', 'Tuti', 'Vani', 'Tuyết', 'Nắng', 'Ụt', 'Đốm', 'Sushi', 'Mèo', 'Bún'];
const OWNER_NU = ['An', 'Anh', 'Ánh', 'Châu', 'Chi', 'Dung', 'Duyên', 'Giang', 'Hà', 'Hân', 'Hằng', 'Hiền', 'Hoa', 'Hương',
  'Huyền', 'Khuê', 'Lan', 'Linh', 'Ly', 'Mai', 'My', 'Nga', 'Ngân', 'Ngọc', 'Nhi', 'Nhung', 'Như', 'Phương', 'Quyên',
  'Quỳnh', 'Tâm', 'Thanh', 'Thảo', 'Thu', 'Thuỳ', 'Thư', 'Tiên', 'Trang', 'Trâm', 'Trúc', 'Uyên', 'Vân', 'Vy', 'Yến'];
const OWNER_NAM = ['An', 'Bảo', 'Bình', 'Cường', 'Đạt', 'Dũng', 'Duy', 'Dương', 'Đức', 'Hải', 'Hiếu', 'Hoàng', 'Huy',
  'Hùng', 'Khang', 'Khoa', 'Kiên', 'Lâm', 'Long', 'Minh', 'Nam', 'Nghĩa', 'Phát', 'Phong', 'Phúc', 'Quân', 'Quang',
  'Sơn', 'Tài', 'Thành', 'Thịnh', 'Tiến', 'Trí', 'Trung', 'Tú', 'Tuấn', 'Tùng', 'Việt', 'Vinh', 'Vũ'];
const OWNER_HO = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý', 'Trương'];

/* ---------- lời chủ nuôi lúc đưa bé vào ---------- */
const OPEN = ['Nhờ bạn làm cho', 'Cho mình gửi', 'Bé này nhờ bạn nhé', 'Mình gửi', 'Nhờ chỗ mình làm cho'];
const ENDS = [' nhé!', ' nha!', '.', ' nha, cảm ơn bạn!', ' giúp mình nhé!'];

const TXT = {
  great: [
    'Đón {pet} về mà lông thơm mềm, mê quá',
    '{pet} về là lăn ra ngủ ngon lành, chắc thoải mái lắm',
    'Kiểu tóc đúng ý mình luôn, tay nghề khéo thật',
    'Bạn thợ nhẹ tay, {pet} nhà mình sợ cắt móng mà ở đây ngồi im re',
    'Lần đầu tới mà ưng liền, chắc chắn quay lại',
    'Tiệm sạch thơm, {pet} vào là chịu lên bàn ngay',
    '{sv} ở đây làm gọn hơn mấy chỗ nổi tiếng',
    'Nhìn {pet} sạch bong từ móng tới tai là biết làm có tâm',
    'Đúng giờ, đúng kiểu, giá lại rõ ràng theo cân',
    '{pet} khó tính mà ở đây ngoan bất ngờ',
    'Mùi nước hoa vừa phải, không nồng, mình thích',
    'Tiệm spa ưng nhất từ trước tới giờ'
  ],
  ok: [
    'Ổn, {pet} về sạch sẽ vui vẻ',
    'Làm tốt, không có gì để chê',
    '{sv} làm gọn gàng, mình hài lòng',
    'Được, lần sau mình lại ghé',
    'Bạn thợ nhiệt tình, tiệm sạch'
  ],
  meh: [
    'Cũng được nhưng chờ hơi lâu',
    '{pet} về có vẻ mệt, chắc đông khách quá',
    'Bình thường thôi, chưa có gì đặc biệt',
    'Làm ổn nhưng mình phải đợi khá lâu'
  ],
  bad: [
    'Chờ lâu quá, {pet} kêu suốt',
    'Không hài lòng lắm, {sv} làm chưa tới',
    'Đợi mãi mới tới lượt, chắc mình tìm chỗ khác',
    '{pet} về có vẻ hoảng, không biết làm gì bé'
  ],
  wait: [
    'Đợi lâu quá trời, {pet} sốt ruột rồi',
    'Xếp hàng cả buổi mới tới lượt',
    'Tiệm đông nhưng làm chậm quá',
    'Chờ hơi lâu, mong lần sau nhanh hơn'
  ],
  wrongMenu: [
    'Mình đặt {sv} mà lại làm kiểu khác',
    'Nhầm gói rồi bạn ơi, mình không đặt cái đó',
    '{pet} chưa được tắm mà đã trả về rồi',
    'Mình không kêu cắt tỉa sao lại tỉa của bé'
  ],
  wrongPrice: [
    'Bé mình có {kg}kg mà tính tiền bậc khác, bạn xem lại',
    'Tính tiền sai bậc cân rồi, mình có cân ở nhà',
    'Hoá đơn không đúng bậc kg, hơi khó chịu'
  ],
  wrongStyle: [
    'Mình xin kiểu khác mà, cắt xong rồi biết làm sao',
    'Kiểu này không phải cái mình chọn',
    'Tóc {pet} không giống hình mình đưa'
  ],
  wrongScent: [
    'Mình xin mùi khác, {pet} về nhà cả nhà không chịu mùi này',
    'Nước hoa không đúng mùi mình chọn'
  ],
  wrongRoom: [
    'Mình gửi qua đêm mà xếp bé vào phòng thường',
    'Phòng không đúng hạng mình đặt'
  ],
  rough: [
    '{pet} về mà cứ rúm lại, chắc bị làm mạnh tay',
    'Có vẻ bé bị giật mình nhiều, thương quá',
    'Máy sấy ồn quá, {pet} sợ tới giờ'
  ],
  pricey: [
    'Chất lượng ổn nhưng giá cao quá',
    'Đắt hơn mặt bằng chung nhiều',
    'Giá này thì mình cân nhắc lại',
    'Làm tốt nhưng ví mình không theo nổi'
  ],
  cheap: [
    'Giá mềm mà làm kỹ, quá hời',
    'Rẻ hơn chỗ khác mà còn sạch hơn',
    'Giá này là quá tốt rồi'
  ],
  timeout: [
    'Đợi mãi không ai nhận, mình đưa {pet} về',
    'Chờ hết nổi, mình qua tiệm khác',
    'Không ai ra tiếp, thất vọng'
  ],
  soldout: [
    'Tới nơi mới biết tiệm hết vật tư, không làm được',
    'Hết {sv} mà vẫn nhận khách'
  ],
  late: [
    'Đặt qua app mà chờ quá lâu mới xong',
    'Trả bé trễ hơn giờ hẹn nhiều'
  ]
};
const TAIL = { 5: ['', ' 🐾', ' ❤️', ' ✨'], 4: ['', ' 🐾', ' 🙂'], 3: ['', ' 😐'], 2: ['', ' 😞'], 1: ['', ' 😞', ' 💔'] };

/* ============================================================
   BỐN CÁCH ĐỂ PETPAL MỜI TIỆM LÊN SÀN

   Cách viết ở bản trước bị nhận xét là rối. Lần này mỗi cách có
   đúng một câu giải thích bằng tiếng người, rồi hai dòng điều kiện
   rõ ràng. Luật gọn lại một câu:
     làm xong TRỌN MỘT CÁCH bất kỳ là PetPal mở, không cần đủ cả bốn.
   ============================================================ */
const PETPAL = [
  {
    id: 'ngay', n: 'Mở tiệm đủ lâu', i: 'clock',
    how: 'Cứ mở cửa đều mỗi ngày và giữ sao đừng tụt. Cách chậm nhưng chắc nhất.',
    cs: [
      { t: 'Mở cửa 20 ngày', f: () => S.day >= 20, p: () => S.day / 20, now: () => `${S.day}/20 ngày` },
      { t: 'Đánh giá từ 4,0★', f: () => rating() >= 4, p: () => rating() / 4, now: () => `đang ${rating().toFixed(1).replace('.', ',')}★` }
    ]
  },
  {
    id: 'sao', n: 'Được khen nhiều', i: 'star',
    how: 'Làm thật kỹ để chủ nuôi khen liên tục. Nhanh nhất nếu bạn chơi chắc tay.',
    cs: [
      { t: '150 lượt đánh giá', f: () => revCount() >= 150, p: () => revCount() / 150, now: () => `${revCount()}/150 lượt` },
      { t: 'Đánh giá từ 4,5★', f: () => rating() >= 4.5, p: () => rating() / 4.5, now: () => `đang ${rating().toFixed(1).replace('.', ',')}★` }
    ]
  },
  {
    id: 'tien', n: 'Làm ăn lớn', i: 'chart',
    how: 'Chạy nhiều bé, kiếm nhiều tiền cho tiệm đủ tầm để app để mắt tới.',
    cs: [
      { t: 'Tổng lãi 15 triệu', f: () => (S.totalProfit || 0) >= 15000000, p: () => (S.totalProfit || 0) / 15000000, now: () => fmtBig(Math.max(0, S.totalProfit || 0)) + '/15 triệu' },
      { t: 'Làm cho 250 bé', f: () => S.served >= 250, p: () => S.served / 250, now: () => `${S.served}/250 bé` }
    ]
  },
  {
    id: 'dautu', n: 'Chịu đầu tư', i: 'money',
    how: 'Bỏ tiền ra làm cho tiệm tử tế rồi thuê hẳn người trực app. Tốn tiền nhưng nhanh.',
    cs: [
      { t: 'Thuê bạn trực đơn app', f: () => !!S.upg.appstaff, p: () => S.upg.appstaff ? 1 : 0, now: () => S.upg.appstaff ? 'đã thuê' : 'chưa thuê' },
      { t: 'Mua 5 nâng cấp tiệm', f: () => upgCount() >= 5, p: () => upgCount() / 5, now: () => `${upgCount()}/5 nâng cấp` }
    ]
  }
];

/* ============================================================
   CẤP ĐỘ
   ============================================================ */
const LV_TXT = {
  1: 'Hai menu Vệ sinh cơ bản và Tắm. Làm cho quen tay trước đã.',
  2: 'Mở menu Tắm + cắt tỉa: có tạo kiểu và chọn mùi nước hoa.',
  3: 'Có chủ gửi bé lại sau spa — nhớ nâng cấp hạng phòng để nhận gửi qua đêm.',
  4: 'Chủ nuôi bắt đầu đặt lớp học chải lông / cắt móng, và khách khó tính nhiều hơn.'
};

/* ============================================================
   CẤU HÌNH
   ============================================================ */
const DEFAULT_CONFIG = {
  ownerPin: '2468',
  dayMin: 4,                  /* phút thật cho một ngày (08:00 → 19:00 trong game) */
  startMoney: 900000,
  commission: 20,             /* % phí app PetPal */
  wage1: 260000, wage2: 520000, wageOn: 480000,
  /* Chi phí cố định đặt theo tiệm spa thật: mặt bằng mặt phố, điện nước cho
     máy sấy công nghiệp chạy cả ngày. Đặt thấp thì ngày nào cũng lãi đậm và
     mọi nâng cấp mua được trong một tuần, chơi hết hay. */
  rent: 450000,
  utilBase: 180000,
  utilPerUpg: 35000,
  /* Giá là chỉ số tương đối so với giá gợi ý, KHÔNG phải mốc tiền tuyệt đối.
     Làm vậy để mở thêm dịch vụ đắt không bao giờ tự nhiên làm khách bỏ đi —
     đúng cái bug trần giá đã gặp ở bản khách sạn. */
  priceWarn: 1.3,             /* vượt mức này thì chủ nuôi chê đắt, trừ sao */
  priceRefuse: 1.7,           /* vượt mức này thì phần lớn khách quay đầu luôn */
  priceMaxM: 3,               /* không cho nhập quá 3 lần giá gợi ý */
  onlineKeep: 3.7,            /* tụt dưới mức sao này thì PetPal tạm ngưng đẩy đơn */
  patBase: 78,                /* giây kiên nhẫn cơ bản của một chủ nuôi */
  spawnGap: 20,               /* giây giữa hai lượt khách tới — phải xấp xỉ thời gian làm một bé */
  queueMax: 4,                /* hàng chờ giữ tối đa bao nhiêu bé */
  incBase: .1,                /* mức sự cố: nhắm khoảng 1 sự cố cho mỗi hai bé, không phải bé nào cũng gặp */
  taxThreshold: 1000000000, vat: 3, pit: 1.5,
  levels: { l2: 5, l3: 14, l4: 26 },
  cost: {}, life: {}
};
SUPPLY_KEYS.forEach(k => {
  DEFAULT_CONFIG.cost[k] = SUPPLY[k].cost;
  DEFAULT_CONFIG.life[k] = SUPPLY[k].life;
});

/* ---------- giá gợi ý ---------- */
/* bảng menu × bậc cân */
const DEF_PRICE = {};
MENU_IDS.forEach(m => {
  DEF_PRICE[m] = {};
  TIERS.forEach(t => { DEF_PRICE[m][t.id] = Math.round(MENUS[m].base * t.m / 1000) * 1000 });
});
/* phụ thu */
const DEF_ADD = {
  gaubong: STYLES.gaubong.add, muahe: STYLES.muahe.add, thietke: STYLES.thietke.add,
  suatan: 50000,
  stay_ngay: 160000, stay_dem: 320000,
  up_deluxe: 90000, up_vip: 240000,
  hocchai: 260000, hocmong: 220000
};
const ADD_ROWS = [
  { k: 'gaubong', n: 'Tạo kiểu gấu bông', i: 'scissors' },
  { k: 'muahe', n: 'Tạo kiểu mùa hè', i: 'scissors' },
  { k: 'thietke', n: 'Tạo kiểu thiết kế', i: 'scissors' },
  { k: 'suatan', n: 'Cho bé ăn tại tiệm', i: 'bowl' },
  { k: 'stay_ngay', n: 'Gửi trong ngày', i: 'sun' },
  { k: 'stay_dem', n: 'Gửi qua đêm', i: 'moon' },
  { k: 'up_deluxe', n: 'Phụ thu phòng Deluxe', i: 'bed' },
  { k: 'up_vip', n: 'Phụ thu phòng VIP', i: 'crown' },
  { k: 'hocchai', n: 'Lớp học chải lông', i: 'comb' },
  { k: 'hocmong', n: 'Lớp học cắt móng', i: 'nail' }
];

let CFG = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
try {
  const o = JSON.parse(localStorage.getItem(OWNER_SAVE));
  if (o) CFG = { ...CFG, ...o, levels: { ...CFG.levels, ...o.levels }, cost: { ...CFG.cost, ...o.cost }, life: { ...CFG.life, ...o.life } };
} catch (e) { }
function saveCfg() { try { localStorage.setItem(OWNER_SAVE, JSON.stringify(CFG)) } catch (e) { } }

/* ============================================================
   TỰ KIỂM TRA CẤU HÌNH
   Cắt bớt danh mục mà quên sửa một bảng tham chiếu là loại lỗi
   im lặng khó thấy nhất, nên báo thẳng ra console.
   ============================================================ */
function cfgSelfCheck() {
  const bad = [];
  /* mọi bước của mọi menu phải là bước có thật */
  MENU_IDS.forEach(m => MENUS[m].steps.forEach(s => {
    if (!stepOf(s)) bad.push(`MENUS.${m} có bước "${s}" không tồn tại trong STEPS`);
  }));
  /* bước nào cũng phải làm được: thiết bị có thật, vật tư có thật */
  STEPS.forEach(s => {
    if (s.tool && !TOOLS[s.tool]) bad.push(`bước "${s.id}" cần thiết bị "${s.tool}" không có trong TOOLS`);
    (s.need || []).forEach(k => { if (!SUPPLY[k]) bad.push(`bước "${s.id}" cần vật tư "${k}" không có trong SUPPLY`) });
  });
  /* thiết bị nào cũng phải trỏ về một bước có thật và cấp 1 phải miễn phí */
  Object.keys(TOOLS).forEach(k => {
    if (!stepOf(TOOLS[k].step)) bad.push(`TOOLS.${k}.step = "${TOOLS[k].step}" không có trong STEPS`);
    if (TOOLS[k].tiers[0].cost !== 0) bad.push(`TOOLS.${k} cấp 1 phải miễn phí, nếu không thì ngày đầu không làm nổi bước đó`);
    if (TOOLS[k].tiers.length !== 3) bad.push(`TOOLS.${k} có ${TOOLS[k].tiers.length} cấp, thiết kế là 3`);
  });
  TOOL_ORDER.forEach(k => { if (!TOOLS[k]) bad.push(`TOOL_ORDER có "${k}" không tồn tại`) });
  Object.keys(TOOLS).forEach(k => { if (!TOOL_ORDER.includes(k)) bad.push(`TOOLS.${k} thiếu trong TOOL_ORDER nên sẽ không hiện trên bàn dụng cụ`) });
  /* vật tư nào cũng phải có hình, và không có hình thừa */
  SUPPLY_KEYS.forEach(k => { if (!ITEM_ART[k]) bad.push(`vật tư "${k}" chưa có hình trong ITEM_ART`) });
  Object.keys(ITEM_ART).forEach(k => { if (!SUPPLY[k]) bad.push(`ITEM_ART."${k}" là hình thừa, vật tư đã bị xoá`) });
  /* mùi nước hoa phải khớp với vật tư */
  SCENT_IDS.forEach(k => { if (!SUPPLY[SCENTS[k].item]) bad.push(`SCENTS.${k} trỏ tới vật tư "${SCENTS[k].item}" không tồn tại`) });
  /* đồ xử lý sự cố phải có thật */
  INC_IDS.forEach(k => { if (!SUPPLY[INCS[k].fix]) bad.push(`INCS.${k}.fix = "${INCS[k].fix}" không có trong SUPPLY`) });
  /* mỗi giống chó phải có khoảng cân rơi vào một bậc giá */
  BREED_KEYS.forEach(b => {
    const kg = BREEDS[b].kg;
    if (!Array.isArray(kg) || kg[0] > kg[1]) bad.push(`BREEDS.${b}.kg không hợp lệ`);
  });
  /* menu cấp 1 phải làm được ngay ngày đầu, không cần mua gì */
  MENU_IDS.filter(m => MENU_LV[m] === 1).forEach(m => {
    MENUS[m].steps.forEach(s => {
      const st = stepOf(s);
      if (st.pick === 'style' || st.pick === 'scent') return;
      if (st.tool && TOOLS[st.tool].tiers[0].cost !== 0) bad.push(`menu "${m}" ngày đầu cần thiết bị phải mua`);
    });
  });
  /* giá gợi ý phải luôn tăng theo bậc cân, không thì bảng giá vô lý */
  MENU_IDS.forEach(m => {
    for (let i = 1; i < TIER_IDS.length; i++) {
      if (DEF_PRICE[m][TIER_IDS[i]] <= DEF_PRICE[m][TIER_IDS[i - 1]])
        bad.push(`giá gợi ý menu "${m}" không tăng theo bậc cân`);
    }
  });
  if (bad.length) console.warn('[cấu hình] có chỗ chưa khớp:\n- ' + bad.join('\n- '));
  return bad;
}
