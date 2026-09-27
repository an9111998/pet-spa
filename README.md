# Spa Thú Cưng

**Chơi ngay: <https://spa-thu-cung.vercel.app>**

Game mô phỏng **tiệm spa thú cưng**. Nhận một bé lên bàn, cân để biết bậc giá,
chốt menu, làm đủ tám bước spa theo thứ tự, xử lý mấy pha bé làm khó, rồi trả
về cho chủ thơm tho.

> Đây **không phải** game giao – nhận. Không có chuyện nhận một món hàng rồi trả
> lại. Mỗi lượt chỉ có **một bé** trên bàn và bạn tập trung hẳn vào bé đó.

## Chạy

Không cần cài gì, không có bước build:

```bash
cd pet-spa
python -m http.server 8080
```

Mở `http://localhost:8080`. Mở thẳng `index.html` cũng chạy được (chỉ mất PWA).

## Ba bước của một lượt

```
BƯỚC 1 — NHẬN BÉ          BƯỚC 2 — LÀM SPA           BƯỚC 3 — TRẢ BÉ
cân bé                    tám khung việc              xem hoá đơn
chốt bậc kg               làm từ trên xuống           đối chiếu phiếu
chốt menu                 xử lý sự cố                 bấm Giao (nút dưới cùng)
xếp phòng (nếu gửi lại)   chọn kiểu + mùi
```

Thanh **1 · 2 · 3** trên đầu màn hình luôn cho biết đang ở đâu.

## Tám khung việc

Đúng thứ tự bàn dụng cụ thật, xếp **từ trên xuống** và **bắt buộc làm theo thứ tự**:

| # | Việc | Thiết bị | Vật tư |
| --- | --- | --- | --- |
| 1 | Cạo chân, bụng, hậu môn | Tông đơ | Lưỡi cạo |
| 2 | Vệ sinh tai | tay | Bộ vệ sinh tai |
| 3 | Cắt & mài móng | Kìm + máy mài | Giấy nhám |
| 4 | Lấy tuyến hôi | tay | Găng tay |
| 5 | Tắm | Bồn + vòi sen | Sữa tắm |
| 6 | Sấy + chải tơi lông | Máy sấy + lược | Khăn tắm |
| 7 | Cắt tạo kiểu | Kéo tạo kiểu | – |
| 8 | Bôi nước hoa | tay | 1 chai nước hoa |

## Ba menu, giá tính theo cân

Y như bảng giá dán tường tiệm thật: **ba menu × bốn bậc kg**.

| Menu | Gồm những bước | Ghi chú |
| --- | --- | --- |
| **Vệ sinh cơ bản** | 1 – 4 | cắt móng, mài móng, vệ sinh tai, tuyến hôi. **Không tắm** |
| **Tắm** | 1 – 6 + 8 | vệ sinh cơ bản **+ tắm**, sấy chải, bôi nước hoa |
| **Tắm + cắt tỉa** | 1 – 8 | vệ sinh cơ bản **+ tắm + cắt tạo kiểu** |

Bậc cân: **dưới 5kg · 5–10kg · 10–20kg · trên 20kg**.

Phải **cân bé** rồi tự bấm đúng bậc. Bấm sai bậc là tính sai tiền — chủ nuôi
phát hiện ngay lúc xem hoá đơn và trừ sao.

Bé càng nặng thì mọi bước càng lâu, nên bé to vừa được giá cao vừa chiếm bàn lâu.

## Tạo kiểu và nước hoa

**Ba kiểu**: gấu bông · mùa hè · kiểu thiết kế. Chủ xin kiểu nào thì phải cắt
đúng kiểu đó — cắt xong là không sửa lại được. Ba kiểu nhìn khác nhau rõ ở
**dáng ngoài** của bé, không chỉ khác chữ.

Kiểu thiết kế khó nhất và lâu nhất; muốn ăn 5 sao thì phải nâng **tay nghề**
bằng cách lên cấp kéo tạo kiểu.

**Ba mùi nước hoa**: mùa hè · mùa thu · mùa đông. Mỗi mùi là một chai riêng
trong kho, bôi sai mùi là chủ phàn nàn.

## Bé sẽ làm khó bạn

Giữa lúc đang làm, bé có thể sinh chuyện. Mỗi thứ cần **đúng một món**, bấm sai
là mất món đó và bé càng cáu; để hết giờ đếm ngược thì bé tụt kiên nhẫn rất nhanh.

| Chuyện | Cần | Ghi chú |
| --- | --- | --- |
| Bé đói bụng | Suất ăn | **thu thêm tiền** — đây là một khoản lãi thật |
| Bé dữ, chực cắn | Bánh thưởng | dỗ cho bé bình tĩnh lại |
| Bé tè bậy trên bàn | Bộ dọn vệ sinh | không dọn là bé nằm lên chỗ bẩn |

Mua **máy cho ăn tự động** thì bé đói là máy rót suất ăn — **ăn là ăn hết**,
không bỏ mứa, xử lý xong ngay và còn được tip thêm.

## Thiết bị: ba cấp mỗi thứ

Bàn dụng cụ xếp từ trên xuống đúng dòng chảy công việc. Cấp 1 có sẵn từ đầu.

| Thiết bị | Lên cấp được gì |
| --- | --- |
| Tông đơ | nhanh hơn, ít rung nên bé bớt sợ |
| Kìm cắt móng + máy mài | nhanh hơn, không lo cắt vào thịt |
| Bồn tắm + vòi sen | nhanh hơn, nước luôn ấm |
| **Máy sấy công nghiệp** | **sấy nhanh hơn + tiếng ồn thấp hơn** |
| Lược chải lông | gỡ rối gọn, bé không bị giật lông |
| **Kéo tạo kiểu** | **nâng tay nghề** — kiểu khó cũng làm đẹp, tip cao hơn |

Tiếng ồn là thứ làm bé mất bình tĩnh nhanh nhất, nên máy sấy là món nên lên cấp
sớm. Mua thêm **dàn nhạc thư giãn** và **máy lạnh** thì bé dễ chịu hơn hẳn.

## Lưu trú sau spa

Từ cấp 3, có chủ gửi bé lại sau khi làm spa:

- **Gửi trong ngày** → Phòng thường là đủ
- **Gửi qua đêm** → bắt buộc phải có **Phòng Deluxe** trở lên

Nâng cấp hạng phòng lên **Deluxe** rồi **VIP** để nhận được đơn qua đêm và thu
phụ thu cao hơn. Chưa có phòng qua đêm thì game **không sinh** đơn qua đêm — sẽ
không có đơn nào bạn không thể làm đúng.

## Lớp học cho chủ nuôi

Mở lớp **Học chải lông** và **Học cắt móng** bằng tiền. Mở rồi thì từ cấp 4 có
chủ xin học luôn khi tới làm spa: thêm một khoản không tốn vật tư, nhưng phải
dạy xong mới giao bé được.

## Chủ nuôi: người dễ, người khó

| Kiểu | Ảnh hưởng |
| --- | --- |
| Dễ tính | chờ được lâu hơn 45%, chấm sao rộng tay |
| Bình thường | làm đúng là hài lòng |
| Khó tính | soi từng chi tiết, sai một thứ nhỏ là trừ sao |
| Đang vội | kiên nhẫn chỉ bằng 55% người khác |
| Hay đổi ý | đang làm dở thì đổi yêu cầu |

Hai ngày đầu chỉ gặp người dễ tính và bình thường, cho quen tay.

## Cấp độ

| Cấp | Ngày | Mở thêm |
| --- | --- | --- |
| 1 | 1 | menu Vệ sinh cơ bản + Tắm |
| 2 | 5 | menu Tắm + cắt tỉa: có tạo kiểu và chọn mùi nước hoa |
| 3 | 14 | chủ gửi bé lại sau spa, nâng cấp hạng phòng |
| 4 | 26 | lớp học cho chủ nuôi, khách khó tính nhiều hơn |

Một ngày = **4 phút thật** (08:00 → 19:00 trong game). Một bé ngốn khoảng
**30 giây**, nên cả tiệm chỉ làm được chừng **10–13 bé mỗi ngày** — hàng chờ chỉ
giữ 4 bé, đông hơn là khách bỏ đi.

## Bốn cách để PetPal mời tiệm lên sàn

Làm xong trọn **một cách bất kỳ** là mở, **không cần đủ cả bốn**.

| Cách | Hai điều kiện |
| --- | --- |
| **1 · Mở tiệm đủ lâu** | mở cửa 20 ngày **+** giữ từ 4,0★ |
| **2 · Được khen nhiều** | 150 lượt đánh giá **+** giữ từ 4,5★ |
| **3 · Làm ăn lớn** | tổng lãi 15 triệu **+** làm cho 250 bé |
| **4 · Chịu đầu tư** | thuê bạn trực đơn app **+** mua 5 nâng cấp tiệm |

Mở rồi vẫn phải giữ trên **3,7★**, tụt dưới là app tạm ngưng đẩy đơn.

## Mỗi bé một ngoại hình riêng

Tám giống, và **hai bé cùng giống không bao giờ trông giống nhau**. Mỗi bé có
một số seed riêng, sinh ra: sắc lông lệch đi một chút, hoạ tiết mặt, màu mắt,
màu vòng cổ, độ nghiêng tai, có tàn nhang hay không, mõm trắng hay không, chóp
tai sẫm hay không, búi lông trên đỉnh đầu. Gặp hai con golden trong cùng một
ngày là nhận ra ngay hai con khác nhau.

Chỉ vẽ **cái đầu**, nhưng vẽ dày: lông nhiều lớp có gradient, tơ lông tỉa quanh
viền, mắt có tròng và hai đốm sáng, mũi có lỗ mũi, tai có vành trong.

Ngoại hình còn **đổi theo trạng thái** trong lúc làm: bẩn → đầy bọt → ướt sũng →
sấy bông → tạo kiểu → thơm tho, cài thêm nơ lúc trả bé.

| Giống | Cân | Tính |
| --- | --- | --- |
| Poodle | 3–7kg | kiểu cách, rất thích được tỉa lông |
| Phốc sóc | 2–5kg | nhỏ mà hét to, hay nhảy khỏi bàn |
| Pug | 6–10kg | lười, thở phì phò, ngồi yên cho làm |
| Beagle | 9–14kg | mũi thính, hít hà mọi thứ trên bàn |
| Corgi | 10–15kg | nghịch, cái đuôi cụt lắc suốt |
| Husky | 18–27kg | khoẻ như trâu, mê nước, hét cả buổi |
| Golden | 24–34kg | dễ chịu nhất nhà, làm gì cũng chịu |
| Labrador | 26–36kg | hiền, to con, tắm tốn nhiều sữa tắm |

## Cấu trúc

| File | Nội dung | Dòng |
| --- | --- | --- |
| `index.html` | khung trang, nạp 3 file js, khai báo PWA | 56 |
| `css/style.css` | toàn bộ giao diện + hoạt ảnh | ~990 |
| `js/art.js` | chân dung đầu chó, bộ icon, hình vật tư, hạt hiệu ứng | ~670 |
| `js/data.js` | menu, bước spa, thiết bị, vật tư, sự cố, cấu hình, `cfgSelfCheck()` | ~590 |
| `js/game.js` | trạng thái, vòng lặp, giao diện, kinh tế, âm thanh | ~1250 |
| `sw.js` | service worker (offline + cài lên máy) | 92 |
| `dev/artsheet.html` | xem 8 giống × 6 bé, 7 trạng thái, biểu cảm, vật tư, icon | — |
| `dev/sim.mjs` | **trình mô phỏng chạy bằng Node — chạy sau mỗi lần sửa số** | ~195 |

**Tech stack: vanilla JS, không framework, không build step.** Cỡ dự án này thêm
React/Vite chỉ tốn thêm bước build mà không được gì — mở file là chạy, sửa file
là thấy ngay.

## Kiểm thử

```bash
node dev/sim.mjs 30
```

Nạp thẳng ba file js vào một môi trường DOM giả rồi chơi hộ một **người chơi
hoàn hảo** suốt 30 ngày: nhận bé, cân, chốt đúng bậc giá và đúng menu, làm đủ
tám bước theo thứ tự, xử lý sự cố bằng đúng món, cắt đúng kiểu, bôi đúng mùi,
xếp đúng phòng rồi giao.

**Bốn con số phải luôn đạt** (không đạt thì `exit code` khác 0):

| Chỉ số | Phải bằng | Nghĩa là |
| --- | --- | --- |
| `cfgSelfCheck` | OK | không có bảng nào trỏ tới thứ đã bị xoá |
| `errors` | 0 | không ngoại lệ nào trong suốt 30 ngày |
| `impossible` | 0 | không sinh ra đơn mà người chơi **không thể** làm đúng |
| `lượt sai` | 0 | người chơi hoàn hảo thì không được có lỗi nào bị tính |

Lần chạy gần nhất (30 ngày): tất cả đạt, sao trung bình **3,99**, khoảng
**10–13 bé/ngày**, lãi ngày 1 khoảng **1 triệu** lên **3–5 triệu** ở ngày 30,
PetPal mở quanh ngày 20.

Xem toàn bộ hình vẽ: mở `dev/artsheet.html`.

## Lưu tiến trình

`localStorage`, khoá `petSpa2`. Cấu hình chủ tiệm dùng khoá `petSpaOwner`.

---

# Deploy

Trang tĩnh thuần, không build step, không backend. Kéo thả lên bất cứ host tĩnh
nào là chạy.

**Vercel** (đang dùng — project `spa-thu-cung`, đã nối git):

Push lên `main` là **tự deploy production**, không cần chạy gì thêm.
Muốn deploy tay thì:

```bash
npx vercel --prod
```

**Netlify**: mở <https://app.netlify.com/drop>, kéo nguyên thư mục vào khung.

Nếu nối với Git thì cấu hình: **Build command để trống**, **Output directory `.`**,
**Framework preset None**. Đừng để nó tự đoán framework — dự án này không có
`package.json` nên mọi preset đều sai.

File `vercel.json` / `netlify.toml` đã lo phần header cache. Phần quan trọng nhất
là **`sw.js` phải `no-cache`**: nếu service worker bị cache, người chơi kẹt ở bản
cũ và không bao giờ nhận được cập nhật — đây là lỗi kinh điển khi deploy PWA.

## Khi cập nhật game

Sửa code xong nhớ **tăng `VERSION` trong `sw.js`** rồi deploy lại.

Không tăng cũng không sao — HTML dùng network-first và file tĩnh dùng
stale-while-revalidate nên bản mới vẫn tới, chỉ chậm hơn một nhịp. Tăng version
là để dọn cache cũ cho sạch.

## PWA

Đã gắn sẵn `manifest.webmanifest`, `sw.js` và 3 icon. Sau khi deploy lên HTTPS:

- **Android/Chrome**: mở web → menu ⋮ → *Cài đặt ứng dụng*
- **iOS/Safari**: mở web → nút Chia sẻ → *Thêm vào MH chính*

Game tự mời cài: có nút ở màn chào, và mời một lần sau khi xong phần hướng dẫn.
Android bấm là hiện thẳng hộp thoại cài của Chrome; iOS thì Safari không cho gọi
hộp thoại nên hiện hướng dẫn 3 bước.
