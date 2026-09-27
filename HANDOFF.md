# Bàn giao — Spa Thú Cưng

Đọc file này là nối lại được mạch làm việc ngay, không cần đọc lại lịch sử chat.
Cơ chế chi tiết nằm ở `README.md`; file này chỉ nói **trạng thái, cạm bẫy và việc còn lại**.

**Cập nhật:** 2026-09-27 · Game `v2.0` · Service worker `v2.0.0`
**Trạng thái:** chạy được, đã push GitHub, **đã deploy public**.

| | |
| --- | --- |
| Bản chạy thật | <https://spa-thu-cung.vercel.app> |
| Mã nguồn | <https://github.com/an9111998/pet-spa> (nhánh `main`) |
| Vercel project | `spa-thu-cung`, team `thesis-demo` |

> **Vì sao tên project khác tên repo.** Vercel gán `<tên-project>.vercel.app` nếu
> tên đó còn trống trên toàn hệ thống, không thì thêm hậu tố slug team. Repo tên
> `pet-spa` nhưng `pet-spa.vercel.app` đã có người khác chiếm, nên project tên
> `pet-spa` chỉ nhận được `pet-spa-thesis-demo.vercel.app`. Đổi tên project sang
> `spa-thu-cung` (còn trống) là ra domain sạch. Project `pet-spa` cũ đã xoá.
>
> **Cách kiểm một domain còn trống hay không:** `curl -o /dev/null -w '%{http_code}'
> https://<tên>.vercel.app`. `*.vercel.app` là DNS wildcard nên **404 = còn trống**,
> **200 = đã có người**. Rất dễ đọc ngược.

---

## 1. Game này là gì, và nó KHÁC gì bản khách sạn

`D:\games\pet-hotel` là game giao–nhận: nhiều bé cùng lúc, chọn phòng + bữa ăn +
dịch vụ trong một khay rồi bấm Giao. Nhận xét về bản đó là "giống game bán hàng,
nhận một món hàng rồi trả về".

Bản này viết mới hoàn toàn theo hướng ngược lại:

- **Mỗi lượt đúng MỘT bé** trên bàn. Không có khay nhiều bé.
- **Ba bước rõ ràng**: Nhận bé → Làm spa → Trả bé. Có thanh `1 · 2 · 3` trên đầu.
- **Tám khung việc** xếp từ trên xuống đúng thứ tự bàn dụng cụ thật, bắt buộc làm
  theo thứ tự.
- **Tiền tính theo cân nặng**, không phải giá chết: phải cân bé rồi tự bấm đúng
  bậc kg.
- **Nút hành động chính dán ở đáy màn hình**, luôn bấm được mà không phải cuộn.

Hai game dùng chung kiến trúc (vanilla JS, PWA tĩnh, localStorage) nhưng **không
chia sẻ file nào**. Sửa bên này không ảnh hưởng bên kia.

---

## 2. Chạy và kiểm tra

```bash
cd D:\games\pet-spa
python -m http.server 8140      # mở http://localhost:8140
node dev/sim.mjs 30             # trình mô phỏng, KHÔNG cần trình duyệt
```

`dev/artsheet.html` xem toàn bộ hình vẽ: 8 giống × 6 bé khác nhau, 7 trạng thái
của một lượt, các biểu cảm, hình vật tư, bộ icon.

### Bốn con số phải luôn đạt

`node dev/sim.mjs 30` trả `exit code` khác 0 nếu bất kỳ con số nào lệch:

| Chỉ số | Phải bằng | Không đạt nghĩa là |
| --- | --- | --- |
| `cfgSelfCheck` | OK | có bảng trỏ tới thứ đã bị xoá |
| `errors` | 0 | có ngoại lệ trong lúc chơi |
| `impossible` | 0 | game sinh đơn mà người chơi **không thể** làm đúng |
| `lượt sai` | 0 | người chơi làm đúng hết mà vẫn bị tính lỗi |

Số liệu lần chạy cuối (2026-09-27, 30 ngày): tất cả đạt, sao trung bình **3,99**,
**10–13 bé/ngày**, lãi ngày 1 khoảng **1 triệu** lên **3–5 triệu** ở ngày 30,
PetPal mở quanh ngày 20.

> `dev/sim.mjs` chạy bằng Node, nạp thẳng ba file js vào một DOM giả. Nó thay cho
> `dev/sim.js` của bản khách sạn (phải dán vào console trình duyệt) — chạy được từ
> terminal nên gắn vào CI hay chạy sau mỗi lần sửa đều dễ.

---

## 3. Quyết định thiết kế — đừng đổi mà không cân nhắc

**Giá là chỉ số TƯƠNG ĐỐI, không phải mốc tiền tuyệt đối.** `CFG.priceWarn` và
`CFG.priceRefuse` so bảng giá của người chơi với giá gợi ý. Bản khách sạn dùng
mốc tuyệt đối (`itemCap`) và bị lỗi: mở khoá phòng Penthouse giá 330k trong khi
trần chê đắt là 320k → mở món đắt nhất là tự nhiên mất 80% khách, không có cảnh
báo nào. Cách tương đối làm lỗi đó **không thể xảy ra**.

**Một bàn, nên nhịp khách phải xấp xỉ nhịp làm việc.** `CFG.spawnGap = 20` giây
vì một bé ngốn ~30 giây. Lúc đầu để 7,5 giây như game nhiều bàn thì ngày 1 phục
vụ 8 bé mà mất 27 khách — người chơi chỉ thấy mình đang thua.

**Hàng chờ tụt kiên nhẫn chậm hơn bé trên bàn** (`.55` và `.35` so với `1`).
Để tụt bằng nhau thì bé nào cũng cạn trước khi tới lượt.

**`fairPrice()` phải kể ĐỦ mọi khoản chính đáng**, kể cả suất ăn giữa buổi và phụ
thu hạng phòng. Bỏ sót một khoản là chỉ số giá bị đẩy lên oan, rồi chủ nuôi chê
đắt dù người chơi để nguyên giá gợi ý. Trình mô phỏng bắt được đúng lỗi này.

**`genPet()` phải trừ vật tư mà các bé ĐANG CHỜ sẽ dùng** (`reserved()`). Chỉ xem
`qty(k) > 0` thì bốn bé xếp hàng cùng đòi một lưỡi cạo cuối cùng: bé đầu làm xong
là ba bé sau thành đơn không thể hoàn thành.

**`genPet()` chỉ sinh đơn gửi qua đêm khi tiệm đã có phòng qua đêm.** Không kiểm
thì người chơi nhận một đơn không có cách nào xếp đúng.

**Ba kiểu tạo kiểu phải khác nhau ở DÁNG NGOÀI, không chỉ khác chữ.** Người chơi
cắt được sai kiểu nên phải nhìn ra ngay. Mỗi kiểu chỉnh ba thứ cùng lúc: biên độ
gợn của viền đầu (`styleAmp`), cỡ tai (`styleEar`), lớp lông sau đầu + chỏm trên
(`styleBack` / `styleTop`). Lúc đầu chỉ dán thêm hình lên mặt thì bị tai che, ba
kiểu trông y nhau.

**Lông đen tuyền và mặt nạ sẫm sẽ ăn mất khuôn mặt.** `BREEDS.lab` có cờ `dark`
để `look.light` luôn dương; mặt nạ Pug cố ý bắt đầu **dưới** tầm mắt. Vẽ đúng màu
thật thì Labrador ra một cục đen không thấy mắt mũi.

**Bọt sữa tắm chỉ đắp lên đỉnh đầu và hai bên, chừa mặt ra.** Trùm hết thì bé
thành một cục mây, không còn biểu cảm.

**Giọt nước phải nhỏ xuống dưới hàm.** Vẽ đè lên má thì y như hai dòng nước mắt.

**Tai xoăn (Poodle, Phốc) đặt lệch ra ngoài mép đầu.** Đặt vào trong và vẽ to thì
hai chùm ăn hết hai bên mặt, bé chỉ còn một dải mặt hẹp ở giữa.

**Nút hành động dán đáy cần `.stage { padding-bottom: 76px }`.** Không chừa chỗ
thì nó đè vĩnh viễn lên hai khung việc cuối của bàn dụng cụ.

**`dev/` CỐ Ý không bị gitignore.** Bản khách sạn gitignore cả `dev/` nên clone ở
máy khác là mất sạch công cụ kiểm tra. Ở đây `dev/` vào repo, chỉ bị loại khỏi
bản deploy bằng `.vercelignore`.

**Service worker dùng ĐÚNG MỘT cache**, HTML network-first. Hai điều này giữ y
như bản khách sạn vì đã trả giá để học: tách SHELL/RUNTIME thì `caches.match()`
tìm trong mọi cache nên luôn vớ bản cũ, file tĩnh không bao giờ cập nhật.

**Âm thanh mặc định tắt.** Lúc tắt thì `AudioContext` không được tạo.

---

## 4. Bug đã gặp — coi như bài học

Tất cả đã sửa. Ghi lại vì loại nào cũng **im lặng**, game vẫn chạy bình thường.

| Bug | Vì sao khó thấy |
| --- | --- |
| Ngày có quà / sự cố thì `startDay()` tạm dừng game chờ bấm hộp thoại. Trình mô phỏng không có hộp thoại nên đúng những ngày đó phục vụ **0 bé**, lãi âm | Không ngoại lệ nào, chỉ là vài ngày rỗng lẫn trong bảng số liệu |
| Vòng lặp của trình mô phỏng đặt trần sát thời lượng ngày, hết lượt **trước khi** `endDay()` kịp chạy → `S.day` không tăng, mọi con số sau đó sai lệch | Bảng kết quả in ra ngày 1 lặp lại 23 lần, rất dễ đọc vội cho qua |
| `fairPrice()` thiếu khoản suất ăn và phụ thu phòng → người chơi hoàn hảo vẫn bị chê đắt | Chỉ hiện ra khi bé đói giữa buổi, tức là ngẫu nhiên |
| Bé trong hàng chờ cùng đòi một món vật tư cuối cùng → đơn bất khả thi | Không lỗi, chỉ là không ai làm đúng được |
| Ba kiểu tạo kiểu vẽ sau `faceMark` nhưng trước tai → bị tai che, ba kiểu trông y nhau | Có đủ ba nút bấm, có trừ tiền khác nhau, nên trông như đã xong |
| Labrador lông `#544e5e` và mặt nạ Pug lấy màu từ `nose` → mất hẳn mắt mũi | Hình vẫn vẽ ra, chỉ là tối thui |
| Deploy xong nhưng Vercel bật **Deployment Protection**, mọi URL trả 302 sang trang đăng nhập | `curl` trả 302 chứ không phải lỗi, mở bằng trình duyệt đang đăng nhập Vercel thì vẫn thấy site bình thường |

---

## 5. Deploy

Vercel project `spa-thu-cung` (team `thesis-demo`) **đã nối git** với repo
`an9111998/pet-spa`, nhánh `main`. **Push lên `main` là tự deploy production.**
Không phải chạy gì bằng tay nữa.

### Nếu phải nối lại từ đầu

Nối git cần **hai** bước trên web, và chúng là hai thứ khác nhau. Làm xong bước
một rồi tưởng đã xong là chuyện đã xảy ra — nhận ra nhờ thông báo lỗi **đổi nội
dung**, chứ không phải vì nó hết lỗi:

| Bước | Làm ở đâu | Thiếu nó thì API trả |
| --- | --- | --- |
| 1. **Login Connection** | <https://vercel.com/account/login-connections> → GitHub → Connect | `You need to add a Login Connection to your GitHub account first` |
| 2. **Cài GitHub App của Vercel** | <https://github.com/apps/vercel> → Install → chọn `an9111998` → cho quyền trên `pet-spa` | `To link a GitHub repository, you need to install the GitHub integration first` |

Xong hai bước đó thì nối bằng:

```
POST /v9/projects/spa-thu-cung/link?teamId=<team>
{ "type": "github", "repo": "an9111998/pet-spa" }
```

> Đừng dùng `create_git_project` để nối một project **đã tồn tại** — nó chỉ tạo
> project mới, không nối lại project cũ đang bỏ trống. Tạo project mới là mất
> domain `spa-thu-cung.vercel.app` đang chạy.

### Deploy tay (khi git hỏng hoặc cần thử nhanh)

Upload từng file qua REST API:
`POST /v2/files` mỗi file kèm header `x-vercel-digest: <sha1>`, rồi
`POST /v13/deployments` với `files: [{file, sha, size}]`, `target: production` và
`projectSettings` để `null` hết (trang tĩnh, không có bước build).

Script làm việc đó nằm **ngoài repo**, tại `~/vercel-deploy.mjs`:

```bash
node ~/vercel-deploy.mjs D:/games/pet-spa spa-thu-cung
```

Tham số thứ hai là **tên project trên Vercel**, không phải tên thư mục — đưa sai
tên là nó tạo ra một project mới thay vì cập nhật project đang chạy.

Nó đặt ngoài repo cố ý, vì phải đọc file token OAuth trong thư mục cấu hình cục
bộ của máy — đường dẫn đó không nên nằm trong một repo public.

> **Cạm bẫy:** project mới trên Vercel bật sẵn Deployment Protection, mọi URL trả
> **302** sang trang đăng nhập Vercel. Tắt bằng
> `PATCH /v9/projects/<tên>?teamId=...` với `{"ssoProtection": null}`.
> Đã tắt cho `spa-thu-cung`, nhưng **tạo project mới là gặp lại** — và nó rất dễ
> lọt, vì trình duyệt của bạn đang đăng nhập Vercel nên mở link vẫn thấy site bình
> thường, chỉ người ngoài mới bị chặn. Luôn kiểm bằng `curl`, đừng kiểm bằng mắt.

Sửa code xong nhớ **tăng `VERSION` trong `sw.js`** (hiện `v2.0.0`) rồi deploy lại.

---

## 6. Việc còn lại

### Ưu tiên cao

- [ ] **Chơi thử trên điện thoại thật.** Tới giờ chỉ verify ở khổ 430×900 bằng
      trình duyệt điều khiển tự động. Chưa ai chạm tay vào thật.
- [x] ~~Nối git cho Vercel~~ — xong, push lên `main` là tự deploy.

### Nên làm

- [ ] Nhạc nền nhẹ. Hiện chỉ có tiếng hiệu ứng, chưa có nhạc — mà tiệm đã có
      nâng cấp "dàn nhạc thư giãn" nên có nhạc thật sẽ khớp hẳn.
- [ ] Màn hình cài đặt trong game: đổi âm lượng, xoá tiến trình.
- [ ] Cân bằng đoạn cuối: tới ngày 30 két đã ~90 triệu mà cả cây nâng cấp chỉ tốn
      ~25 triệu, nên mua hết rồi là tiền mất ý nghĩa. Cần thêm thứ để tiêu, hoặc
      một mốc chi phí lớn ở giai đoạn sau.
- [ ] Thêm giống chó: chỉ tốn một mục trong `BREEDS` (`js/art.js`). Nhớ đặt
      `kg` rơi đúng vào một bậc giá.
- [ ] Ảnh chia sẻ + mã QR để đăng bài (bản khách sạn có `dev/qr.html`, bản này chưa).

### Đã cân nhắc và bỏ

- Nhiều bàn spa cùng lúc: phá đúng cái làm nên game này — tập trung vào một bé.
- Ảnh raster cho các bé: SVG phóng to không vỡ, đổi màu theo seed được, không cần file.
- Tab hoá tám khung việc: cả tám phải nhìn thấy một lượt mới ra cảm giác bàn dụng cụ.

---

## 7. Nhớ làm khi sửa code

1. Chạy `node dev/sim.mjs 30`, xác nhận **cả bốn** con số ở mục 2
2. Mở console trình duyệt xem có cảnh báo `[cấu hình]` không
3. Sửa hình vẽ thì mở `dev/artsheet.html` xem lại cả 8 giống và 7 trạng thái
4. Thêm/xoá vật tư hay bước spa: `cfgSelfCheck()` sẽ báo nếu thiếu hình trong
   `ITEM_ART`, thiếu bước trong `STEPS`, hay có bảng trỏ tới thứ đã xoá
5. Sửa giao diện thì xem lại ở khổ **430×900** (điện thoại), không phải desktop
6. Sửa file tĩnh: tăng `VERSION` trong `sw.js` rồi deploy lại
