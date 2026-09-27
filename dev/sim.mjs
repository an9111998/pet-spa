/* ============================================================
   TRÌNH MÔ PHỎNG — chạy bằng Node, không cần trình duyệt

       node dev/sim.mjs            (mặc định 25 ngày)
       node dev/sim.mjs 60

   Nó nạp thẳng ba file js của game vào một môi trường có DOM giả, rồi
   chơi hộ một "người chơi hoàn hảo": nhận bé, cân, chốt đúng bậc giá và
   đúng menu, làm đủ tám bước theo thứ tự, xử lý sự cố bằng đúng món,
   cắt đúng kiểu, bôi đúng mùi, xếp đúng phòng rồi giao.

   Ba con số phải luôn đạt:
     errors     = 0   — không được có ngoại lệ nào
     impossible = 0   — không sinh ra đơn mà người chơi không thể làm đúng
     cfg        = OK  — cfgSelfCheck() trả mảng rỗng

   Vì sao cần: bản khách sạn trước đây từng sinh ~38% đơn bất khả thi mà
   game vẫn chạy bình thường, không ai phát hiện cho tới khi có trình mô
   phỏng. Đây chính là cái lưới đó.
   ============================================================ */

import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DAYS = Number(process.argv[2] || 25);

/* ---------- DOM giả: chỉ cần đủ để game không ném lỗi ---------- */
function fakeEl() {
  const el = {
    innerHTML: '', textContent: '', hidden: false, onclick: null, onchange: null,
    style: { setProperty() { }, width: '', background: '', left: '', top: '' },
    classList: { add() { }, remove() { }, contains: () => false },
    dataset: {},
    querySelectorAll: () => [],
    querySelector: () => null,
    appendChild() { }, remove() { },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 10, height: 10 }),
    focus() { }
  };
  return el;
}
const store = new Map();
const ctx = createContext({});
const win = ctx;
Object.assign(ctx, {
  window: win,
  globalThis: win,
  console,
  performance: { now: () => Date.now() },
  Math, Date, JSON, Object, Array, String, Number, Boolean, isFinite, parseInt, parseFloat,
  Promise, Set, Map, Error, RangeError, TypeError,
  localStorage: {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k)
  },
  navigator: { userAgent: 'node', maxTouchPoints: 0, standalone: false },
  location: { protocol: 'http:', origin: 'http://sim' },
  matchMedia: () => ({ matches: false }),
  addEventListener() { },
  scrollTo() { },
  setTimeout: () => 0, clearTimeout() { },
  setInterval: () => 0, clearInterval() { },   /* vòng lặp do sim tự gọi tick() */
  requestAnimationFrame: () => 0,
  document: {
    getElementById: () => fakeEl(),
    createElement: () => fakeEl(),
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener() { },
    body: fakeEl()
  }
});

/* Trong một script của vm, chỉ `var` và khai báo hàm mới gắn vào global;
   `const`/`let` nằm trong phạm vi từ vựng riêng nên sim không thấy được.
   Game viết theo lối khai báo ở cột 0 cho mọi thứ dùng chung, nên đổi đúng
   những dòng ở cột 0 là đủ — khai báo bên trong hàm luôn có thụt lề. */
const toGlobal = src => src.replace(/^(const|let) /gm, 'var ');
for (const f of ['js/art.js', 'js/data.js', 'js/game.js']) {
  runInContext(toGlobal(readFileSync(join(ROOT, f), 'utf8')), ctx, { filename: f });
}

const G = ctx;
const cfgBad = G.cfgSelfCheck();

/* ---------- người chơi hoàn hảo ---------- */
let errors = [], impossible = 0, wrongAny = 0;
const missKinds = {}, impKinds = {};
const guard = (what, fn) => { try { return fn() } catch (e) { errors.push(`${what}: ${e.message}`) } };

G.load();
G.S = G.fresh();
const rows = [];

for (let day = 1; day <= DAYS; day++) {
  /* Nhập hàng như người chơi tỉnh táo: chỉ đủ cho số bé dự kiến làm được,
     cộng một chút đệm. Nhập bừa cho đầy kho thì ngày đầu đã hết tiền —
     và chính chỗ này là phép thử xem vốn ban đầu có đủ hay không. */
  const T = day < 4 ? 14 : day < 10 ? 20 : 26;
  const target = { spa: T, nhoa: Math.ceil(T / 2), suco: 12, luutru: G.level() >= 3 ? 5 : 0 };
  G.SUPPLY_KEYS.forEach(k => {
    const want = (target[G.SUPPLY[k].grp] || 0) - G.qty(k);
    if (want > 0) {
      const cost = want * G.CFG.cost[k];
      G.S.money -= cost;
      G.S.cur.ing[k] = (G.S.cur.ing[k] || 0) + cost;
      G.addStock(k, want);
    }
  });
  /* mở dần thiết bị và tiệm y như người chơi thật sẽ làm */
  if (day === 6) { G.S.tool.say = 1; G.S.upg.nhac = true }
  if (day === 12) { G.S.tool.voi = 1; G.S.tool.keo = 1; G.S.room.deluxe = true }
  if (day === 18) { G.S.tool.say = 2; G.S.tool.kim = 1; G.S.upg.lanh = true; G.S.cls.hocchai = true }
  if (day === 24) { G.S.tool.keo = 2; G.S.tool.tongdo = 1; G.S.room.vip = true; G.S.cls.hocmong = true }

  guard('startDay', () => G.startDay());
  const R = G.R;
  /* Ngày có quà hoặc có sự cố thì startDay() tạm dừng game và mở hộp thoại;
     người thật bấm "Bắt đầu ngày mới" là chạy lại. Sim không có hộp thoại nên
     phải tự gỡ dừng — không gỡ thì đúng những ngày đó phục vụ được 0 bé. */
  if (R.paused) guard('resume', () => G.resumeGame());

  /* 10 nhịp tick mỗi giây game, chạy cho tới khi endDay() tự tắt R.running.
     Trần phải THẬT rộng: sau 19:00 còn phải làm nốt cả hàng chờ, mà mỗi bé
     ngốn ~30 giây. Đặt trần sát quá thì vòng lặp hết lượt trước khi endDay
     kịp chạy, S.day không tăng, và mọi con số sau đó đều sai lệch. */
  for (let step = 0; step < 20000; step++) {
    if (!R.running) break;
    guard('tick', () => G.tick());
    if (!R.running) break;

    /* --- quyết định của người chơi --- */
    if (R.inc) { guard('fixInc', () => G.fixInc(R.inc.id)); continue }
    if (!R.cur) {
      if (R.queue.length) guard('takePet', () => G.takePet(R.queue[0].id));
      continue;
    }
    const c = R.cur;
    if (R.phase === 1) {
      if (!c.weighed) { c.weighed = true; continue }
      if (!c.pickTier) { c.pickTier = c.tierId; continue }
      if (!c.pickMenu) { c.pickMenu = c.menu; continue }
      if (c.stay && !c.pickRoom) {
        const ok = G.ROOMS.filter(r => G.S.room[r.id] && (!G.STAYS[c.stay].need || r.over));
        if (!ok.length) { impossible++; impKinds.phong = (impKinds.phong||0)+1; c.pickRoom = "thuong" }   /* khách gửi qua đêm mà chưa có phòng */
        else c.pickRoom = ok[0].id;
        continue;
      }
      guard('gotoSpa', () => G.gotoSpa());
      continue;
    }
    if (R.phase === 2) {
      if (R.busy) continue;
      const id = G.nextStep(c);
      if (!id) continue;
      if (id === 'kieu' && !c.pickStyle) { c.pickStyle = c.style; continue }
      if (id === 'nhoa' && !c.pickScent) {
        if (G.qty(G.SCENTS[c.scent].item) <= 0) { impossible++; impKinds.nuochoa = (impKinds.nuochoa || 0) + 1; c.pickScent = G.SCENT_IDS.find(s => G.qty(G.SCENTS[s].item) > 0) || c.scent }
        else c.pickScent = c.scent;
        continue;
      }
      const st = G.stepOf(id);
      const lack = (st.need || []).filter(k => G.qty(k) <= 0);
      if (lack.length) { impossible++; impKinds['hết_' + lack[0]] = (impKinds['hết_' + lack[0]] || 0) + 1; c.done[id] = true; continue }
      guard('doStep', () => G.doStep(id));
      continue;
    }
    if (R.phase === 3) {
      if (c.cls && !c.clsDone) { if (!R.busy) guard('cls', () => G.startBusy({ cls: true, total: .2 })); continue }
      const miss = guard('check', () => G.checkMistakes(c)) || [];
      if (miss.length) { wrongAny++; miss.forEach(m => missKinds[m.k] = (missKinds[m.k] || 0) + 1) }
      guard('giveBack', () => G.giveBack());
    }
  }

  const r = G.S.history[G.S.history.length - 1];
  if (r) rows.push({
    day: r.day, served: r.served, lost: r.lost,
    star: r.starN ? +(r.starSum / r.starN).toFixed(2) : 0,
    profit: Math.round(G.recRev(r) - G.recCost(r)),
    money: Math.round(G.S.money)
  });
  if (G.S.money < 0) { errors.push(`phá sản ở ngày ${day}`); break }
}

/* ---------- báo cáo ---------- */
const f = n => (n / 1000).toFixed(0) + 'k';
console.log('\n ngày  bé  mất  sao   lãi        két');
rows.forEach(r => console.log(
  String(r.day).padStart(4), String(r.served).padStart(4), String(r.lost).padStart(4),
  String(r.star.toFixed(2)).padStart(5), f(r.profit).padStart(9), f(r.money).padStart(11)));

const avgStar = rows.filter(r => r.star).reduce((a, r) => a + r.star, 0) / Math.max(1, rows.filter(r => r.star).length);
console.log('\n--- kết quả ---');
console.log('cfgSelfCheck :', cfgBad.length ? 'LỖI\n  - ' + cfgBad.join('\n  - ') : 'OK');
console.log('errors       :', errors.length ? errors.length + '\n  - ' + [...new Set(errors)].slice(0, 12).join('\n  - ') : 0);
console.log('impossible   :', impossible, Object.keys(impKinds).length ? JSON.stringify(impKinds) : '');
console.log('lượt sai     :', wrongAny, Object.keys(missKinds).length ? JSON.stringify(missKinds) : '', '(người chơi hoàn hảo thì phải là 0)');
console.log('tổng bé      :', G.S.served);
console.log('sao trung bình:', avgStar.toFixed(2));
console.log('tổng lãi     :', f(G.S.totalProfit || 0));
console.log('đơn PetPal   :', G.S.online ? 'đã mở' : 'chưa mở');

process.exitCode = (cfgBad.length || errors.length || impossible || wrongAny) ? 1 : 0;
