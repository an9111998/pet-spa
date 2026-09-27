/* ============================================================
   SPA THÚ CƯNG — logic game
   Vanilla JS, không framework, không bước build, lưu localStorage.

   Khác hẳn game giao–nhận: ở đây MỖI LƯỢT CHỈ MỘT BÉ trên bàn, và
   cả lượt đi theo ba bước rõ ràng:
     Bước 1  nhận bé  — cân, chốt bậc giá, chốt menu
     Bước 2  làm spa  — tám khung việc, làm theo thứ tự trên xuống
     Bước 3  trả bé   — xem hoá đơn rồi bấm Giao (nút nằm dưới cùng)
   ============================================================ */

/* ---------- tiện ích ---------- */
const $ = id => document.getElementById(id);
const fmt = n => (Math.round(n / 100) / 10).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + 'k';
const fmtBig = n => n >= 1e9 ? (n / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + ' tỷ'
  : n >= 1e6 ? (n / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + ' triệu' : fmt(n);
const rnd = a => a[Math.floor(Math.random() * a.length)];
const wpick = (arr, w) => {
  let r = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < arr.length; i++) { r -= w[i]; if (r <= 0) return arr[i] }
  return arr[0];
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ri = (a, b) => a + Math.random() * (b - a);

/* ---------- STATE ---------- */
let S, R = { mode: 'prep', tab: 'kho', plan: {} }, timer = null, uid = 0;

const newRec = d => ({
  day: d, rev: 0, tips: 0, onl: 0, fee: 0, ing: {}, waste: {}, spoil: { n: 0, v: 0 },
  rent: 0, util: 0, tax: 0, wage: 0, served: 0, lost: 0, starSum: 0, starN: 0, sales: {}
});

function fresh() {
  const s = {
    money: CFG.startMoney, day: 1, stock: {}, upg: {}, hired: {},
    tool: {}, room: { thuong: true }, cls: {},
    price: JSON.parse(JSON.stringify(DEF_PRICE)), add: { ...DEF_ADD },
    reviews: [], revTotal: 0, served: 0, best: 0, totalRev: 0, totalProfit: 0,
    online: false, shopName: '', history: [], cur: newRec(1), yearRev: 0, taxYear: 0,
    badPlan: mkBadPlan(1), seenLv: 1
  };
  SUPPLY_KEYS.forEach(k => s.stock[k] = []);
  Object.keys(TOOLS).forEach(k => s.tool[k] = 0);     /* ai cũng bắt đầu ở cấp 1 (index 0) */
  return s;
}

/* ---------- KHO THEO MẺ, CÓ HẠN DÙNG ---------- */
function addStock(k, q) {
  if (!q) return;
  const l = CFG.life[k], exp = l ? S.day + l - 1 : 99999;
  const b = S.stock[k].find(x => x.exp === exp);
  if (b) b.q += q; else { S.stock[k].push({ q, exp }); S.stock[k].sort((a, c) => a.exp - c.exp) }
}
const qty = k => (S.stock[k] || []).reduce((a, b) => a + b.q, 0);
function take(k) {
  const b = (S.stock[k] || []).find(x => x.q > 0);
  if (!b) return false;
  b.q--; S.stock[k] = S.stock[k].filter(x => x.q > 0); return true;
}
function expireStock() {
  const out = [];
  SUPPLY_KEYS.forEach(k => {
    let q = 0;
    S.stock[k] = (S.stock[k] || []).filter(b => { if (b.exp <= S.day) { q += b.q; return false } return true });
    if (q) out.push({ k, q, v: q * CFG.cost[k] });
  });
  return out;
}
const lifeTxt = k => { const l = CFG.life[k]; return l ? (l === 1 ? 'Dùng trong ngày' : 'Để được ' + l + ' ngày') : 'Không hết hạn' };
function soonExp(k) {
  const b = (S.stock[k] || []).find(x => x.q > 0);
  return b && b.exp < 99999 ? b.exp - S.day + 1 : null;
}

/* ---------- LƯU / TẢI ---------- */
function save() { try { localStorage.setItem(SAVE, JSON.stringify(S)) } catch (e) { } }
function loadFrom(d) {
  const f = fresh();
  S = {
    ...f, ...d,
    stock: { ...f.stock, ...d.stock }, tool: { ...f.tool, ...d.tool },
    room: { ...f.room, ...d.room }, cls: { ...f.cls, ...d.cls },
    add: { ...f.add, ...d.add },
    price: MENU_IDS.reduce((a, m) => (a[m] = { ...f.price[m], ...((d.price || {})[m] || {}) }, a), {})
  };
  SUPPLY_KEYS.forEach(k => { if (!Array.isArray(S.stock[k])) S.stock[k] = [] });
  if (!d.cur) S.cur = newRec(S.day);
  if (S.evDay !== S.day) rollDay(S.day);
  if (!d.badPlan) S.badPlan = mkBadPlan(S.day);
  if (S.seenLv == null) S.seenLv = levelOf(Math.max(1, S.day - 1));
}
function load() {
  let raw = null;
  try { raw = localStorage.getItem(SAVE) } catch (e) { }
  if (raw) { try { loadFrom(JSON.parse(raw)); return true } catch (e) { } }
  S = fresh(); return false;
}

/* ============================================================
   THIẾT BỊ
   ============================================================ */
const toolLv = k => clamp(S.tool[k] || 0, 0, 2);
const toolT = k => TOOLS[k].tiers[toolLv(k)];
/* nhân tốc độ của một bước, có tính cả bàn nâng hạ */
function stepSpeed(id) {
  const st = stepOf(id);
  let sp = st.tool ? toolT(st.tool).spd : 1;
  if (id === 'say') sp = (sp + toolT('luoc').spd) / 2;    /* sấy đi cùng chải, lấy trung bình */
  if (S.upg.ban) sp *= 1.12;
  return sp;
}
const stepSec = (id, c) => {
  let s = stepOf(id).base / stepSpeed(id);
  if (id === 'kieu' && c && c.pickStyle) s *= STYLES[c.pickStyle].hard;
  /* bé to thì việc nào cũng lâu hơn */
  if (c) s *= 1 + (TIERS.findIndex(t => t.id === c.tierId)) * .13;
  return s;
};
/* mức tụt kiên nhẫn mỗi giây: 1 là chuẩn, thấp hơn là bé dễ chịu hơn */
function calmFactor(stepId) {
  let f = 1;
  if (S.upg.nhac) f -= .12;
  if (S.upg.lanh) f -= .15;
  if (stepId) {
    const st = stepOf(stepId);
    if (st && st.tool) f -= toolT(st.tool).calm;
    if (st && st.noise) f += .55 * (1 - toolT('say').quiet);   /* máy sấy gào là bé sợ nhất */
  }
  return clamp(f, .35, 2);
}
const skill = () => toolT('keo').qual || 0;

/* ============================================================
   KINH TẾ
   ============================================================ */
const priceMax = v => Math.round(v * CFG.priceMaxM);
const pv = (obj, k, def) => { const v = +obj[k]; return isFinite(v) && v > 0 ? Math.min(v, priceMax(def)) : 0 };
const menuPrice = (m, t) => pv(S.price[m], t, DEF_PRICE[m][t]);
const addPrice = k => pv(S.add, k, DEF_ADD[k]);

/** Hoá đơn của một bé: từng dòng + tổng. Dùng cả ở bước 3 và lúc chấm sao. */
function bill(c) {
  const rows = [];
  if (c.pickMenu && c.pickTier) rows.push({ n: `${MENUS[c.pickMenu].n} · ${tierN(c.pickTier)}`, v: menuPrice(c.pickMenu, c.pickTier), i: MENUS[c.pickMenu].i });
  if (c.pickStyle) rows.push({ n: STYLES[c.pickStyle].n, v: addPrice(c.pickStyle), i: 'scissors' });
  if (c.fed) rows.push({ n: 'Cho bé ăn tại tiệm', v: addPrice('suatan'), i: 'bowl' });
  if (c.stay && c.pickRoom) {
    rows.push({ n: STAYS[c.stay].n, v: addPrice(c.stay === 'dem' ? 'stay_dem' : 'stay_ngay'), i: STAYS[c.stay].i });
    if (c.pickRoom === 'deluxe') rows.push({ n: 'Phụ thu phòng Deluxe', v: addPrice('up_deluxe'), i: 'bed' });
    if (c.pickRoom === 'vip') rows.push({ n: 'Phụ thu phòng VIP', v: addPrice('up_vip'), i: 'crown' });
  }
  if (c.cls) { const cl = CLASSES.find(x => x.id === c.cls); if (cl) rows.push({ n: cl.n, v: addPrice(c.cls), i: cl.i }) }
  return { rows, total: rows.reduce((a, r) => a + r.v, 0) };
}
/** Giá đúng theo phiếu của chủ, dùng làm mốc để biết mình có tính cắt cổ không.
 *  Phải kể ĐỦ mọi khoản chính đáng có trên hoá đơn, kể cả suất ăn giữa buổi và
 *  phụ thu hạng phòng. Bỏ sót một khoản là chỉ số giá bị đẩy lên oan, rồi chủ
 *  nuôi chê đắt dù người chơi để nguyên bảng giá gợi ý. */
function fairPrice(c) {
  let v = DEF_PRICE[c.menu][c.tierId];
  if (c.style) v += DEF_ADD[c.style];
  if (c.fed) v += DEF_ADD.suatan;
  if (c.stay) {
    v += DEF_ADD[c.stay === 'dem' ? 'stay_dem' : 'stay_ngay'];
    if (c.pickRoom === 'deluxe') v += DEF_ADD.up_deluxe;
    if (c.pickRoom === 'vip') v += DEF_ADD.up_vip;
  }
  if (c.cls) v += DEF_ADD[c.cls];
  return v;
}
const priceIdx = c => { const f = fairPrice(c); return f ? bill(c).total / f : 1 };

/** Chỉ số giá của bảng giá hiện tại, dùng lúc khách quyết định có vào tiệm không. */
function boardIdx() {
  let mine = 0, fair = 0;
  MENU_IDS.forEach(m => TIER_IDS.forEach(t => { mine += menuPrice(m, t); fair += DEF_PRICE[m][t] }));
  return fair ? mine / fair : 1;
}

const wageDay = () => STAFF.reduce((a, x) => a + (S.upg[x.id] ? CFG[x.wage] : 0), 0);
const fixed = () => ({ rent: CFG.rent, util: CFG.utilBase + upgCount() * CFG.utilPerUpg });
function rating() {
  const r = S.reviews.slice(0, 40);
  return r.length ? r.reduce((a, x) => a + x.s, 0) / r.length : 4;
}
const revCount = () => Math.max(S.revTotal || 0, S.reviews.length);
const starStr = v => { const f = Math.round(v); return '★'.repeat(f) + '☆'.repeat(5 - f) };
const recRev = r => r.rev + r.tips - r.fee;
const recCost = r => Object.values(r.ing).reduce((a, v) => a + v, 0) + r.rent + r.util + r.tax + r.wage + (r.bad || 0);

/* ---------- CẤP ĐỘ ---------- */
const levelOf = d => { const L = CFG.levels; return d >= L.l4 ? 4 : d >= L.l3 ? 3 : d >= L.l2 ? 2 : 1 };
const level = () => levelOf(S.day);
const menusOpen = () => MENU_IDS.filter(m => MENU_LV[m] <= level());
const dayLen = () => (R && R.running && R.dayLen) || CFG.dayMin;
function gameClock() {
  const tot = dayLen() * 60, el = clamp(1 - R.t / tot, 0, 1), m = 8 * 60 + Math.floor(el * 660 / 5) * 5;
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
}

/* ---------- SỰ KIỆN THEO NGÀY ---------- */
const ev = () => S.evDay === S.day ? S.ev : null;
const evIs = id => { const e = ev(); return !!e && e.id === id };
function mkBadPlan(start) {
  const r = Math.random(), n = r < .3 ? 0 : r < .72 ? 1 : 2;
  const ids = BAD.map(b => b.id).sort(() => Math.random() - .5), days = [];
  for (let i = 0; i < n; i++) days.push({ day: start + 3 + Math.floor(Math.random() * 26), id: ids[i] });
  return { until: start + 30, days };
}
function rollDay(d) {
  S.evDay = d;
  if (d <= 2) { S.ev = null; S.gift = null; S.badToday = null; S.vibe = null; return }
  const ids = Object.keys(EVS);
  S.ev = Math.random() < .6 ? { id: rnd(ids), st: rnd(STYLE_IDS) } : null;
  const gp = GIFTS.filter(g => !g.need || g.need());
  S.gift = Math.random() < .14 && gp.length
    ? (() => { const g = rnd(gp); return { n: g.n, d: g.d, v: Math.round(ri(g.min, g.max) / 1000) * 1000 } })() : null;
  if (!S.badPlan || d > S.badPlan.until) S.badPlan = mkBadPlan(d);
  const hit = (S.badPlan.days || []).find(x => x.day === d);
  S.badToday = hit ? (() => { const b = BAD.find(y => y.id === hit.id); return { n: b.n, d: b.d, v: Math.round(ri(b.min, b.max) / 1000) * 1000 } })() : null;
  S.vibe = Math.random() < .14 ? rnd(['vui', 'kho']) : null;
}
function evText(e) {
  if (!e || !EVS[e.id]) return '';
  return EVS[e.id].d.replace('một kiểu tạo kiểu', low(STYLES[e.st] ? STYLES[e.st].n : 'một kiểu'));
}

function traffic() {
  let t = 1;
  if (S.upg.bien) t *= 1.2;
  if (S.upg.ads) t *= 1.25;
  const e = ev(); if (e && EVS[e.id]) t *= EVS[e.id].mul;
  const rt = rating();
  t *= rt >= 4.5 ? 1.25 : rt >= 4 ? 1.1 : rt >= 3 ? .9 : .65;
  /* bảng giá cắt cổ thì khách nhìn là đi */
  const bi = boardIdx();
  if (bi > CFG.priceRefuse) t *= .28; else if (bi > CFG.priceWarn) t *= .72;
  return t;
}
const onlineActive = () => S.online && rating() >= CFG.onlineKeep;

/* ---------- BỐN CÁCH MỞ PETPAL ---------- */
function petpalWays() {
  return PETPAL.map(p => {
    const cs = p.cs.map(c => ({ t: c.t, now: c.now(), ok: c.f(), p: clamp(c.p(), 0, 1) }));
    return { ...p, cs, ok: cs.every(c => c.ok), prog: cs.reduce((a, c) => a + c.p, 0) / cs.length };
  });
}
const petpalOpen = () => petpalWays().some(p => p.ok);

/* ---------- ĐÁNH GIÁ ---------- */
function addReview(s, why, online, c) {
  const pet = c && c.petName ? c.petName : rnd(PET_NAMES);
  const svn = c && c.menu ? MENUS[c.menu].n : 'dịch vụ';
  let t = rnd(TXT[why] || TXT.ok)
    .replace(/\{pet\}/g, pet).replace(/\{sv\}/g, low(svn))
    .replace(/\{kg\}/g, c && c.kg ? c.kg : '5');
  t += rnd(TAIL[s] || ['']);
  S.reviews.unshift({ s, t, d: S.day, o: online ? 1 : 0, who: c && c.owner ? c.owner : genOwner() });
  if (S.reviews.length > 400) S.reviews.pop();
  S.revTotal = (S.revTotal || 0) + 1;
  if (R.today) R.today.stars.push(s);
}
const genOwner = () => rnd(OWNER_HO) + ' ' + (Math.random() < .55 ? rnd(OWNER_NU) : rnd(OWNER_NAM));

/* ---------- TOAST / MODAL ---------- */
let toastT = null;
function toast(msg, ms) {
  const e = $('toast'); if (!e) return;
  e.innerHTML = msg; e.hidden = false; e.classList.add('on');
  clearTimeout(toastT);
  toastT = setTimeout(() => { e.classList.remove('on'); setTimeout(() => e.hidden = true, 250) }, ms || 2400);
}
function ask(html, btns) {
  const c = $('card');
  c.innerHTML = html + `<div class="askrow">` +
    btns.map((b, i) => `<button class="${b[2] ? 'big' : 'sbtn'}" data-a="${i}">${b[0]}</button>`).join('') + `</div>`;
  $('modal').hidden = false;
  c.querySelectorAll('[data-a]').forEach(el => el.onclick = () => {
    $('modal').hidden = true; const f = btns[+el.dataset.a][1]; if (f) f();
  });
}

/* ---------- HOẠT ẢNH ---------- */
const lessMotion = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
let fxTimers = [];
const FX = {
  cao: { p: 'fur', n: 10, a: 'fall', d: 1100 },
  tai: { p: 'spark', n: 6, a: 'pop', d: 900 },
  mong: { p: 'clip', n: 7, a: 'pop', d: 900 },
  tuyen: { p: 'spark', n: 5, a: 'pop', d: 800 },
  tam: { p: 'bubble', n: 13, a: 'rise', d: 1200 },
  say: { p: 'wind', n: 10, a: 'blow', d: 1100 },
  kieu: { p: 'fur', n: 12, a: 'fall', d: 1200 },
  nhoa: { p: 'spark', n: 9, a: 'rise', d: 1100 },
  __done: { p: 'heart', n: 12, a: 'rise', d: 1400 },
  __star: { p: 'star', n: 10, a: 'pop', d: 1100 },
  __bad: { p: 'puff', n: 7, a: 'pop', d: 750 },
  __hoc: { p: 'note', n: 7, a: 'rise', d: 1100 }
};

function fillParticles(layer, cfg) {
  const R0 = () => Math.random() * 2 - 1;
  for (let i = 0; i < cfg.n; i++) {
    const p = document.createElement('i');
    p.className = `fxp p-${cfg.p} fa-${cfg.a}`;
    p.style.setProperty('--x', (R0() * 40).toFixed(1) + 'px');
    p.style.setProperty('--y', (R0() * 34).toFixed(1) + 'px');
    p.style.setProperty('--dx', (R0() * 52).toFixed(1) + 'px');
    p.style.setProperty('--dy', (R0() * 34).toFixed(1) + 'px');
    p.style.setProperty('--rot', Math.round(R0() * 180) + 'deg');
    p.style.setProperty('--sz', (10 + Math.random() * 9).toFixed(1) + 'px');
    p.style.setProperty('--dur', (cfg.d / 1000).toFixed(2) + 's');
    p.style.animationDelay = (i * .05).toFixed(3) + 's';
    p.innerHTML = fxParticle(cfg.p);
    layer.appendChild(p);
  }
}
function playFX(key, lbl) {
  const cfg = FX[key];
  if (!cfg || lessMotion()) return;
  const host = document.querySelector('.deskpet');
  if (!host) return;
  const layer = document.createElement('div');
  layer.className = 'fxlayer';
  fillParticles(layer, cfg);
  host.appendChild(layer);
  if (lbl) {
    const l = document.createElement('div');
    l.className = 'fxlbl'; l.textContent = lbl;
    host.appendChild(l);
    fxTimers.push(setTimeout(() => l.remove(), 1100));
  }
  fxTimers.push(setTimeout(() => layer.remove(), cfg.d + cfg.n * 60 + 200));
  if (fxTimers.length > 60) fxTimers = fxTimers.slice(-30);
}
function clearFX() { fxTimers.forEach(clearTimeout); fxTimers = []; document.querySelectorAll('.fxlayer,.fxlbl').forEach(e => e.remove()) }

function fl(el, t, bad) {
  if (!el) return;
  const r = el.getBoundingClientRect(), f = document.createElement('div');
  f.className = 'float' + (bad ? ' bad' : '');
  f.textContent = t;
  f.style.left = (r.left + r.width / 2) + 'px';
  f.style.top = (r.top + 14) + 'px';
  document.body.appendChild(f);
  setTimeout(() => f.remove(), 1100);
}

/* ---------- HEADER ---------- */
function head() {
  const h = $('hd'); if (!h) return;
  h.innerHTML = `
    <div class="hb"><span class="hl">${ic('money')}</span><b>${fmtBig(S.money)}</b></div>
    <div class="hb"><span class="hl">${ic('door')}</span><b>Ngày ${S.day}</b></div>
    ${R.running ? `<div class="hb"><span class="hl">${ic('clock')}</span><b>${gameClock()}</b></div>` : ''}
    <div class="hb"><span class="hl">${ic('star')}</span><b>${rating().toFixed(1).replace('.', ',')}</b></div>`;
}

/* ============================================================
   MÀN CHUẨN BỊ
   ============================================================ */
const TABS = [
  { id: 'kho', n: 'Kho', i: 'box' },
  { id: 'gia', n: 'Bảng giá', i: 'price' },
  { id: 'ban', n: 'Dụng cụ', i: 'tools' },
  { id: 'tiem', n: 'Tiệm', i: 'door' },
  { id: 'danhgia', n: 'Đánh giá', i: 'star' },
  { id: 'tongket', n: 'Sổ sách', i: 'chart' }
];

function renderPrep() {
  R.mode = 'prep';
  const pane = { kho: paneKho, gia: paneGia, ban: paneBan, tiem: paneTiem, danhgia: paneRev, tongket: paneSum }[R.tab] || paneKho;
  $('view').innerHTML = `
    <div class="prep">
      ${dayBanner()}
      <div class="tabs">${TABS.map(t => `<button class="tab${R.tab === t.id ? ' on' : ''}" data-tab="${t.id}">${ic(t.i)}<span>${t.n}</span></button>`).join('')}</div>
      <div class="pane">${pane()}</div>
      <button class="big open" id="openBtn">${ic('bell')} Mở cửa — ngày ${S.day}</button>
    </div>`;
  head();
  $('view').querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { R.tab = b.dataset.tab; renderPrep(); window.scrollTo(0, 0) });
  $('openBtn').onclick = prepChecks;
  bindPane();
}

function dayBanner() {
  const e = ev(), parts = [];
  if (e && EVS[e.id]) parts.push(`<div class="bn"><span>${ic(EVS[e.id].i)}</span><div><b>${EVS[e.id].n}</b><i>${evText(e)}</i></div></div>`);
  if (S.vibe === 'vui') parts.push(`<div class="bn"><span>${ic('heart')}</span><div><b>Các bé dễ chịu</b><i>Hôm nay bé nào cũng ngoan, ít sự cố hẳn</i></div></div>`);
  if (S.vibe === 'kho') parts.push(`<div class="bn warn"><span>${ic('warn')}</span><div><b>Các bé khó ở</b><i>Hôm nay bé nào cũng nhấp nhổm, sự cố nhiều gấp đôi</i></div></div>`);
  const lv = level();
  if (S.seenLv < lv) parts.push(`<div class="bn lv"><span>${ic('trophy')}</span><div><b>Cấp ${lv}</b><i>${LV_TXT[lv]}</i></div></div>`);
  return parts.join('');
}

/* ---------- KHO ---------- */
const buyCost = k => Math.round(CFG.cost[k] * (evIs('sale') ? .7 : 1));
const planTotal = () => Object.keys(R.plan).reduce((a, k) => a + R.plan[k] * buyCost(k), 0);

function supRow(k) {
  const it = SUPPLY[k], q = qty(k), p = R.plan[k] || 0, se = soonExp(k);
  return `
    <div class="row">
      ${itemArt(k, 30)}
      <div class="rn"><b>${it.n}</b><i>Còn ${q} · ${lifeTxt(k)}${se != null ? ` · <em class="exp${se <= 1 ? ' hot' : ''}">mẻ gần nhất còn ${se} ngày</em>` : ''}</i></div>
      <div class="qty">
        <button class="qb" data-m="${k}">−</button>
        <span class="qn${p ? ' on' : ''}">${p}</span>
        <button class="qb" data-p="${k}">+</button>
      </div>
      <span class="pz">${fmt(buyCost(k))}</span>
    </div>`;
}

function paneKho() {
  const tot = planTotal(), exp = expected();
  return `
    <div class="hint">${ic('warn')} Mỗi bé làm trọn bộ ngốn khoảng <b>5–6 món vật tư</b>. Sữa tắm và nước hoa
      có hạn dùng, suất ăn thì hỏng rất nhanh — nhập vừa đủ thôi.
      Hôm nay chắc làm được khoảng <b>${exp.walk} bé</b>${exp.onl ? ` + <b>${exp.onl} đơn app</b>` : ''}.</div>
    ${SUP_GROUPS.map(g => {
      const keys = SUPPLY_KEYS.filter(k => SUPPLY[k].grp === g.g);
      if (!keys.length) return '';
      if (g.g === 'luutru' && level() < 3) return '';
      return `<h4>${ic(g.i)} ${g.n}</h4>${keys.map(supRow).join('')}`;
    }).join('')}
    <div class="buybar">
      <div>Tạm tính <b>${fmt(tot)}</b> · Két ${fmt(S.money)}</div>
      <button class="big" id="buyBtn" ${tot ? '' : 'disabled'}>Nhập hàng</button>
    </div>`;
}

/* Dự kiến hôm nay làm được bao nhiêu BÉ.
   Mỗi bé chiếm bàn khoảng bao nhiêu giây thì tính ra được, chứ đừng
   tính theo lưu lượng khách — hàng chờ dài bao nhiêu cũng vô nghĩa
   khi cả tiệm chỉ có MỘT cái bàn. */
function expected() {
  const secPerPet = 8 + STEPS.reduce((a, s) => a + s.base / stepSpeed(s.id), 0) / 1.6;
  let pets = (dayLen() * 60) / secPerPet;
  const last = [...S.history].reverse().find(r => r.served > 0);
  if (last) pets = Math.min(pets, last.served * 1.35 + 2);
  if (S.upg.groomer) pets *= 1.5;
  const bi = boardIdx();
  if (bi > CFG.priceRefuse) pets *= .35;
  const onl = onlineActive() ? Math.round(Math.min(pets * .22, 4)) : 0;
  return { walk: Math.max(2, Math.round(pets - onl)), onl };
}

/* ---------- BẢNG GIÁ ---------- */
function paneGia() {
  const bi = boardIdx();
  const cell = (m, t) => {
    const v = menuPrice(m, t), def = DEF_PRICE[m][t];
    return `<input class="pin sm${v > def * CFG.priceWarn ? ' hot' : ''}" type="number" inputmode="numeric"
      data-price="${m}|${t}" value="${v}" step="5000" aria-label="${MENUS[m].n} ${tierN(t)}">`;
  };
  return `
    <div class="hint">${ic('price')} Tiệm spa tính tiền <b>theo cân nặng của bé</b>, nên bảng giá là
      ba menu nhân bốn bậc kg. Đặt cao thì lãi dày nhưng chủ nuôi so giá rồi đi mất —
      hiện bảng giá của bạn bằng <b>${Math.round(bi * 100)}%</b> giá gợi ý
      ${bi > CFG.priceRefuse ? `<em class="exp hot">(cao quá, mất phần lớn khách)</em>`
      : bi > CFG.priceWarn ? `<em class="exp">(hơi cao, có người chê)</em>` : `<em class="exp ok">(ổn)</em>`}.</div>
    <h4>${ic('price')} Ba menu × bốn bậc cân</h4>
    <div class="ptable">
      <div class="ptrow phead"><span></span>${TIERS.map(t => `<span>${t.s}</span>`).join('')}</div>
      ${MENU_IDS.map(m => `
        <div class="ptrow">
          <span class="pmn">${ic(MENUS[m].i)}${MENUS[m].s}</span>
          ${TIER_IDS.map(t => cell(m, t)).join('')}
        </div>`).join('')}
    </div>
    <h4>${ic('tools')} Phụ thu</h4>
    ${ADD_ROWS.map(r => `
      <div class="row">
        ${ic(r.i)}
        <div class="rn"><b>${r.n}</b><i>Gợi ý ${fmt(DEF_ADD[r.k])}</i></div>
        <input class="pin" type="number" inputmode="numeric" data-add="${r.k}" value="${addPrice(r.k)}" step="5000">
      </div>`).join('')}
    <button class="sbtn wide" id="resetPrice">Trả về giá gợi ý</button>`;
}

/* ---------- BÀN DỤNG CỤ (nâng cấp thiết bị) ---------- */
function paneBan() {
  const card = k => {
    const T = TOOLS[k], lv = toolLv(k), cur = T.tiers[lv], nx = T.tiers[lv + 1];
    return `
      <div class="tcard">
        <div class="ti">${ic(T.i)}<em>${lv + 1}</em></div>
        <div class="tt">
          <b>${T.n}</b>
          <span class="tlv">Đang dùng: ${cur.n}</span>
          <i>${cur.d}</i>
          <div class="pips">${T.tiers.map((_, i) => `<span class="pip${i <= lv ? ' on' : ''}"></span>`).join('')}</div>
          ${nx ? `<i class="nx">${ic('trophy')} Cấp ${lv + 2}: ${nx.n} — ${nx.d}</i>` : `<i class="nx ok">${ic('check')} Đã lên cấp cao nhất</i>`}
        </div>
        ${nx ? `<button class="sbtn" data-tool="${k}">${fmtBig(nx.cost)}</button>` : `<span class="ok">${ic('check')}</span>`}
      </div>`;
  };
  return `
    <div class="hint">${ic('tools')} Bàn dụng cụ xếp <b>từ trên xuống</b> đúng thứ tự làm việc, giống bàn thật.
      Lên cấp thiết bị là mỗi bước nhanh hơn và bé bớt sợ — riêng
      <b>máy sấy</b> còn giảm tiếng ồn, mà tiếng ồn là thứ làm bé mất bình tĩnh nhanh nhất.</div>
    ${TOOL_ORDER.map(card).join('')}`;
}

/* ---------- TIỆM: nâng cấp, phòng, lớp học, nhân sự, PetPal ---------- */
function paneTiem() {
  const ucard = (x, isStaff) => {
    const have = S.upg[x.id];
    return `
      <div class="ucard${have ? ' have' : ''}">
        <div class="ui">${ic(x.i)}</div>
        <div class="ut"><b>${x.n}</b><i>${x.d}</i>
          ${isStaff ? `<i class="wg">Lương ${fmt(CFG[x.wage])}/ngày</i>` : ''}</div>
        ${have ? `<span class="ok">${ic('check')}</span>` : `<button class="sbtn" data-buy="${x.id}">${fmtBig(x.cost)}</button>`}
      </div>`;
  };
  const rcard = r => {
    const have = !!S.room[r.id];
    return `
      <div class="ucard${have ? ' have' : ''}">
        <div class="ui">${ic(r.i)}</div>
        <div class="ut"><b>${r.n}</b><i>${r.d}</i></div>
        ${have ? `<span class="ok">${ic('check')}</span>` : `<button class="sbtn" data-room="${r.id}">${fmtBig(r.cost)}</button>`}
      </div>`;
  };
  const ccard = c => {
    const have = !!S.cls[c.id];
    return `
      <div class="ucard${have ? ' have' : ''}">
        <div class="ui">${ic(c.i)}</div>
        <div class="ut"><b>${c.n}</b><i>${c.d}</i></div>
        ${have ? `<span class="ok">${ic('check')}</span>` : `<button class="sbtn" data-cls="${c.id}">${fmtBig(c.cost)}</button>`}
      </div>`;
  };
  const ways = petpalWays(), near = ways.slice().sort((a, b) => b.prog - a.prog)[0];
  const wayCard = (p, i) => `
    <div class="wayc${p.ok ? ' done' : ''}">
      <div class="wayh"><span class="wayn">${i + 1}</span>${ic(p.i)}<b>${p.n}</b>${p.ok ? ic('check') : `<em>${Math.round(p.prog * 100)}%</em>`}</div>
      <i class="wayhow">${p.how}</i>
      ${p.cs.map(c => `
        <div class="wayr${c.ok ? ' ok' : ''}">
          <span class="pdot">${c.ok ? '✓' : ''}</span>
          <span class="wayt">${c.t}</span><em>${c.now}</em>
          <div class="pbar"><div style="width:${c.p * 100}%"></div></div>
        </div>`).join('')}
    </div>`;
  return `
    <h4>${ic('tools')} Nâng cấp tiệm</h4>${UPG.map(x => ucard(x, false)).join('')}
    <h4>${ic('bed')} Nâng cấp hạng phòng</h4>
    <div class="hint">Làm spa xong có chủ gửi bé lại. <b>Gửi trong ngày</b> thì phòng thường là đủ;
      <b>gửi qua đêm</b> thì bắt buộc phải có <b>Deluxe</b> trở lên. Xếp sai hạng là chủ phàn nàn ngay.</div>
    ${ROOMS.map(rcard).join('')}
    <h4>${ic('book')} Lớp học cho chủ nuôi</h4>
    <div class="hint">Mở lớp rồi thì thỉnh thoảng có chủ xin học luôn khi tới làm spa — thêm một khoản không tốn vật tư.</div>
    ${CLASSES.map(ccard).join('')}
    <h4>${ic('people')} Nhân sự</h4>
    <div class="hint">Thuê rồi là trả lương <b>mỗi ngày</b>, kể cả ngày vắng khách.</div>
    ${STAFF.map(x => ucard(x, true)).join('')}
    <h4>${ic('phone')} Đơn online PetPal</h4>
    <div class="hint">${S.online
      ? `Đã mở! Đơn PetPal tự vào hàng chờ trong ngày. Giữ đánh giá trên <b>${CFG.onlineKeep.toFixed(1).replace('.', ',')}★</b> thì app mới tiếp tục đẩy đơn.`
      : `Có <b>bốn cách</b>. Làm xong trọn <b>một cách bất kỳ</b> là PetPal mở — không cần đủ cả bốn.
         Bạn đang gần nhất với cách <b>${near.n}</b> (${Math.round(near.prog * 100)}%).`}</div>
    ${ways.map(wayCard).join('')}`;
}

/* ---------- ĐÁNH GIÁ ---------- */
function paneRev() {
  const rs = S.reviews.slice(0, 40);
  if (!rs.length) return `<div class="empty">${ic('star')}<p>Chưa có đánh giá nào. Mở cửa đón bé đầu tiên nhé!</p></div>`;
  const rt = rating(), dist = [5, 4, 3, 2, 1].map(s => rs.filter(r => r.s === s).length);
  return `
    <div class="ratebox">
      <div class="rbig"><b>${rt.toFixed(1).replace('.', ',')}</b><span>${starStr(rt)}</span><i>${revCount()} đánh giá</i></div>
      <div class="rbars">${[5, 4, 3, 2, 1].map((s, i) => `
        <div class="rbar"><span>${s}★</span><div class="rt"><div style="width:${rs.length ? dist[i] / rs.length * 100 : 0}%"></div></div><em>${dist[i]}</em></div>`).join('')}</div>
    </div>
    ${rs.map(r => `
      <div class="rv">
        <div class="rvh"><b>${r.who}</b><span>${starStr(r.s)}</span></div>
        <p>${r.t}</p>
        <i>Ngày ${r.d}${r.o ? ' · PetPal' : ''}</i>
      </div>`).join('')}`;
}

/* ---------- SỔ SÁCH ---------- */
function paneSum() {
  const h = S.history.slice(-14).reverse();
  if (!h.length) return `<div class="empty">${ic('chart')}<p>Xong ngày đầu tiên là có số liệu ở đây.</p></div>`;
  const tot = h.reduce((a, r) => ({ rev: a.rev + recRev(r), cost: a.cost + recCost(r) }), { rev: 0, cost: 0 });
  return `
    <div class="ratebox">
      <div class="rbig"><b>${fmtBig(S.totalProfit || 0)}</b><span>Tổng lãi</span><i>${S.served} bé đã làm · ${S.day - 1} ngày</i></div>
    </div>
    <h4>${ic('chart')} 14 ngày gần nhất</h4>
    ${h.map(r => {
      const p = recRev(r) - recCost(r);
      return `<div class="row">
        <div class="rn"><b>Ngày ${r.day}</b><i>${r.served} bé · ${r.starN ? (r.starSum / r.starN).toFixed(1).replace('.', ',') + '★' : '–'}</i></div>
        <span class="pz ${p < 0 ? 'neg' : 'pos'}">${p < 0 ? '−' : '+'}${fmt(Math.abs(p))}</span>
      </div>`;
    }).join('')}
    <div class="row tot"><div class="rn"><b>Cộng 14 ngày</b></div>
      <span class="pz ${tot.rev - tot.cost < 0 ? 'neg' : 'pos'}">${fmt(tot.rev - tot.cost)}</span></div>`;
}

/* ---------- sự kiện màn chuẩn bị ---------- */
function bindPane() {
  const v = $('view');
  v.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { const k = b.dataset.p; R.plan[k] = (R.plan[k] || 0) + 1; renderPrep() });
  v.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { const k = b.dataset.m; R.plan[k] = Math.max(0, (R.plan[k] || 0) - 1); if (!R.plan[k]) delete R.plan[k]; renderPrep() });
  v.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => buyUpg(b.dataset.buy));
  v.querySelectorAll('[data-tool]').forEach(b => b.onclick = () => buyTool(b.dataset.tool));
  v.querySelectorAll('[data-room]').forEach(b => b.onclick = () => buyRoom(b.dataset.room));
  v.querySelectorAll('[data-cls]').forEach(b => b.onclick = () => buyClass(b.dataset.cls));
  v.querySelectorAll('[data-price]').forEach(inp => inp.onchange = () => {
    const [m, t] = inp.dataset.price.split('|');
    S.price[m][t] = clamp(Math.round(+inp.value || 0), 0, priceMax(DEF_PRICE[m][t]));
    save(); renderPrep();
  });
  v.querySelectorAll('[data-add]').forEach(inp => inp.onchange = () => {
    const k = inp.dataset.add;
    S.add[k] = clamp(Math.round(+inp.value || 0), 0, priceMax(DEF_ADD[k]));
    save(); renderPrep();
  });
  const rp = $('resetPrice');
  if (rp) rp.onclick = () => {
    S.price = JSON.parse(JSON.stringify(DEF_PRICE)); S.add = { ...DEF_ADD };
    save(); renderPrep(); toast('Đã trả bảng giá về mức gợi ý');
  };
  const bb = $('buyBtn'); if (bb) bb.onclick = doBuy;
}
function doBuy() {
  const tot = planTotal();
  if (!tot) return;
  if (tot > S.money) { toast('Không đủ tiền trong két'); return }
  S.money -= tot;
  Object.keys(R.plan).forEach(k => {
    addStock(k, R.plan[k]);
    S.cur.ing[k] = (S.cur.ing[k] || 0) + R.plan[k] * buyCost(k);
  });
  R.plan = {}; save(); renderPrep(); sfx('coin'); toast('Đã nhập hàng ' + fmt(tot));
}
function confirmBuy(title, desc, cost, icon, apply) {
  if (S.money < cost) { toast('Chưa đủ tiền'); return }
  ask(`<div class="pbig">${ic(icon)}</div><h2>${title}</h2><p>${desc}</p><p class="big-amt">${fmtBig(cost)}</p>`,
    [['Thôi', null], ['Mua', () => { S.money -= cost; apply(); save(); renderPrep(); sfx('unlock') }, 1]]);
}
function buyUpg(id) {
  const x = [...UPG, ...STAFF].find(y => y.id === id);
  if (!x || S.upg[id]) return;
  confirmBuy(x.n, x.d, x.cost, x.i, () => { S.upg[id] = true; S.hired[id] = true; toast('Đã có ' + x.n) });
}
function buyTool(k) {
  const T = TOOLS[k], lv = toolLv(k), nx = T.tiers[lv + 1];
  if (!nx) return;
  confirmBuy(nx.n, nx.d, nx.cost, T.i, () => { S.tool[k] = lv + 1; toast('Đã lên ' + nx.n) });
}
function buyRoom(id) {
  const r = ROOMS.find(x => x.id === id);
  if (!r || S.room[id]) return;
  confirmBuy(r.n, r.d, r.cost, r.i, () => { S.room[id] = true; toast('Đã có ' + r.n) });
}
function buyClass(id) {
  const c = CLASSES.find(x => x.id === id);
  if (!c || S.cls[id]) return;
  confirmBuy(c.n, c.d, c.cost, c.i, () => { S.cls[id] = true; toast('Đã mở lớp ' + low(c.n)) });
}

function prepChecks() {
  const warn = [];
  const core = ['luoi', 'taiset', 'nhamong', 'gangtay'];
  const thin = core.filter(k => qty(k) < 3);
  if (thin.length) warn.push('Gần hết vật tư cơ bản: <b>' + thin.map(k => SUPPLY[k].s).join(', ') + '</b> — thiếu là không làm nổi bước nào.');
  if (qty('sualam') < 3) warn.push('Còn rất ít <b>sữa tắm</b> — hết thì chỉ nhận được menu Vệ sinh cơ bản.');
  if (level() >= 2 && SCENT_IDS.every(s => qty(SCENTS[s].item) === 0)) warn.push('Chưa có <b>nước hoa</b> nào, mà menu Tắm nào cũng có bước bôi nước hoa.');
  if (INC_IDS.some(i => qty(INCS[i].fix) === 0)) warn.push('Chưa đủ <b>đồ xử lý sự cố</b> (suất ăn, bánh thưởng, bộ dọn) — gặp sự cố là đứng nhìn.');
  const near = SUPPLY_KEYS.filter(k => { const s = soonExp(k); return s != null && s <= 1 && qty(k) > 0 });
  if (near.length) warn.push('Hết hạn hôm nay: <b>' + near.map(k => SUPPLY[k].s).join(', ') + '</b> — dùng nốt kẻo phí.');
  if (!warn.length) return startDay();
  ask(`<div class="pbig">${ic('warn')}</div><h2>Trước khi mở cửa</h2>` + warn.map(w => `<p>${w}</p>`).join(''),
    [['Để mình xem lại', null], ['Mở cửa luôn', startDay, 1]]);
}

/* ============================================================
   MÀN CHƠI
   ============================================================ */
function startDay() {
  Object.assign(R, {
    mode: 'play', running: true, paused: false, dayLen: CFG.dayMin,
    t: CFG.dayMin * 60, spawnT: 1, onT: 10,
    queue: [], cur: null, phase: 1, busy: null, inc: null, closing: false,
    burstDone: false, vipDone: false, vipNext: false,
    stT: 0, troT: 0, groomT: 0,
    today: { rev: 0, tips: 0, onl: 0, fee: 0, cogs: 0, served: 0, lost: 0, walked: 0, stars: [], used: {} }
  });
  S.seenLv = level();
  if (S.gift) { S.money += S.gift.v; S.cur.gift = S.gift.v }
  if (S.badToday) { S.money -= S.badToday.v; S.cur.bad = S.badToday.v }
  save();
  renderPlay();
  clearInterval(timer);
  timer = setInterval(tick, 100);
  const intro = [];
  if (S.gift) intro.push([ic('gift'), S.gift.n, S.gift.d, '+' + fmt(S.gift.v)]);
  if (S.badToday) intro.push([ic('warn'), S.badToday.n, S.badToday.d, '−' + fmt(S.badToday.v)]);
  if (intro.length) {
    pauseGame(true);
    ask(intro.map(x => `<div class="pbig">${x[0]}</div><h2>${x[1]}</h2><p>${x[2]}</p><p class="big-amt">${x[3]}</p>`).join('<hr>'),
      [['Bắt đầu ngày mới', resumeGame, 1]]);
  }
}

function renderPlay() {
  $('view').innerHTML = `
    <div class="play">
      <div class="queuewrap">
        <div class="qhead">${ic('door')}<b>Hàng chờ</b><em id="qcount"></em></div>
        <div class="queue" id="queue"></div>
      </div>
      <div class="stepper" id="stepper"></div>
      <div class="stage" id="stage"></div>
      <div class="actbar" id="actbar"></div>
      <div class="footrow">
        <button class="pausebtn" id="pauseBtn">${ic('clock')} Tạm dừng</button>
        <button class="pausebtn snd" id="sndBtn">${ic(SND ? 'sound' : 'mute')} ${SND ? 'Tiếng: bật' : 'Tiếng: tắt'}</button>
      </div>
    </div>`;
  head(); renderQueue(); renderAll();
  $('pauseBtn').onclick = () => pauseGame();
  $('sndBtn').onclick = toggleSnd;
}
function renderAll() { renderStepper(); renderStage(); renderAct() }

/* ---------- HÀNG CHỜ ---------- */
function renderQueue() {
  const q = $('queue'); if (!q) return;
  const c = $('qcount');
  if (c) c.textContent = R.queue.length ? `${R.queue.length} bé đang đợi` : '';
  if (!R.queue.length) {
    q.innerHTML = `<div class="qempty">${ic('paw')}<i>${R.closing ? 'Hết giờ, không nhận thêm' : 'Chưa có ai tới, tranh thủ nghỉ tay'}</i></div>`;
    return;
  }
  q.innerHTML = R.queue.map(p => {
    const r = clamp(p.pat / p.max, 0, 1);
    const md = MOODS[p.ownerMood];
    return `
      <div class="qcard${R.cur ? ' wait' : ''}" data-take="${p.id}">
        ${p.online ? `<span class="qbadge onl">${ic('phone')}PetPal</span>` : md.w < 20 ? `<span class="qbadge" style="--qc:${md.c}">${ic(md.i)}${md.n}</span>` : ''}
        <div class="qface">${petFace(p.breed, p.look, r > .35 ? 'happy' : 'sad', 62)}</div>
        <b>${p.petName}</b>
        <i>${p.kg}kg · ${MENUS[p.menu].s}</i>
        <div class="patbar"><div style="width:${r * 100}%;background:${patCol(r)}"></div></div>
        <button class="qtake" data-take="${p.id}">${R.cur ? 'Đang có bé' : 'Nhận bé'}</button>
      </div>`;
  }).join('');
  q.querySelectorAll('button[data-take]').forEach(b => b.onclick = e => { e.stopPropagation(); takePet(+b.dataset.take) });
}
const patCol = r => r > .6 ? '#8fbd7c' : r > .3 ? '#f2c14e' : '#e8756f';

/* ---------- THANH BA BƯỚC ---------- */
function renderStepper() {
  const el = $('stepper'); if (!el) return;
  const names = ['Nhận bé', 'Làm spa', 'Trả bé'];
  el.innerHTML = names.map((n, i) => {
    const k = i + 1, on = R.cur && R.phase === k, done = R.cur && R.phase > k;
    return `<div class="sp3${on ? ' on' : ''}${done ? ' done' : ''}"><span>${done ? '✓' : k}</span><b>${n}</b></div>`;
  }).join('<i class="sparrow"></i>');
}

/* ---------- SÂN KHẤU ---------- */
function renderStage() {
  const st = $('stage'); if (!st) return;
  const c = R.cur;
  if (!c) {
    st.innerHTML = `
      <div class="idle">
        <div class="idlepet">${petHead('poodle', makeLook('poodle', 7), 'happy', { w: 130 })}</div>
        <p><b>Bàn spa đang trống.</b><br>Chọn một bé trong hàng chờ rồi bấm <b>Nhận bé</b>.</p>
        <p class="idletip">${ic('warn')} Mỗi lượt chỉ làm <b>một bé</b> — cứ từ tốn làm cho tới, nhưng đừng để mấy bé ngoài kia chờ mất kiên nhẫn.</p>
      </div>`;
    return;
  }
  st.innerHTML = R.phase === 1 ? stage1(c) : R.phase === 2 ? stage2(c) : stage3(c);
  bindStage();
}

/* ===== BƯỚC 1 — NHẬN BÉ ===== */
function stage1(c) {
  const md = MOODS[c.ownerMood];
  const wants = [];
  wants.push([MENUS[c.menu].i, 'Menu', MENUS[c.menu].n]);
  if (c.style) wants.push(['scissors', 'Kiểu', STYLES[c.style].n]);
  if (c.scent) wants.push(['perfume', 'Nước hoa', SCENTS[c.scent].n]);
  if (c.stay) wants.push([STAYS[c.stay].i, 'Gửi lại', STAYS[c.stay].n + (c.stay === 'dem' ? ' — cần Deluxe trở lên' : '')]);
  if (c.cls) wants.push([CLASSES.find(x => x.id === c.cls).i, 'Lớp học', CLASSES.find(x => x.id === c.cls).n]);
  const needRoom = !!c.stay;
  return `
    ${petPanel(c, 'dirty', 'Bé mới tới, lông còn bẩn')}
    <div class="ticket">
      <div class="tkh">${ic('people')}<b>${c.owner}</b>${c.online ? `<em class="onl">${ic('phone')}PetPal</em>` : ''}</div>
      <p class="tksay">${c.say} <b>${c.petName}</b>${c.end}</p>
      <div class="tkmeta">${BREEDS[c.breed].n} · ${BREEDS[c.breed].desc}</div>
      <div class="qtag" style="--qc:${md.c}">${ic(md.i)}<b>${md.n}</b><i>${md.d}</i></div>
      <div class="wants">${wants.map(([i, k, v]) => `<div class="wrow">${ic(i)}<span>${k}</span><b>${v}</b></div>`).join('')}</div>
    </div>

    <div class="pgrp">
      <div class="gl">${ic('scale')}Bước 1a — cân bé để biết bậc giá</div>
      ${c.weighed
        ? `<div class="kgbox">${ic('scale')}<b>${c.kg} kg</b><i>đúng bậc <b>${tierN(c.tierId)}</b></i></div>`
        : `<button class="wbtn" id="weighBtn">${ic('scale')} Cân bé</button>`}
    </div>

    <div class="pgrp${c.weighed ? '' : ' off'}">
      <div class="gl">${ic('price')}Bước 1b — chốt bậc giá</div>
      <div class="picks">${TIERS.map(t => `
        <button class="pick${c.pickTier === t.id ? ' on' : ''}" data-tier="${t.id}" ${c.weighed ? '' : 'disabled'}>
          <span class="pn">${t.n}</span><em>${fmt(menuPrice(c.pickMenu || c.menu, t.id))}</em></button>`).join('')}</div>
    </div>

    <div class="pgrp">
      <div class="gl">${ic('book')}Bước 1c — chốt menu</div>
      <div class="picks col">${menusOpen().map(m => `
        <button class="mpick${c.pickMenu === m ? ' on' : ''}" data-menu="${m}" style="--mc:${MENUS[m].c}">
          <div class="mph">${ic(MENUS[m].i)}<b>${MENUS[m].n}</b><em>${c.pickTier ? fmt(menuPrice(m, c.pickTier)) : fmt(DEF_PRICE[m][c.tierId])}</em></div>
          <i>${MENUS[m].d}</i>
          <div class="mpsteps">${MENUS[m].steps.map(s => `<span>${stepOf(s).s}</span>`).join('')}</div>
        </button>`).join('')}</div>
    </div>

    ${needRoom ? `
    <div class="pgrp">
      <div class="gl">${ic('bed')}Bước 1d — xếp phòng (${STAYS[c.stay].n})</div>
      <div class="picks">${ROOMS.map(r => {
        const have = !!S.room[r.id];
        const okStay = !STAYS[c.stay].need || r.over;
        return `<button class="pick${c.pickRoom === r.id ? ' on' : ''}${have ? '' : ' out'}" data-room2="${r.id}" ${have ? '' : 'disabled'}>
          ${ic(r.i)}<span class="pn">${r.s}</span><em>${have ? (okStay ? 'được' : 'không qua đêm') : 'chưa có'}</em></button>`;
      }).join('')}</div>
    </div>` : ''}`;
}

/* ===== BƯỚC 2 — LÀM SPA ===== */
function stage2(c) {
  const steps = MENUS[c.pickMenu].steps;
  const next = nextStep(c);
  const row = (id, i) => {
    const st = stepOf(id), inMenu = steps.includes(id);
    const done = !!c.done[id];
    const active = inMenu && !done && id === next;
    const busy = R.busy && R.busy.step === id;
    const T = st.tool ? TOOLS[st.tool] : null;
    const lack = (st.need || []).filter(k => qty(k) <= 0);
    const needScent = st.pick === 'scent';
    const scentLack = needScent && !SCENT_IDS.some(s => qty(SCENTS[s].item) > 0);
    return `
      <div class="brow${done ? ' done' : ''}${active ? ' active' : ''}${!inMenu ? ' off' : ''}${busy ? ' busy' : ''}" data-step="${id}">
        <span class="bnum">${i + 1}</span>
        <span class="bic">${ic(st.i)}</span>
        <div class="btx">
          <b>${st.n}</b>
          <i>${!inMenu ? 'Không có trong menu này' : T ? `${toolT(st.tool).n} · ${stepSec(id, c).toFixed(1)}s` : `Làm tay · ${stepSec(id, c).toFixed(1)}s`}${st.noise && toolT('say').quiet < .5 ? ' · <em class="exp hot">rất ồn</em>' : ''}</i>
          ${(st.need || []).length ? `<i class="bneed">${st.need.map(k => `${itemArt(k, 15)}${SUPPLY[k].s} ${qty(k)}`).join(' · ')}</i>` : ''}
        </div>
        ${done ? `<span class="ok">${ic('check')}</span>`
        : !inMenu ? `<span class="bskip">–</span>`
        : active ? `<button class="bgo" data-go="${id}" ${lack.length || scentLack || R.busy ? 'disabled' : ''}>${lack.length ? 'Hết ' + SUPPLY[lack[0]].s : scentLack ? 'Hết nước hoa' : 'Làm'}</button>`
        : `<span class="bwait">${ic('lock')}</span>`}
        <div class="bprog"><div id="bp_${id}" style="width:${busy ? (1 - R.busy.t / R.busy.total) * 100 : 0}%"></div></div>
      </div>`;
  };
  const needStyle = steps.includes('kieu') && !c.done.kieu;
  const needScent = steps.includes('nhoa') && !c.done.nhoa;
  return `
    ${petPanel(c, c.state, stateTxt(c))}
    ${R.inc ? incBox() : ''}
    ${needStyle ? `
    <div class="pgrp">
      <div class="gl">${ic('scissors')}Kiểu tạo kiểu — chủ xin <b>${STYLES[c.style].n}</b></div>
      <div class="picks">${STYLE_IDS.map(s => `
        <button class="pick${c.pickStyle === s ? ' on' : ''}" data-style="${s}">${ic('scissors')}<span class="pn">${STYLES[s].s}</span><em>${fmt(addPrice(s))}</em></button>`).join('')}</div>
    </div>` : ''}
    ${needScent ? `
    <div class="pgrp">
      <div class="gl">${ic('perfume')}Mùi nước hoa — chủ xin <b>${SCENTS[c.scent].n}</b></div>
      <div class="picks">${SCENT_IDS.map(s => {
        const q = qty(SCENTS[s].item);
        return `<button class="pick${c.pickScent === s ? ' on' : ''}${q ? '' : ' out'}" data-scent="${s}" ${q ? '' : 'disabled'}>
          ${itemArt(SCENTS[s].item, 22)}<span class="pn">${SCENTS[s].s}</span><em>${q ? q : 'hết'}</em></button>`;
      }).join('')}</div>
    </div>` : ''}
    <div class="benchhead">${ic('tools')}<b>Bàn dụng cụ</b><i>làm theo thứ tự từ trên xuống</i></div>
    <div class="bench">${STEPS.map((s, i) => row(s.id, i)).join('')}</div>
    ${c.cls ? `<div class="clsnote">${ic('book')} Xong spa còn phải <b>${low(CLASSES.find(x => x.id === c.cls).n)}</b> cho chủ — làm ở bước 3.</div>` : ''}`;
}

const stateTxt = c => ({
  dirty: 'Lông còn bẩn, chưa làm gì',
  soap: 'Đang xoa sữa tắm, đầy bọt',
  wet: 'Ướt sũng, cần sấy cho khô',
  scent: 'Thơm phức, xong rồi!'
}[c.state] || 'Đang trên bàn spa');

function petPanel(c, state, sub) {
  const r = clamp(c.pat / c.max, 0, 1);
  const mood = R.inc ? (R.inc.id === 'du' ? 'mad' : 'sad') : r > .6 ? 'happy' : r > .3 ? 'ok' : r > .12 ? 'sad' : 'cry';
  return `
    <div class="desk">
      <div class="deskpet">${petHead(c.breed, c.look, mood, {
        w: 176, state, style: c.done.kieu ? c.pickStyle : null, bow: R.phase === 3
      })}</div>
      <div class="deskinfo">
        <b>${c.petName}</b>
        <i>${BREEDS[c.breed].n} · ${c.kg}kg</i>
        <span class="dsub">${sub}</span>
        <div class="patlbl">${ic('heart')}Thoải mái</div>
        <div class="patbar big"><div id="curPat" style="width:${r * 100}%;background:${patCol(r)}"></div></div>
      </div>
    </div>`;
}

function incBox() {
  const I = INCS[R.inc.id], q = qty(I.fix);
  return `
    <div class="incbox">
      <div class="inch">${ic(I.i)}<b>${I.n}</b><em id="incT">${Math.ceil(R.inc.t)}s</em></div>
      <p>${I.d}</p>
      <div class="incact">
        ${INC_IDS.map(k => {
          const J = INCS[k], n = qty(J.fix);
          return `<button class="incb${k === R.inc.id ? '' : ''}" data-fix="${k}" ${n ? '' : 'disabled'}>
            ${itemArt(J.fix, 20)}<span>${J.btn}</span><em>${n ? n : 'hết'}</em></button>`;
        }).join('')}
      </div>
      ${q ? '' : `<i class="incwarn">${ic('warn')} Không còn ${low(supN(I.fix))} trong kho — lần sau nhớ nhập</i>`}
    </div>`;
}

/* ===== BƯỚC 3 — TRẢ BÉ ===== */
function stage3(c) {
  const b = bill(c), miss = checkMistakes(c);
  const cl = c.cls ? CLASSES.find(x => x.id === c.cls) : null;
  return `
    ${petPanel(c, 'scent', 'Xong rồi, thơm tho sạch sẽ!')}
    <div class="ticket bill">
      <div class="tkh">${ic('price')}<b>Hoá đơn của ${c.owner}</b></div>
      ${b.rows.map(r => `<div class="brow2">${ic(r.i)}<span>${r.n}</span><b>${fmt(r.v)}</b></div>`).join('')}
      <div class="brow2 tot"><span>Tổng</span><b>${fmt(b.total)}</b></div>
      ${c.online ? `<div class="brow2 fee"><span>${ic('phone')}PetPal giữ ${CFG.commission}%</span><b>−${fmt(b.total * CFG.commission / 100)}</b></div>` : ''}
    </div>
    ${cl && !c.clsDone ? `
    <div class="pgrp">
      <div class="gl">${ic('book')}Chủ xin học — dạy xong mới giao được</div>
      <button class="wbtn" id="clsBtn" ${R.busy ? 'disabled' : ''}>${ic(cl.i)} ${cl.n} (${cl.sec}s)</button>
      <div class="bprog wide"><div id="bp_cls" style="width:${R.busy && R.busy.cls ? (1 - R.busy.t / R.busy.total) * 100 : 0}%"></div></div>
    </div>` : ''}
    ${miss.length ? `
      <div class="misbox">
        <div class="mish">${ic('warn')}<b>Chủ nuôi sẽ thấy ${miss.length} chỗ chưa đúng</b></div>
        ${miss.map(m => `<i>• ${m.t}</i>`).join('')}
        <em>Giao vẫn được, nhưng đừng mong 5 sao.</em>
      </div>`
    : `<div class="okbox">${ic('check')}<b>Đúng hết phiếu</b><i>Giao đi thôi!</i></div>`}`;
}

/* ---------- NÚT CHÍNH Ở DƯỚI CÙNG ---------- */
function renderAct() {
  const a = $('actbar'); if (!a) return;
  const c = R.cur;
  if (!c) {
    a.innerHTML = R.queue.length
      ? `<button class="big" id="actBtn">${ic('hand')} Nhận bé ${R.queue[0].petName}</button>`
      : `<button class="big" disabled>${ic('paw')} Đang đợi khách…</button>`;
    const b = $('actBtn'); if (b) b.onclick = () => takePet(R.queue[0].id);
    return;
  }
  if (R.phase === 1) {
    const ok = c.weighed && c.pickTier && c.pickMenu && (!c.stay || c.pickRoom);
    const why = !c.weighed ? 'Cân bé trước đã' : !c.pickTier ? 'Chọn bậc giá' : !c.pickMenu ? 'Chọn menu' : 'Xếp phòng cho bé';
    a.innerHTML = `<button class="big" id="actBtn" ${ok ? '' : 'disabled'}>${ic('shampoo')} ${ok ? 'Bắt đầu làm spa' : why}</button>`;
    if (ok) $('actBtn').onclick = gotoSpa;
    return;
  }
  if (R.phase === 2) {
    const steps = MENUS[c.pickMenu].steps;
    const left = steps.filter(s => !c.done[s]).length;
    a.innerHTML = left
      ? `<button class="big" disabled>${ic('tools')} Còn ${left}/${steps.length} khung việc</button>`
      : `<button class="big" id="actBtn">${ic('check')} Xong — sang bước trả bé</button>`;
    if (!left) $('actBtn').onclick = () => { R.phase = 3; c.state = 'scent'; sfx('spray'); renderAll(); window.scrollTo(0, 0) };
    return;
  }
  const cl = c.cls ? CLASSES.find(x => x.id === c.cls) : null;
  const block = cl && !c.clsDone;
  a.innerHTML = `<button class="big give" id="actBtn" ${block ? 'disabled' : ''}>${ic('hand')} ${block ? 'Dạy chủ xong mới giao' : 'Giao bé cho chủ · ' + fmt(bill(c).total)}</button>`;
  if (!block) $('actBtn').onclick = giveBack;
}

function bindStage() {
  const st = $('stage'), c = R.cur; if (!st || !c) return;
  const wb = $('weighBtn');
  if (wb) wb.onclick = () => {
    c.weighed = true; sfx('beep');
    toast(`${c.petName} nặng <b>${c.kg}kg</b> — bậc ${tierN(c.tierId)}`, 2600);
    renderAll();
  };
  st.querySelectorAll('[data-tier]').forEach(b => b.onclick = () => { c.pickTier = b.dataset.tier; sfx('pick'); renderAll() });
  st.querySelectorAll('[data-menu]').forEach(b => b.onclick = () => { c.pickMenu = b.dataset.menu; sfx('pick'); renderAll() });
  st.querySelectorAll('[data-room2]').forEach(b => b.onclick = () => { c.pickRoom = b.dataset.room2; sfx('pick'); renderAll() });
  st.querySelectorAll('[data-style]').forEach(b => b.onclick = () => { c.pickStyle = b.dataset.style; sfx('pick'); renderAll() });
  st.querySelectorAll('[data-scent]').forEach(b => b.onclick = () => { c.pickScent = b.dataset.scent; sfx('pick'); renderAll() });
  st.querySelectorAll('[data-go]').forEach(b => b.onclick = () => doStep(b.dataset.go));
  st.querySelectorAll('[data-fix]').forEach(b => b.onclick = () => fixInc(b.dataset.fix));
  const cb = $('clsBtn');
  if (cb) cb.onclick = () => startBusy({ cls: true, total: CLASSES.find(x => x.id === c.cls).sec });
}

/* ---------- nhận bé lên bàn ---------- */
function takePet(id) {
  if (!R.running || R.paused) return;
  if (R.cur) { toast('Bàn đang có bé — làm xong rồi giao đã'); return }
  const i = R.queue.findIndex(p => p.id === id);
  if (i < 0) return;
  R.cur = R.queue.splice(i, 1)[0];
  R.cur.state = 'dirty';
  R.phase = 1;
  sfx('arrive');
  renderQueue(); renderAll(); window.scrollTo(0, 0);
}

function gotoSpa() {
  const c = R.cur;
  R.phase = 2;
  /* ghi lại ngay mấy chỗ chốt ở bước 1 để bước 3 còn kiểm lại được */
  sfx('start');
  renderAll(); window.scrollTo(0, 0);
  toast('Làm theo thứ tự từ trên xuống nhé', 2200);
}

/* bước tiếp theo được phép làm: bước đầu tiên trong menu mà chưa xong */
function nextStep(c) {
  const steps = MENUS[c.pickMenu].steps;
  return STEP_IDS.find(id => steps.includes(id) && !c.done[id]) || null;
}

/* ---------- làm một khung việc ---------- */
function doStep(id) {
  const c = R.cur;
  if (!c || R.busy || R.inc) return;
  if (id !== nextStep(c)) { toast('Phải làm đúng thứ tự trên xuống'); return }
  const st = stepOf(id);
  if (st.pick === 'style' && !c.pickStyle) { toast('Chọn kiểu tạo kiểu trước đã'); return }
  if (st.pick === 'scent' && !c.pickScent) { toast('Chọn mùi nước hoa trước đã'); return }
  /* trừ vật tư ngay khi bắt tay vào làm */
  const need = [...(st.need || [])];
  if (st.pick === 'scent') need.push(SCENTS[c.pickScent].item);
  for (const k of need) if (qty(k) <= 0) { toast('Hết ' + low(supN(k))); return }
  need.forEach(k => { take(k); R.today.cogs += CFG.cost[k]; R.today.used[k] = (R.today.used[k] || 0) + 1 });
  if (id === 'tam') c.state = 'soap';
  startBusy({ step: id, total: stepSec(id, c) });
  sfx(STEP_SFX[id] || 'pick');
  renderAll();
}
function startBusy(b) { R.busy = { ...b, t: b.total }; renderAll() }

function finishBusy() {
  const b = R.busy, c = R.cur;
  R.busy = null;
  if (!c) return;
  if (b.cls) {
    c.clsDone = true;
    sfx('unlock'); playFX('__hoc', 'Chủ học xong!');
    renderAll();
    return;
  }
  const st = stepOf(b.step);
  c.done[b.step] = true;
  if (b.step === 'tam') c.state = 'wet';
  if (b.step === 'say') c.state = null;
  if (b.step === 'nhoa') c.state = 'scent';
  playFX(b.step, st.lbl);
  sfx('ding');
  /* xong hết thì tự nhảy sang bước 3, khỏi bắt bấm thêm */
  const left = MENUS[c.pickMenu].steps.filter(s => !c.done[s]).length;
  if (!left) { R.phase = 3; c.state = 'scent'; sfx('done'); }
  renderAll();
  if (!left) window.scrollTo(0, 0);
}

/* ---------- sự cố ---------- */
function maybeInc() {
  const c = R.cur;
  if (!c || R.inc || R.phase !== 2) return;
  if (c.incUsed >= c.incMax) return;
  if (R.incCool > 0) return;
  const p = CFG.incBase * c.fuss * (S.vibe === 'kho' ? 2 : S.vibe === 'vui' ? .4 : 1) * .02;
  if (Math.random() > p) return;
  const id = wpick(INC_IDS, [1.1, 1, .9]);
  c.incUsed++;
  R.inc = { id, t: INCS[id].sec, sec: INCS[id].sec };
  R.incCool = 6;
  sfx('alarm');
  renderAll();
}
function fixInc(k) {
  const c = R.cur;
  if (!R.inc || !c) return;
  const I = INCS[R.inc.id];
  if (k !== R.inc.id) {
    /* bấm sai đồ: mất luôn món đó và bé càng cáu */
    if (qty(INCS[k].fix)) { take(INCS[k].fix); R.today.cogs += CFG.cost[INCS[k].fix]; S.cur.spoil.n++; S.cur.spoil.v += CFG.cost[INCS[k].fix] }
    c.pat = Math.max(1, c.pat - c.max * .1);
    c.rough = (c.rough || 0) + 1;
    sfx('wrong'); playFX('__bad');
    toast('Không phải thứ bé cần!');
    renderAll();
    return;
  }
  if (!take(I.fix)) { toast('Hết ' + low(supN(I.fix))); return }
  R.today.cogs += CFG.cost[I.fix];
  R.today.used[I.fix] = (R.today.used[I.fix] || 0) + 1;
  if (I.pay) {
    c.fed = true;
    /* máy cho ăn tự động: ăn là ăn hết, bé no hẳn nên không đói lại nữa */
    if (S.upg.autofeed) { c.autofed = true; c.incMax = Math.min(c.incMax, c.incUsed) }
  }
  c.pat = Math.min(c.max, c.pat + c.max * .12);
  R.inc = null;
  sfx('calm'); playFX('__done', I.pay ? 'Ăn hết sạch!' : 'Bé yên rồi');
  renderAll();
}
function missInc() {
  const c = R.cur, I = INCS[R.inc.id];
  c.pat = Math.max(1, c.pat - c.max * .22);
  c.rough = (c.rough || 0) + 1;
  c.missTxt = I.miss;
  R.inc = null;
  sfx('wrong');
  toast(I.miss, 3000);
  renderAll();
}

/* ---------- kiểm lại phiếu ---------- */
function checkMistakes(c) {
  const out = [];
  if (c.pickMenu !== c.menu) out.push({ k: 'wrongMenu', t: `Chủ đặt <b>${MENUS[c.menu].n}</b> mà bạn làm <b>${MENUS[c.pickMenu].n}</b>` });
  if (c.pickTier !== c.tierId) out.push({ k: 'wrongPrice', t: `Bé ${c.kg}kg thuộc bậc <b>${tierN(c.tierId)}</b>, bạn tính bậc <b>${tierN(c.pickTier)}</b>` });
  if (c.style && c.done.kieu && c.pickStyle !== c.style) out.push({ k: 'wrongStyle', t: `Chủ xin <b>${STYLES[c.style].n}</b>, bạn cắt <b>${STYLES[c.pickStyle].n}</b>` });
  if (c.scent && c.done.nhoa && c.pickScent !== c.scent) out.push({ k: 'wrongScent', t: `Chủ xin <b>${SCENTS[c.scent].n}</b>, bạn bôi <b>${SCENTS[c.pickScent].n}</b>` });
  if (c.stay && c.pickRoom) {
    const r = ROOMS.find(x => x.id === c.pickRoom);
    if (STAYS[c.stay].need && !r.over) out.push({ k: 'wrongRoom', t: `Gửi qua đêm mà xếp vào <b>${r.n}</b>` });
  }
  if (c.rough) out.push({ k: 'rough', t: `Có ${c.rough} lần bé bị hoảng mà không xử lý kịp` });
  if (priceIdx(c) > CFG.priceWarn) out.push({ k: 'pricey', t: `Hoá đơn cao hơn mặt bằng ${Math.round((priceIdx(c) - 1) * 100)}%` });
  return out;
}

/* ---------- chấm sao ---------- */
function stars(c) {
  const miss = checkMistakes(c);
  const waited = 1 - c.pat / c.max;
  let s = 5, why = 'great';
  if (waited > .5) { s--; why = c.online ? 'late' : 'wait' }
  if (waited > .78) { s--; why = c.online ? 'late' : 'wait' }
  if (waited > .94) s--;
  /* mỗi lỗi trừ một sao, lỗi nặng nhất là lý do ghi vào lời nhận xét */
  const wgt = { wrongMenu: 2, wrongPrice: 1, wrongStyle: 2, wrongScent: 1, wrongRoom: 1, rough: 1, pricey: 1 };
  let worst = 0;
  miss.forEach(m => { s -= wgt[m.k] || 1; if ((wgt[m.k] || 1) > worst) { worst = wgt[m.k] || 1; why = m.k } });
  /* tay nghề kéo bù lại cho kiểu khó */
  if (c.done.kieu && c.pickStyle === c.style) {
    const need = STYLES[c.style].hard > 1.2 ? 1 : 0;
    if (skill() >= need) s += skill() >= 2 ? 1 : 0;
    else s--;
  }
  const md = MOODS[c.ownerMood];
  s -= md.strict;
  if (S.upg.cam && s < 5) s++;
  if (S.upg.nhac && S.upg.lanh && s < 5 && !miss.length) s++;
  if (c.autofed) s = Math.max(s, 4);
  if (S.vibe === 'kho') s = Math.min(s, 4);
  if (S.vibe === 'vui' && !miss.length) s = Math.max(s, 5);
  if (priceIdx(c) < .92 && s < 5) { s++; if (why === 'great') why = 'cheap' }
  s = clamp(Math.round(s), 1, 5);
  if (why === 'great' && s < 5) why = s === 4 ? 'ok' : s === 3 ? 'meh' : 'bad';
  if (why === 'cheap' && s < 4) why = 'meh';
  return { s, why };
}

/* ---------- giao bé ---------- */
function giveBack() {
  const c = R.cur;
  if (!c) return;
  const b = bill(c);
  let fee = 0;
  if (c.online) { fee = Math.round(b.total * CFG.commission / 100); S.cur.onl += b.total; S.cur.fee += fee; R.today.fee += fee }
  S.money += b.total - fee;
  R.today.rev += b.total - fee;
  S.cur.rev += b.total;
  S.totalRev += b.total;
  b.rows.forEach(r => { const sl = S.cur.sales; const x = sl[r.n] = sl[r.n] || { q: 0, a: 0 }; x.q++; x.a += r.v });

  const rv = stars(c);
  let tip = 0;
  if (!c.online) {
    tip = Math.round((c.pat / c.max) * 7000 * (1 + skill() * .25) * BREEDS[c.breed].tipM
      * (S.upg.autofeed && c.autofed ? 1.25 : 1) * (evIs('tet') ? 2 : 1) * (rv.s >= 5 ? 1.6 : rv.s >= 4 ? 1.15 : .5));
    S.money += tip; R.today.tips += tip; S.cur.tips += tip; S.totalRev += tip;
  }
  addReview(rv.s, rv.why, c.online, c);
  if (c.vip) { addReview(rv.s, rv.why, c.online, c); addReview(rv.s, rv.why, c.online, c) }
  R.today.served++; S.served++; S.cur.served++;

  const el = $('actbar');
  fl(el, `+${fmt(b.total - fee + tip)}  ${'★'.repeat(rv.s)}`, rv.s <= 2);
  sfx('serve');
  if (rv.s >= 5) { setTimeout(() => sfx('star'), 240); playFX('__star') }
  R.cur = null; R.busy = null; R.inc = null; R.phase = 1;
  save();
  renderQueue(); renderAll(); head();
  if (R.closing && !R.queue.length) endDay();
}

/* ============================================================
   SINH KHÁCH
   ============================================================ */

/** Số lượng vật tư k đã "có chủ": các bé đang chờ và bé đang trên bàn còn
 *  bao nhiêu bước chưa làm mà cần tới k. */
function reserved(k) {
  let n = 0;
  const count = p => {
    const menu = p.pickMenu || p.menu;
    MENUS[menu].steps.forEach(s => {
      if (p.done && p.done[s]) return;
      const st = stepOf(s);
      if ((st.need || []).includes(k)) n++;
      /* nước hoa: chưa chốt mùi thì coi như có thể lấy bất kỳ chai nào */
      if (st.pick === 'scent' && SCENT_IDS.some(x => SCENTS[x].item === k)) {
        if (!p.pickScent || SCENTS[p.pickScent].item === k) n++;
      }
    });
  };
  R.queue.forEach(count);
  if (R.cur) count(R.cur);
  return n;
}

function genPet(online) {
  const lv = level();
  const breed = wpick(BREED_KEYS, BREED_W);
  const B = BREEDS[breed];
  const kg = Math.round(ri(B.kg[0], B.kg[1]) * 10) / 10;
  const tierId = tierOf(kg);
  const open = menusOpen();
  /* Menu nào cũng phải làm được với vật tư đang có — và phải trừ phần các bé
     ĐANG CHỜ sẽ dùng tới. Chỉ xem qty(k) > 0 thì bốn bé xếp hàng cùng đòi một
     lưỡi cạo cuối cùng: bé đầu làm xong là ba bé sau thành đơn không thể hoàn
     thành, người chơi không có cách nào tránh. */
  const left = k => qty(k) - reserved(k);
  const doable = open.filter(m => MENUS[m].steps.every(s => {
    const st = stepOf(s);
    if (st.pick === 'scent') return SCENT_IDS.some(x => left(SCENTS[x].item) > 0);
    return (st.need || []).every(k => left(k) > 0);
  }));
  if (!doable.length) return null;
  const menu = wpick(doable, doable.map(m => m === 'tamtia' ? 3 : m === 'tam' ? 4 : 2));
  const hasStyle = MENUS[menu].steps.includes('kieu');
  const trend = evIs('trend') && ev().st;
  const style = hasStyle ? (trend && Math.random() < .55 ? trend : rnd(STYLE_IDS)) : null;
  const scent = MENUS[menu].steps.includes('nhoa') ? rnd(SCENT_IDS) : null;
  /* Chỉ sinh đơn gửi QUA ĐÊM khi tiệm đã có phòng nhận qua đêm. Không kiểm
     chỗ này thì người chơi nhận một đơn không có cách nào xếp đúng — đúng
     loại bug "đơn bất khả thi" mà trình mô phỏng dựng ra để canh. */
  const canOver = ROOMS.some(r => r.over && S.room[r.id]);
  const stay = lv >= 3 && Math.random() < .3 && qty('ga') > 0
    ? (canOver && Math.random() < .45 ? 'dem' : 'ngay') : null;
  const clsOpen = CLASSES.filter(x => S.cls[x.id]);
  const cls = lv >= 4 && clsOpen.length && Math.random() < .22 ? rnd(clsOpen).id : null;
  const ownerMood = wpick(MOOD_IDS, MOOD_IDS.map(k => {
    let w = MOODS[k].w;
    if (S.day < 3 && (k === 'kho' || k === 'hoi' || k === 'doi')) w = 0;   /* hai ngày đầu cho dễ thở */
    if (lv >= 4 && (k === 'kho' || k === 'hoi')) w *= 1.5;
    if (S.vibe === 'vui' && k === 'de') w *= 2;
    if (S.vibe === 'kho' && k === 'kho') w *= 2;
    return w;
  }));
  /* kiên nhẫn: đủ để làm xong tử tế nhưng không dư dả — phải hồi hộp */
  const work = MENUS[menu].steps.reduce((a, s) => a + stepOf(s).base / stepSpeed(s), 0);
  let max = (CFG.patBase * .35 + work * 2.6) * MOODS[ownerMood].patM * (S.upg.ghe ? 1.25 : 1);
  if (online) max *= 1.5;
  const seed = Math.floor(Math.random() * 1e9);
  return {
    id: ++uid, online: !!online, breed, look: makeLook(breed, seed), kg, tierId,
    petName: rnd(PET_NAMES), owner: online ? genOwner() : genOwner(),
    say: rnd(OPEN), end: rnd(ENDS), ownerMood,
    menu, style, scent, stay, cls,
    weighed: false, pickTier: null, pickMenu: null, pickStyle: null, pickScent: null,
    pickRoom: stay ? null : null,
    done: {}, state: 'dirty', fed: false, rough: 0,
    fuss: .5 + Math.random() * 1.1, incUsed: 0, incMax: MENUS[menu].steps.length >= 7 ? 2 : 1,
    pat: max, max, vip: false
  };
}

function spawn() {
  if (R.queue.length >= CFG.queueMax) { R.today.walked++; return }
  const bi = boardIdx();
  if (bi > CFG.priceRefuse && Math.random() < .7) {
    R.today.walked++;
    if (!R.pricyT || performance.now() - R.pricyT > 9000) {
      R.pricyT = performance.now();
      toast('Chủ nuôi xem bảng giá rồi đi mất — giá cao quá');
    }
    if (Math.random() < .07) addReview(rnd([1, 2, 2]), 'pricey', false, null);
    return;
  }
  const p = genPet(false);
  if (!p) {
    R.today.lost++;
    if (!R.soT || performance.now() - R.soT > 9000) { R.soT = performance.now(); toast('Hết vật tư nên phải từ chối khách') }
    if (Math.random() < .25) addReview(2, 'soldout', false, null);
    return;
  }
  if (R.vipNext) { R.vipNext = false; p.vip = true; p.ownerMood = 'kho'; toast('Vlogger thú cưng vừa vào tiệm!', 3000) }
  R.queue.push(p);
  sfx('bell');
  renderQueue();
  if (!R.cur) renderAct();
}
function spawnOnline() {
  if (!onlineActive() || R.queue.filter(p => p.online).length >= 2) return;
  const p = genPet(true);
  if (!p) return;
  R.queue.push(p);
  renderQueue();
  if (!R.cur) renderAct();
}

/* ---------- nhịp khách trong ngày ---------- */
function rushMul() {
  const el = 1 - R.t / (dayLen() * 60);
  if (el < .06) return .8;
  if (el < .26) return 1.5;
  if (el < .34) return .9;
  if (el < .55) return .55;
  if (el < .76) return 1.45;
  if (el < .86) return .9;
  return .7;
}

/* ---------- nhân viên ---------- */
function staffTick(dt) {
  /* bạn phụ việc: tự làm giúp bốn bước vệ sinh cơ bản */
  if (S.upg.tro && R.cur && R.phase === 2 && !R.busy && !R.inc) {
    R.troT -= dt;
    if (R.troT <= 0) {
      R.troT = 3.2;
      const id = nextStep(R.cur);
      if (id && ['cao', 'tai', 'mong', 'tuyen'].includes(id)) {
        const st = stepOf(id);
        if ((st.need || []).every(k => qty(k) > 0)) { doStep(id); toast('Bạn phụ việc làm giúp ' + low(st.n), 1600) }
      }
    }
  }
  /* bạn groomer: tự lo trọn một bé trong hàng chờ */
  if (S.upg.groomer) {
    R.groomT -= dt;
    if (R.groomT <= 0) {
      R.groomT = 12;
      const i = R.queue.findIndex(p => !p.online);
      if (i >= 0) {
        const p = R.queue[i];
        const need = MENUS[p.menu].steps.flatMap(s => stepOf(s).need || []);
        if (need.every(k => qty(k) > 0)) {
          need.forEach(k => { take(k); R.today.cogs += CFG.cost[k] });
          R.queue.splice(i, 1);
          const v = menuPrice(p.menu, p.tierId);
          S.money += v; R.today.rev += v; S.cur.rev += v; S.totalRev += v;
          R.today.served++; S.served++; S.cur.served++;
          addReview(p.pat / p.max > .6 ? 4 : 3, 'ok', false, p);
          toast('Bạn groomer làm xong cho ' + p.petName + ' · +' + fmt(v), 2200);
          renderQueue(); renderAct(); head();
        }
      }
    }
  }
  /* bạn trực app: tự xử lý đơn PetPal */
  if (S.upg.appstaff) {
    R.stT -= dt;
    if (R.stT <= 0) {
      R.stT = 9;
      const i = R.queue.findIndex(p => p.online);
      if (i >= 0) {
        const p = R.queue[i];
        const need = MENUS[p.menu].steps.flatMap(s => stepOf(s).need || []);
        if (need.every(k => qty(k) > 0)) {
          need.forEach(k => { take(k); R.today.cogs += CFG.cost[k] });
          R.queue.splice(i, 1);
          const v = menuPrice(p.menu, p.tierId), fee = Math.round(v * CFG.commission / 100);
          S.money += v - fee; R.today.rev += v - fee; S.cur.rev += v; S.cur.fee += fee; S.totalRev += v;
          R.today.served++; S.served++; S.cur.served++;
          addReview(4, 'ok', true, p);
          renderQueue(); renderAct(); head();
        }
      }
    }
  }
}

/* ---------- vòng lặp ---------- */
function tick() {
  const dt = .1;
  R.t -= dt;
  if (R.incCool > 0) R.incCool -= dt;

  /* khách mới */
  R.spawnT -= dt;
  if (R.spawnT <= 0 && R.t > 6 && !R.closing) {
    spawn();
    /* Cả tiệm chỉ có MỘT cái bàn và một bé ngốn ~30 giây, nên nhịp khách
       phải xấp xỉ nhịp làm việc. Để nhịp dày như game nhiều bàn thì hàng
       chờ lúc nào cũng tràn và người chơi mất khách nhiều hơn phục vụ. */
    R.spawnT = CFG.spawnGap / traffic() / rushMul() * (.75 + Math.random() * .5);
  }
  if (onlineActive()) {
    R.onT -= dt;
    if (R.onT <= 0 && R.t > 12 && !R.closing) { spawnOnline(); R.onT = 30 / traffic() * (evIs('rain') ? .5 : 1) * (.7 + Math.random() * .6) }
  }

  /* đang làm dở một khung việc */
  if (R.busy) {
    R.busy.t -= dt;
    const bar = $(R.busy.cls ? 'bp_cls' : 'bp_' + R.busy.step);
    if (bar) bar.style.width = clamp((1 - R.busy.t / R.busy.total) * 100, 0, 100) + '%';
    if (R.busy.t <= 0) finishBusy();
  }

  /* sự cố */
  if (R.inc) {
    R.inc.t -= dt;
    const t = $('incT');
    if (t) t.textContent = Math.ceil(Math.max(0, R.inc.t)) + 's';
    if (R.inc.t <= 0) missInc();
  } else if (!R.busy || Math.random() < .4) maybeInc();

  /* kiên nhẫn: bé trên bàn và cả hàng chờ */
  let changed = false;
  if (R.cur) {
    const stepId = R.busy && R.busy.step ? R.busy.step : null;
    R.cur.pat -= dt * calmFactor(stepId) * (R.inc ? 1.7 : 1);
    if (R.cur.pat <= 0) {
      const c = R.cur;
      addReview(1, 'timeout', c.online, c);
      if (c.vip) { addReview(1, 'timeout', c.online, c); addReview(1, 'timeout', c.online, c) }
      R.today.lost++; S.cur.spoil.n++;
      toast(c.owner + ' bế ' + c.petName + ' về giữa buổi, 1 sao', 3200);
      sfx('leave');
      R.cur = null; R.busy = null; R.inc = null; R.phase = 1;
      changed = true;
    } else {
      const b = $('curPat');
      if (b) { const r = clamp(R.cur.pat / R.cur.max, 0, 1); b.style.width = r * 100 + '%'; b.style.background = patCol(r) }
    }
  }
  R.queue = R.queue.filter(p => {
    /* Ngồi chờ đỡ mệt hơn là nằm trên bàn, nên tụt chậm hơn hẳn. Nếu để
       tụt bằng nhau thì bé nào cũng cạn kiên nhẫn trước khi tới lượt. */
    p.pat -= dt * (R.cur ? .55 : .35);
    if (p.pat <= 0) {
      R.today.lost++;
      addReview(p.online ? 1 : Math.random() < .3 ? 2 : 1, p.online ? 'late' : 'timeout', p.online, p);
      toast(p.owner + ' chờ hết nổi, dắt ' + p.petName + ' đi', 2600);
      sfx('leave');
      changed = true;
      return false;
    }
    return true;
  });

  if (evIs('group') && !R.burstDone && R.t < dayLen() * 60 * .55) {
    R.burstDone = true; toast('Hội nhóm yêu chó kéo tới cùng lúc!', 3000);
    for (let n = 0; n < 3; n++) spawn();
    R.spawnT = 3;
  }
  if (evIs('vlog') && !R.vipDone && R.t < dayLen() * 60 * .6) { R.vipDone = true; R.vipNext = true; R.spawnT = Math.min(R.spawnT, 1) }

  staffTick(dt);

  if (R.t <= 0 && !R.closing) { R.closing = true; toast('19:00 đóng cửa! Làm nốt cho các bé đang chờ', 3800); changed = true }
  if (R.closing && !R.cur && !R.queue.length) { endDay(); return }

  if (changed) { renderQueue(); renderAll() }
  else if ((R.tk = (R.tk || 0) + 1) % 5 === 0) updQueueBars();
  head();
}
function updQueueBars() {
  R.queue.forEach(p => {
    const el = document.querySelector(`[data-take="${p.id}"] .patbar div`);
    if (!el) return;
    const r = clamp(p.pat / p.max, 0, 1);
    el.style.width = r * 100 + '%';
    el.style.background = patCol(r);
  });
}

function pauseGame(silent) {
  if (!R.running || R.paused) return;
  R.paused = true; clearInterval(timer);
  if (silent) return;
  ask(`<div class="pbig">${ic('clock')}</div><h2>Tạm dừng</h2>
    <p>${gameClock()} — đã làm ${R.today.served} bé, thu ${fmt(R.today.rev + R.today.tips)}</p>`,
    [['Đóng cửa sớm', () => { R.queue = []; R.cur = null; R.t = 0; endDay() }],
    ['Chơi tiếp', resumeGame, 1]]);
}
function resumeGame() {
  if (!R.running || !R.paused) return;
  R.paused = false; clearInterval(timer); timer = setInterval(tick, 100); head();
}

/* ---------- KẾT NGÀY ---------- */
function endDay() {
  clearInterval(timer); R.running = false; clearFX();
  const T = R.today, r = S.cur, fc = fixed();
  if (R.cur) T.lost++;
  const waste = expireStock();
  waste.forEach(x => r.waste[x.k] = { q: x.q, v: x.v });
  r.rent = fc.rent; r.util = fc.util; r.served = T.served; r.lost = T.lost + T.walked;
  r.starSum = T.stars.reduce((a, b) => a + b, 0); r.starN = T.stars.length;
  r.wage = wageDay();
  const yi = Math.floor((S.day - 1) / 360);
  if (S.taxYear !== yi) { S.taxYear = yi; S.yearRev = 0 }
  const rev = recRev(r), before = S.yearRev;
  S.yearRev += rev;
  const taxable = Math.max(0, S.yearRev - Math.max(CFG.taxThreshold, before));
  r.tax = Math.round(taxable * (CFG.vat + CFG.pit) / 100);
  r.ev = ev() ? { id: ev().id } : null;
  S.money -= r.rent + r.util + r.tax + r.wage;
  const cost = recCost(r), profit = rev - cost;
  const avg = r.starN ? r.starSum / r.starN : 0;
  const wv = waste.reduce((a, x) => a + x.v, 0);
  S.history.push(r);
  if (S.history.length > 400) S.history.shift();
  S.totalProfit = (S.totalProfit || 0) + profit;
  const broke = S.money < 0;
  let justOnline = false;
  if (!broke) {
    S.best = Math.max(S.best || 0, S.day);
    S.day++; S.cur = newRec(S.day); rollDay(S.day);
    if (!S.online && petpalOpen()) { S.online = true; justOnline = true }
  }
  save();
  const nextLv = !broke && levelOf(S.day) > levelOf(S.day - 1) ? levelOf(S.day) : 0;
  sfx(broke ? 'broke' : 'dayEnd');
  if (nextLv) setTimeout(() => sfx('levelUp'), 650);
  $('card').innerHTML = `
    <div class="pbig">${broke ? ic('warn') : ic('moon')}</div>
    <h2>${broke ? 'Phá sản' : 'Hết ngày ' + r.day}</h2>
    <div class="kpis">
      <div><b>${r.served}</b><span>bé đã làm</span></div>
      <div><b>${r.lost}</b><span>khách mất</span></div>
      <div><b>${avg ? avg.toFixed(1).replace('.', ',') : '–'}</b><span>sao</span></div>
    </div>
    <div class="ledger">
      <div><span>${ic('price')} Doanh thu</span><span class="pos">+${fmt(rev)}</span></div>
      <div><span>${ic('box')} Chi phí</span><span class="neg">−${fmt(cost)}</span></div>
      <div><span class="wl">Mặt bằng + điện nước</span><span class="wl">${fmt(r.rent + r.util)}</span></div>
      ${r.wage ? `<div><span class="wl">${ic('people')} Lương nhân viên</span><span class="wl">${fmt(r.wage)}</span></div>` : ''}
      ${r.bad ? `<div><span class="wl">${ic('warn')} Sự cố</span><span class="wl">${fmt(r.bad)}</span></div>` : ''}
      ${r.gift ? `<div><span class="wl">${ic('gift')} Quà</span><span class="wl">+${fmt(r.gift)}</span></div>` : ''}
      ${r.spoil && r.spoil.n ? `<div><span class="wl">${ic('trash')} ${r.spoil.n} lượt bỏ phí</span><span class="wl">${fmt(r.spoil.v)}</span></div>` : ''}
      ${wv ? `<div><span class="wl">${ic('trash')} Hỏng: ${waste.map(x => SUPPLY[x.k].s + ' ' + x.q).join(', ')}</span><span class="wl">${fmt(wv)}</span></div>` : ''}
      <div class="tot"><span>${ic('chart')} Lãi</span><span class="${profit < 0 ? 'neg' : 'pos'}">${profit < 0 ? '−' : '+'}${fmt(Math.abs(profit))}</span></div>
      <div class="tot"><span>${ic('money')} Két</span><span>${fmtBig(S.money)}</span></div>
    </div>
    ${broke ? `<p>${ic('trophy')} Trụ được ${S.best || 0} ngày</p><button class="big" id="go">Mở lại tiệm</button>`
      : `${S.ev ? `<p class="lvup">${ic(EVS[S.ev.id].i)} Ngày mai: <b>${EVS[S.ev.id].n}</b>. ${evText(S.ev)}</p>` : ''}
         ${nextLv ? `<p class="lvup">${ic('trophy')} Cấp ${nextLv}: ${LV_TXT[nextLv]}</p>` : ''}
         ${justOnline ? `<p class="lvup">${ic('phone')} PetPal mời tiệm lên sàn — từ mai có đơn online!</p>` : ''}
         <button class="big" id="go">Ngày ${S.day} →</button>`}`;
  $('modal').hidden = false;
  $('go').onclick = () => {
    $('modal').hidden = true;
    if (broke) { const n = S.shopName; S = fresh(); S.shopName = n; save() }
    R.tab = 'kho'; R.plan = {}; renderPrep(); window.scrollTo(0, 0);
  };
}

/* ============================================================
   ÂM THANH — tổng hợp hết bằng Web Audio, không dùng file nào.
   Mặc định TẮT; bật thì lựa chọn được nhớ lại.
   ============================================================ */
let SND = (() => { try { return localStorage.getItem('psSound') === 'on' } catch (e) { return false } })();
let actx = null, auMaster = null;
function auCtx() {
  if (!SND) return null;
  try {
    if (!actx) {
      actx = new (window.AudioContext || window.webkitAudioContext)();
      auMaster = actx.createGain();
      auMaster.gain.value = .5;
      auMaster.connect(actx.destination);
    }
    if (actx.state === 'suspended') actx.resume();
    return actx;
  } catch (e) { return null }
}
function tone(f, at, dur, type, vol, to) {
  const c = auCtx(); if (!c) return;
  const t = c.currentTime + (at || 0);
  const o = c.createOscillator(), g = c.createGain();
  o.type = type || 'sine';
  o.frequency.setValueAtTime(f, t);
  if (to) o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
  g.gain.setValueAtTime(.0001, t);
  g.gain.exponentialRampToValueAtTime(vol || .07, t + Math.min(.02, dur * .2));
  g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g); g.connect(auMaster);
  o.start(t); o.stop(t + dur + .02);
}
function noise(at, dur, freq, q, vol) {
  const c = auCtx(); if (!c) return;
  const t = c.currentTime + (at || 0);
  const n = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = c.createBufferSource(); s.buffer = buf;
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q || 1;
  const g = c.createGain();
  g.gain.setValueAtTime(vol || .05, t);
  g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(auMaster);
  s.start(t); s.stop(t + dur);
}
const NOTE = { do: 523.25, re: 587.33, mi: 659.25, sol: 783.99, la: 880, do2: 1046.5, mi2: 1318.5, sol2: 1568 };

const SFX = {
  pick: () => tone(620, 0, .1, 'sine', .055, 880),
  beep: () => { tone(880, 0, .07, 'square', .04); tone(1180, .07, .12, 'square', .035) },
  bell: () => { tone(NOTE.sol, 0, .15, 'sine', .065); tone(NOTE.do2, .1, .26, 'sine', .055) },
  arrive: () => { tone(NOTE.mi, 0, .12, 'triangle', .06); tone(NOTE.la, .09, .24, 'triangle', .055) },
  start: () => { tone(NOTE.do, 0, .12, 'triangle', .06); tone(NOTE.sol, .1, .24, 'triangle', .055) },
  ding: () => { tone(NOTE.do2, 0, .09, 'sine', .05); tone(NOTE.mi2, .07, .2, 'sine', .045) },
  done: () => { [NOTE.do, NOTE.mi, NOTE.sol].forEach((f, i) => tone(f, i * .07, .26, 'triangle', .06)) },
  serve: () => { tone(NOTE.do, 0, .14, 'triangle', .07); tone(NOTE.mi, .07, .14, 'triangle', .07); tone(NOTE.sol, .14, .3, 'triangle', .07) },
  star: () => { tone(NOTE.do2, 0, .1, 'sine', .05); tone(NOTE.mi2, .08, .1, 'sine', .05); tone(NOTE.sol2, .16, .34, 'sine', .055) },
  wrong: () => { tone(300, 0, .16, 'sawtooth', .045, 190); tone(150, .05, .2, 'sine', .04, 110) },
  leave: () => { tone(NOTE.mi, 0, .2, 'sine', .055, 440); tone(392, .16, .34, 'sine', .05, 294) },
  alarm: () => { tone(740, 0, .1, 'square', .05); tone(620, .12, .1, 'square', .05); tone(740, .24, .14, 'square', .05) },
  calm: () => { tone(NOTE.la, 0, .14, 'sine', .05); tone(NOTE.do2, .1, .24, 'sine', .045) },
  coin: () => { tone(1180, 0, .07, 'square', .035); tone(1570, .05, .12, 'square', .03) },
  unlock: () => { tone(NOTE.sol, 0, .12, 'triangle', .06); tone(NOTE.do2, .1, .12, 'triangle', .06); tone(NOTE.mi2, .2, .32, 'triangle', .06) },
  dayEnd: () => { tone(NOTE.sol, 0, .18, 'sine', .06); tone(NOTE.mi, .16, .18, 'sine', .06); tone(NOTE.do, .32, .5, 'sine', .06) },
  levelUp: () => { [NOTE.do, NOTE.mi, NOTE.sol, NOTE.do2].forEach((f, i) => tone(f, i * .09, .34, 'triangle', .065)) },
  broke: () => { tone(330, 0, .3, 'sawtooth', .05, 220); tone(220, .22, .5, 'sine', .05, 110) },

  /* tiếng riêng cho từng khung việc */
  buzz: () => { noise(0, .5, 260, .8, .035); tone(120, 0, .5, 'sawtooth', .022) },      /* tông đơ */
  swab: () => { noise(0, .22, 1500, 1.6, .03) },                                        /* vệ sinh tai */
  snip: () => { noise(0, .05, 3400, 5, .04); noise(.12, .05, 3100, 5, .035) },          /* kéo, kìm */
  water: () => { noise(0, .4, 900, .8, .05); tone(680, .04, .2, 'sine', .028, 1100) },  /* tắm */
  blow: () => { noise(0, .55, 700, .5, .045); noise(.1, .45, 1400, .6, .028) },         /* máy sấy */
  spray: () => { noise(0, .18, 2600, 2.2, .04) },                                       /* nước hoa */
  glove: () => { noise(0, .1, 800, 2, .028) }
};
const STEP_SFX = { cao: 'buzz', tai: 'swab', mong: 'snip', tuyen: 'glove', tam: 'water', say: 'blow', kieu: 'snip', nhoa: 'spray' };

function sfx(name) {
  if (!SND || !name) return;
  const f = SFX[name];
  if (f) { try { f() } catch (e) { } }
}
function toggleSnd() {
  SND = !SND;
  try { localStorage.setItem('psSound', SND ? 'on' : 'off') } catch (e) { }
  const b = $('sndBtn');
  if (b) b.innerHTML = `${ic(SND ? 'sound' : 'mute')} ${SND ? 'Tiếng: bật' : 'Tiếng: tắt'}`;
  if (SND) sfx('bell');
  toast(SND ? 'Đã bật tiếng' : 'Đã tắt tiếng');
}
addEventListener('pointerdown', () => { if (SND) auCtx() }, { passive: true });

/* ============================================================
   CÀI LÊN MÀN HÌNH CHÍNH
   ============================================================ */
let deferredInstall = null;
const isInstalled = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
const ua = () => navigator.userAgent || '';
const isIOS = () => /iphone|ipad|ipod/i.test(ua()) || (/macintosh/i.test(ua()) && navigator.maxTouchPoints > 1);

addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; refreshInstallBtn() });
addEventListener('appinstalled', () => { deferredInstall = null; refreshInstallBtn(); toast('Đã cài xong! Mở game từ biểu tượng ngoài màn hình nhé', 3600) });

function canOfferInstall() {
  if (isInstalled()) return false;
  if (location.protocol === 'file:') return false;
  return !!deferredInstall || isIOS();
}
function refreshInstallBtn() { const b = $('installBtn'); if (b) b.hidden = !canOfferInstall() }
function doInstall() {
  if (deferredInstall) {
    deferredInstall.prompt();
    deferredInstall.userChoice.finally(() => { deferredInstall = null; refreshInstallBtn() });
    return;
  }
  installHelp();
}
function installHelp() {
  const steps = isIOS()
    ? [[ic('share'), 'Bấm nút <b>Chia sẻ</b> ở thanh dưới Safari'],
      [ic('install'), 'Kéo xuống chọn <b>Thêm vào MH chính</b>'],
      [ic('check'), 'Bấm <b>Thêm</b> là xong']]
    : [[ic('dots'), 'Mở <b>menu ⋮</b> ở góc trên Chrome'],
      [ic('install'), 'Chọn <b>Cài đặt ứng dụng</b>'],
      [ic('check'), 'Xác nhận là xong']];
  ask(`<div class="pbig">${ic('install')}</div><h2>Cài lên màn hình chính</h2>
    <p>Cài rồi thì game chạy toàn màn hình và <b>mất mạng vẫn chơi được</b>.</p>
    <div class="steps">${steps.map((s, i) => `<div class="step-row"><span class="stepn">${i + 1}</span>${s[0]}<p>${s[1]}</p></div>`).join('')}</div>`,
    [['Để sau', null], ['Mình hiểu rồi', null, 1]]);
}

/* ---------- MÀN CHÀO ---------- */
function showSplash() {
  const had = !!S.history.length || S.day > 1;
  $('splash').hidden = false;
  $('splash').innerHTML = `
    <div class="sp">
      <div class="sppets">
        ${petHead('poodle', makeLook('poodle', 21), 'happy', { w: 116, bow: true })}
        ${petHead('golden', makeLook('golden', 42), 'love', { w: 132, bow: true })}
        ${petHead('corgi', makeLook('corgi', 84), 'happy', { w: 116 })}
      </div>
      <h1>Spa Thú Cưng</h1>
      <p>Nhận một bé, chăm cho tới, trả về thơm tho</p>
      <button class="big" id="spGo">${had ? 'Chơi tiếp — ngày ' + S.day : 'Bắt đầu'}</button>
      ${had ? `<button class="sbtn" id="spNew">Chơi lại từ đầu</button>` : ''}
      <button class="instbtn" id="installBtn" hidden>${ic('install')}Cài lên màn hình chính</button>
      <i class="ver">v${GAME_VERSION}</i>
    </div>`;
  $('spGo').onclick = () => { $('splash').hidden = true; if (!had) showTour(); else renderPrep() };
  const nb = $('spNew');
  if (nb) nb.onclick = () => ask(`<div class="pbig">${ic('warn')}</div><h2>Chơi lại từ đầu?</h2><p>Toàn bộ tiến trình hiện tại sẽ mất.</p>`,
    [['Thôi', null], ['Xoá và chơi lại', () => { S = fresh(); save(); $('splash').hidden = true; showTour() }, 1]]);
  $('installBtn').onclick = doInstall;
  refreshInstallBtn();
}

const TOUR = [
  { i: 'hand', t: 'Mỗi lượt chỉ một bé', d: 'Đây không phải game giao hàng. Bạn nhận <b>một bé</b> lên bàn rồi tập trung hẳn vào bé đó: cân, chọn menu, làm từng bước, rồi mới trả về.' },
  { i: 'scale', t: 'Tiền tính theo cân', d: 'Cân bé trước rồi chốt <b>bậc kg</b>. Bấm sai bậc là tính sai tiền, chủ nuôi phát hiện ngay khi xem hoá đơn.' },
  { i: 'tools', t: 'Tám khung việc', d: 'Bàn dụng cụ xếp <b>từ trên xuống</b>: cạo → tai → móng → tuyến hôi → tắm → sấy → tạo kiểu → nước hoa. Phải làm đúng thứ tự.' },
  { i: 'warn', t: 'Bé sẽ làm khó bạn', d: 'Giữa buổi bé có thể <b>đói</b>, <b>dữ lên</b> hay <b>tè bậy</b>. Mỗi thứ cần một món khác nhau, chọn sai là bé càng cáu.' },
  { i: 'clock', t: 'Đừng để ai chờ lâu', d: 'Bé trên bàn và cả mấy bé ngoài hàng chờ đều có thanh <b>thoải mái</b> tụt dần. Cạn là chủ bế bé đi và để lại 1 sao.' }
];
function showTour(k) {
  k = k || 0;
  if (k >= TOUR.length) {
    if (canOfferInstall()) {
      ask(`<div class="pbig">${ic('install')}</div><h2>Chơi cho đã hơn nhé?</h2>
        <p>Cài game lên màn hình chính thì chạy <b>toàn màn hình</b> và <b>mất mạng vẫn chơi được</b>.</p>`,
        [['Để sau', renderPrep], ['Cài lên máy', () => { doInstall(); renderPrep() }, 1]]);
      return;
    }
    renderPrep(); return;
  }
  const x = TOUR[k];
  ask(`<div class="pbig">${ic(x.i)}</div><h2>${x.t}</h2><p>${x.d}</p><i class="step">${k + 1}/${TOUR.length}</i>`,
    [[k < TOUR.length - 1 ? 'Tiếp' : 'Bắt đầu chơi', () => showTour(k + 1), 1]]);
}

/* ---------- BOOT ---------- */
function boot() {
  load();
  cfgSelfCheck();
  head();
  showSplash();
}
document.addEventListener('DOMContentLoaded', boot);
