/* ============================================================
   ART — CHÂN DUNG ĐẦU CHÓ, vẽ bằng SVG

   Đổi hẳn cách vẽ so với bản khách sạn: ở đó vẽ cả con bé tí nên
   trông như logo. Spa thì người chơi nhìn vào mặt bé suốt cả lượt,
   nên chỉ vẽ ĐẦU và vẽ dày: lông nhiều lớp, mắt có tròng + hai đốm
   sáng, mũi có lỗ mũi, tai có vành trong, có tơ lông tỉa quanh viền.

   Điểm quan trọng thứ hai: MỖI BÉ MỘT NGOẠI HÌNH RIÊNG.
   Hai con golden gặp trong cùng một ngày phải nhìn ra là hai con
   khác nhau — khác sắc lông, khác vệt trắng, khác màu mắt, khác
   vòng cổ, khác độ nghiêng tai. Tất cả sinh ra từ một số seed lưu
   trong dữ liệu bé, nên vẽ lại bao nhiêu lần vẫn y như cũ.

   Ngoại hình còn đổi theo TRẠNG THÁI trong lúc làm spa:
   bẩn → ướt → đầy bọt → sấy bông → tạo kiểu → thơm tho.
   ============================================================ */

/* ---------- màu ---------- */
function hx(h) {
  h = String(h).replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
const toHex = a => '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
/** a > 0 sáng lên, a < 0 tối đi */
const shade = (h, a) => toHex(hx(h).map(v => a >= 0 ? v + (255 - v) * a : v * (1 + a)));
/** lệch từng kênh màu, dùng để mỗi bé một sắc lông hơi khác nhau */
const drift = (h, d) => toHex(hx(h).map((v, i) => v + d[i]));

/* ---------- số ngẫu nhiên có seed ----------
   Cùng một seed thì luôn ra cùng một dãy số, nên ngoại hình của một
   bé không bao giờ nhảy khi giao diện được vẽ lại. */
function seedRnd(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

let _gid = 0;                       /* id riêng cho từng gradient */

/* ============================================================
   GIỐNG CHÓ
   ear   : kiểu tai — floppy cụp dài | up dựng | puff xoăn xù
                      fold cụp nhỏ   | long cụp rất dài | pom xù nhỏ
   fluff : độ bông của viền lông, 0 là mượt sát, 1 là xù bung
   kg    : khoảng cân nặng — đây là thứ quyết định bậc giá của bé
   marks : các hoạ tiết mặt có thể gặp ở giống này (null = mặt trơn)
   ============================================================ */
const BREEDS = {
  poodle: {
    n: 'Poodle', ear: 'puff', fluff: 1, kg: [3, 7],
    coat: '#f0dcbe', nose: '#6b5648', belly: '#fdf3e2',
    marks: [null, null, 'chest'], eyeCols: ['#4a3830', '#5d4433'],
    head: { rx: 54, ry: 52 }, face: { muzRx: 25, muzRy: 20, muzY: 124 },
    patM: 0.82, tipM: 1.3, w: 15, desc: 'Kiểu cách, rất thích được tỉa lông'
  },
  phoc: {
    n: 'Phốc sóc', ear: 'pom', fluff: 1, kg: [2, 5],
    coat: '#e8b878', nose: '#3e3229', belly: '#fbecd4',
    marks: [null, 'blaze', null], eyeCols: ['#3a2c24', '#4a3830'],
    head: { rx: 50, ry: 48 }, face: { muzRx: 21, muzRy: 17, muzY: 122 },
    patM: 0.7, tipM: 1.35, w: 13, desc: 'Nhỏ mà hét to, hay nhảy khỏi bàn'
  },
  pug: {
    n: 'Pug', ear: 'fold', fluff: 0.15, kg: [6, 10],
    coat: '#e3c391', nose: '#3c332c', belly: '#f2e2c4',
    marks: ['mask', 'mask', 'mask'], eyeCols: ['#4a3830', '#3a2c24'],
    head: { rx: 56, ry: 50 }, face: { muzRx: 27, muzRy: 19, muzY: 120, flat: true },
    patM: 0.95, tipM: 1.25, w: 12, desc: 'Lười, thở phì phò, ngồi yên cho làm'
  },
  beagle: {
    n: 'Beagle', ear: 'long', fluff: 0.3, kg: [9, 14],
    coat: '#c98b5e', nose: '#3a2e26', belly: '#fbf2e4',
    marks: ['blaze', 'blaze', 'patch'], eyeCols: ['#4a3223', '#5d4433'],
    head: { rx: 52, ry: 50 }, face: { muzRx: 26, muzRy: 20, muzY: 126 },
    patM: 0.9, tipM: 1.1, w: 13, desc: 'Mũi thính, hít hà mọi thứ trên bàn'
  },
  corgi: {
    n: 'Corgi', ear: 'up', fluff: 0.55, kg: [10, 15],
    coat: '#e8a86a', nose: '#463a34', belly: '#fdf6ea',
    marks: ['blaze', 'blaze', null], eyeCols: ['#4a3223', '#3a2c24'],
    head: { rx: 53, ry: 50 }, face: { muzRx: 25, muzRy: 20, muzY: 125 },
    patM: 1, tipM: 1.15, w: 13, desc: 'Nghịch, cái đuôi cụt lắc suốt'
  },
  husky: {
    n: 'Husky', ear: 'up', fluff: 0.8, kg: [18, 27],
    coat: '#8e93a3', nose: '#3a3a44', belly: '#f4f6f8',
    marks: ['goggle', 'goggle', 'mask2'], eyeCols: ['#4d93c4', '#4d93c4', '#6aa9d4', '#4a3830'],
    head: { rx: 54, ry: 52 }, face: { muzRx: 27, muzRy: 21, muzY: 127 },
    patM: 0.72, tipM: 1.2, w: 11, desc: 'Khoẻ như trâu, mê nước, hét cả buổi'
  },
  golden: {
    n: 'Golden', ear: 'floppy', fluff: 0.85, kg: [24, 34],
    coat: '#e8c081', nose: '#4a3a2e', belly: '#f7e6c4',
    marks: [null, null, 'muzzleW'], eyeCols: ['#4a3223', '#5d4433', '#3a2c24'],
    head: { rx: 56, ry: 53 }, face: { muzRx: 28, muzRy: 22, muzY: 128 },
    patM: 1.35, tipM: 1.05, w: 12, desc: 'Dễ chịu nhất nhà, làm gì cũng chịu'
  },
  lab: {
    /* Lông đen tuyền vẽ ra là mất hết mặt, nên làm xám khói và bắt
       look.light luôn dương — vẫn ra Labrador đen mà còn thấy mắt mũi. */
    n: 'Labrador', ear: 'floppy', fluff: 0.25, kg: [26, 36], dark: true,
    coat: '#7d7486', nose: '#332f3a', belly: '#a79eb0',
    marks: [null, null, 'muzzleW'], eyeCols: ['#6b4a33', '#8a6242'],
    head: { rx: 57, ry: 53 }, face: { muzRx: 29, muzRy: 22, muzY: 128 },
    patM: 1.2, tipM: 1, w: 11, desc: 'Hiền, to con, tắm tốn nhiều sữa tắm'
  }
};
const BREED_KEYS = Object.keys(BREEDS);
const BREED_W = BREED_KEYS.map(k => BREEDS[k].w);

/* vòng cổ: mỗi bé một màu, nhìn là phân biệt được hai bé cùng giống */
const COLLARS = ['#ef9bb0', '#8fb8d8', '#a8c99a', '#f2c14e', '#c9a9d4', '#e8a86a', '#7fbfb0', '#e88a8a'];
/* nơ gắn lên đầu sau khi làm xong */
const BOWS = ['#ef7f9b', '#8fb8d8', '#f2c14e', '#c9a9d4', '#a8c99a'];

/* ============================================================
   NGOẠI HÌNH RIÊNG CỦA MỘT BÉ
   Sinh một lần lúc bé xuất hiện rồi lưu vào dữ liệu bé.
   ============================================================ */
function makeLook(breedKey, seed) {
  const b = BREEDS[breedKey] || BREEDS.golden;
  const r = seedRnd(seed);
  const pick = a => a[Math.floor(r() * a.length)];
  const sgn = () => (r() < .5 ? -1 : 1);
  /* Sắc lông lệch đi một chút. Lệch mạnh theo độ sáng nhưng chỉ lệch
     nhẹ theo từng kênh màu — lệch kênh nhiều quá thì con golden ra
     màu xám, nhìn không còn là golden nữa. */
  const d = Math.round(sgn() * r() * 12);
  return {
    seed,
    drift: [d + Math.round(sgn() * r() * 5), d, d - Math.round(sgn() * r() * 5)],
    light: b.dark ? .04 + r() * .22 : (r() - .5) * .22,
    mark: pick(b.marks),
    eye: pick(b.eyeCols),
    collar: pick(COLLARS),
    bow: pick(BOWS),
    earTilt: Math.round(sgn() * (2 + r() * 7)),
    /* bốn nét phụ bật tắt độc lập — cộng với sắc lông và vòng cổ thì hai
       bé cùng giống không bao giờ trông giống nhau */
    freckle: r() < .42,
    browDot: r() < .5,
    wmuz: r() < .4,                   /* mõm trắng */
    earTip: r() < .35,                /* chóp tai sẫm hơn */
    tuft: r() < .55,                  /* búi lông dựng trên đỉnh đầu */
    fluffM: .8 + r() * .5,
    faceW: .94 + r() * .12,           /* mặt bầu hay thanh */
    wonky: r() < .18                  /* một tai cụp lệch hẳn */
  };
}

/* bảng màu thực tế của một bé, có tính cả trạng thái ướt / bọt */
function coatOf(b, look, state) {
  let base = shade(drift(b.coat, look.drift), look.light);
  if (state === 'wet' || state === 'soap') base = shade(base, -.2);
  if (state === 'dirty') base = drift(base, [-10, -12, -14]);
  return {
    coat: base,
    coatD: shade(base, -.3),
    coatL: shade(base, .22),
    coatX: shade(base, .4),
    belly: state === 'wet' || state === 'soap' ? shade(b.belly, -.15) : b.belly,
    nose: b.nose,
    ear: shade(base, -.16),
    earIn: '#e9a9ac',
    tongue: '#f09bad',
    blush: '#e89a9a'
  };
}

/* ---------- viền lông gợn sóng ----------
   Vẽ ellipse trơn thì ra hình logo. Gợn sóng theo chu vi cho ra
   cảm giác lông thật, biên độ lấy theo độ bông của giống. */
function furPath(cx, cy, rx, ry, n, amp) {
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2, a2 = (i + 1) / n * Math.PI * 2, am = (a + a2) / 2;
    const x1 = cx + Math.cos(a) * rx, y1 = cy + Math.sin(a) * ry;
    const x2 = cx + Math.cos(a2) * rx, y2 = cy + Math.sin(a2) * ry;
    const qx = cx + Math.cos(am) * (rx + amp), qy = cy + Math.sin(am) * (ry + amp);
    if (!i) d += `M${x1.toFixed(1)} ${y1.toFixed(1)}`;
    d += ` Q${qx.toFixed(1)} ${qy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  }
  return d + 'Z';
}

/* tơ lông nhỏ chìa ra ngoài viền, rải theo seed nên mỗi bé một kiểu */
function furTufts(cx, cy, rx, ry, c, look, amp) {
  if (amp < 3) return '';
  const r = seedRnd(look.seed + 77), out = [];
  const n = 16;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + r() * .2;
    if (Math.sin(a) > .62) continue;                 /* bỏ phần dưới, chỗ đó là cổ */
    const len = amp * (.7 + r() * .9);
    const x = cx + Math.cos(a) * (rx - 2), y = cy + Math.sin(a) * (ry - 2);
    const x2 = cx + Math.cos(a) * (rx + len), y2 = cy + Math.sin(a) * (ry + len);
    const px = x + Math.cos(a + 1.5) * 5, py = y + Math.sin(a + 1.5) * 5;
    out.push(`<path d="M${x.toFixed(1)} ${y.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)} L${px.toFixed(1)} ${py.toFixed(1)}Z" fill="${c}"/>`);
  }
  return `<g opacity=".9">${out.join('')}</g>`;
}

/* ---------- TAI ---------- */
function earsBack(b, c, look) {
  const t = look.earTilt, t2 = look.wonky ? -t * 2.2 : -t;
  if (b.ear === 'up')
    return `<g stroke="${c.coatD}" stroke-width="2.6" stroke-linejoin="round">
      <g transform="rotate(${-t} 66 70)">
        <path d="M66 74 C52 58 48 28 58 14 C70 24 82 44 88 62 Z" fill="${c.ear}"/>
        <path d="M66 68 C58 56 56 36 61 26 C69 34 77 48 81 60 Z" fill="${c.earIn}" opacity=".62" stroke="none"/></g>
      <g transform="rotate(${-t2} 134 70)">
        <path d="M134 74 C148 58 152 28 142 14 C130 24 118 44 112 62 Z" fill="${c.ear}"/>
        <path d="M134 68 C142 56 144 36 139 26 C131 34 123 48 119 60 Z" fill="${c.earIn}" opacity=".62" stroke="none"/></g></g>`;
  if (b.ear === 'pom')
    return `<g stroke="${c.coatD}" stroke-width="2.4" stroke-linejoin="round">
      <g transform="rotate(${-t} 68 72)"><path d="M68 76 C58 66 54 48 62 40 C72 46 80 60 84 70 Z" fill="${c.ear}"/></g>
      <g transform="rotate(${-t2} 132 72)"><path d="M132 76 C142 66 146 48 138 40 C128 46 120 60 116 70 Z" fill="${c.ear}"/></g></g>`;
  return '';
}

/* es: cỡ tai, cắt kiểu mùa hè là tỉa cả tai nên tai nhỏ lại */
function earsFront(b, c, look, es) {
  es = es || 1;
  const st = `stroke="${c.coatD}" stroke-width="2.6" stroke-linejoin="round"`;
  const t = look.earTilt, t2 = look.wonky ? t * 1.9 : t;
  if (b.ear === 'floppy')
    return `<g ${st}>
      <g transform="rotate(${-t} 58 74)">
        <path d="M58 68 C32 70 22 104 28 138 C33 164 58 168 68 150 C74 134 62 96 62 78 Z" fill="${c.ear}"/>
        <path d="M56 80 C40 86 34 110 38 134 C42 150 56 152 61 142" fill="none" stroke="${c.coatD}" stroke-width="1.6" opacity=".4"/></g>
      <g transform="rotate(${t2} 142 74)">
        <path d="M142 68 C168 70 178 104 172 138 C167 164 142 168 132 150 C126 134 138 96 138 78 Z" fill="${c.ear}"/>
        <path d="M144 80 C160 86 166 110 162 134 C158 150 144 152 139 142" fill="none" stroke="${c.coatD}" stroke-width="1.6" opacity=".4"/></g></g>`;
  if (b.ear === 'long')
    return `<g ${st}>
      <g transform="rotate(${-t} 56 74)">
        <path d="M56 66 C26 68 14 112 22 152 C28 182 56 188 68 166 C76 148 60 96 60 76 Z" fill="${c.ear}"/></g>
      <g transform="rotate(${t2} 144 74)">
        <path d="M144 66 C174 68 186 112 178 152 C172 182 144 188 132 166 C124 148 140 96 140 76 Z" fill="${c.ear}"/></g></g>`;
  if (b.ear === 'fold')
    return `<g ${st}>
      <g transform="rotate(${-t} 62 64)"><path d="M62 58 C46 54 36 70 42 90 C47 105 64 108 70 94 C74 82 68 66 68 60 Z" fill="${shade(c.ear, -.22)}"/></g>
      <g transform="rotate(${t2} 138 64)"><path d="M138 58 C154 54 164 70 158 90 C153 105 136 108 130 94 C126 82 132 66 132 60 Z" fill="${shade(c.ear, -.22)}"/></g></g>`;
  /* Chùm lông xoăn: cố ý đặt LỆCH RA NGOÀI mép đầu và cỡ vừa phải.
     Vẽ to và đặt vào trong thì hai chùm ăn hết hai bên mặt, bé chỉ còn
     một dải mặt hẹp ở giữa — trông rất sai. */
  if (b.ear === 'puff') {
    const puff = (cx, cy, s) => {
      const r = seedRnd(look.seed + s);
      const blobs = [[0, 0, 13], [-5, 13, 11], [4, 15, 10], [-1, 26, 9]];
      return `<g stroke="${c.coatD}" stroke-width="2.2">` + blobs.map(([dx, dy, rr]) =>
        `<circle cx="${(cx + dx + (r() - .5) * 4).toFixed(1)}" cy="${(cy + dy + (r() - .5) * 4).toFixed(1)}" r="${(rr * look.fluffM * es).toFixed(1)}" fill="${c.ear}"/>`
      ).join('') + `</g>`;
    };
    return puff(28, 92, 5) + puff(172, 92, 9);
  }
  if (b.ear === 'pom') {
    const puff = (cx, cy, s) => {
      const r = seedRnd(look.seed + s);
      return `<g stroke="${c.coatD}" stroke-width="2">` + [[0, 0, 12], [-6, 10, 10], [5, 11, 9]].map(([dx, dy, rr]) =>
        `<circle cx="${(cx + dx + (r() - .5) * 4).toFixed(1)}" cy="${(cy + dy + (r() - .5) * 4).toFixed(1)}" r="${(rr * es).toFixed(1)}" fill="${c.ear}"/>`).join('') + `</g>`;
    };
    return puff(50, 58, 3) + puff(150, 58, 8);
  }
  return '';
}

/* ---------- hoạ tiết mặt ---------- */
function faceMark(b, c, look, H) {
  const m = look.mark;
  if (m === 'blaze')
    return `<path d="M100 ${H.cy - 50} C90 ${H.cy - 26} 89 ${H.cy - 4} 94 ${H.cy + 18} L106 ${H.cy + 18} C111 ${H.cy - 4} 110 ${H.cy - 26} 100 ${H.cy - 50} Z" fill="${c.belly}" opacity=".94"/>`;
  if (m === 'mask')
    /* Mặt nạ Pug: cố ý bắt đầu DƯỚI tầm mắt. Vẽ trùm cả mắt thì đôi mắt
       biến mất trong vệt sẫm và bé trông như không có mặt. */
    return `<path d="M100 ${H.cy + 4} C76 ${H.cy + 4} 62 ${H.cy + 18} 62 ${H.cy + 34} C62 ${H.cy + 52} 78 ${H.cy + 62} 100 ${H.cy + 62} C122 ${H.cy + 62} 138 ${H.cy + 52} 138 ${H.cy + 34} C138 ${H.cy + 18} 124 ${H.cy + 4} 100 ${H.cy + 4} Z"
        fill="${shade(c.coatD, -.42)}" opacity=".82"/>
      <g fill="none" stroke="${shade(c.coatD, -.5)}" stroke-width="2.4" stroke-linecap="round" opacity=".5">
        <path d="M78 ${H.cy - 16} q22-9 44 0"/><path d="M84 ${H.cy - 27} q16-7 32 0"/></g>`;
  if (m === 'mask2')
    return `<path d="M100 ${H.cy - 16} C80 ${H.cy - 16} 68 ${H.cy + 2} 68 ${H.cy + 20} C68 ${H.cy + 40} 84 ${H.cy + 52} 100 ${H.cy + 52} C116 ${H.cy + 52} 132 ${H.cy + 40} 132 ${H.cy + 20} C132 ${H.cy + 2} 120 ${H.cy - 16} 100 ${H.cy - 16} Z"
        fill="${c.coatD}" opacity=".55"/>`;
  if (m === 'goggle')
    return `<g fill="${c.belly}" opacity=".95">
        <path d="M76 ${H.cy - 30} C62 ${H.cy - 18} 60 ${H.cy + 6} 68 ${H.cy + 22} L84 ${H.cy + 16} C79 ${H.cy - 2} 79 ${H.cy - 18} 84 ${H.cy - 30} Z"/>
        <path d="M124 ${H.cy - 30} C138 ${H.cy - 18} 140 ${H.cy + 6} 132 ${H.cy + 22} L116 ${H.cy + 16} C121 ${H.cy - 2} 121 ${H.cy - 18} 116 ${H.cy - 30} Z"/>
        <path d="M100 ${H.cy - 48} C93 ${H.cy - 28} 92 ${H.cy - 8} 96 ${H.cy + 12} L104 ${H.cy + 12} C108 ${H.cy - 8} 107 ${H.cy - 28} 100 ${H.cy - 48} Z"/></g>`;
  if (m === 'patch')
    return `<path d="M${H.cx - 44} ${H.cy - 18} C${H.cx - 52} ${H.cy + 4} ${H.cx - 44} ${H.cy + 26} ${H.cx - 24} ${H.cy + 28} C${H.cx - 30} ${H.cy + 6} ${H.cx - 30} ${H.cy - 10} ${H.cx - 22} ${H.cy - 24} Z"
        fill="${shade(c.coatD, -.2)}" opacity=".5"/>`;
  if (m === 'muzzleW')
    return `<ellipse cx="${H.cx}" cy="${b.face.muzY - 6}" rx="${b.face.muzRx + 6}" ry="${b.face.muzRy + 5}" fill="${c.belly}" opacity=".45"/>`;
  if (m === 'chest') return '';
  return '';
}

/* ---------- mắt ---------- */
function eyes(mood, c, look, H) {
  const dx = 23, y = H.cy - 6, L = H.cx - dx, R = H.cx + dx, ink = look.eye;
  if (mood === 'sleep')
    return `<g fill="none" stroke="#3a2f2a" stroke-width="3.4" stroke-linecap="round">
      <path d="M${L - 10} ${y} q10 9 20 0"/><path d="M${R - 10} ${y} q10 9 20 0"/></g>`;
  if (mood === 'love') {
    const heart = x => `<path d="M${x} ${y + 9} c-11-8-14-14-14-19 0-5 4-8 7-8 4 0 6 3 7 5 1-2 3-5 7-5 3 0 7 3 7 8 0 5-3 11-14 19z" fill="#ef7f9b"/>`;
    return heart(L) + heart(R);
  }
  if (mood === 'cry') {
    const e = x => `<ellipse cx="${x}" cy="${y + 2}" rx="7" ry="6" fill="#2f2b34"/>
      <path d="M${x - 2} ${y + 9} q3 14 0 20" stroke="#8fc8e8" stroke-width="4" fill="none" stroke-linecap="round" opacity=".85"/>`;
    return e(L) + e(R) + `<g fill="none" stroke="#3a2f2a" stroke-width="3" stroke-linecap="round" opacity=".8">
      <path d="M${L - 12} ${y - 14} q10-6 20-1"/><path d="M${R + 12} ${y - 14} q-10-6-20-1"/></g>`;
  }
  if (mood === 'mad') {
    const e = x => `<ellipse cx="${x}" cy="${y + 1}" rx="8" ry="8.4" fill="#2f2b34"/>
      <circle cx="${x + 2.6}" cy="${y - 3}" r="2.4" fill="#fff" opacity=".9"/>`;
    return e(L) + e(R) + `<g fill="none" stroke="#3a2f2a" stroke-width="3.6" stroke-linecap="round">
      <path d="M${L - 13} ${y - 17} L${L + 9} ${y - 11}"/><path d="M${R + 13} ${y - 17} L${R - 9} ${y - 11}"/></g>`;
  }
  if (mood === 'sad') {
    const e = x => `<ellipse cx="${x}" cy="${y + 3}" rx="7" ry="7.6" fill="#2f2b34"/>
      <circle cx="${x + 2.4}" cy="${y - 1}" r="2.2" fill="#fff" opacity=".85"/>`;
    return e(L) + e(R) + `<g fill="none" stroke="#3a2f2a" stroke-width="3" stroke-linecap="round" opacity=".85">
      <path d="M${L - 12} ${y - 14} q10-6 20-1"/><path d="M${R + 12} ${y - 14} q-10-6-20-1"/></g>`;
  }
  /* happy / ok — mắt tròn, có tròng, hai đốm sáng và mí trên */
  const eye = x => `
    <ellipse cx="${x}" cy="${y}" rx="9.4" ry="10.4" fill="#fff" opacity=".22"/>
    <ellipse cx="${x}" cy="${y}" rx="8.6" ry="9.6" fill="#231d22"/>
    <ellipse cx="${x}" cy="${y + .6}" rx="6.4" ry="7.4" fill="${ink}"/>
    <ellipse cx="${x}" cy="${y + 1.6}" rx="3.4" ry="4.2" fill="#1a1418"/>
    <circle cx="${x + 3}" cy="${y - 3.6}" r="3" fill="#fff" opacity=".95"/>
    <circle cx="${x - 2.8}" cy="${y + 3.4}" r="1.5" fill="#fff" opacity=".55"/>
    <path d="M${x - 9} ${y - 6} q9-6 18 0" fill="none" stroke="#2b2126" stroke-width="2.4" stroke-linecap="round" opacity=".55"/>`;
  return eye(L) + eye(R);
}

/* ---------- mõm, mũi, miệng ---------- */
function snout(mood, b, c, look, H) {
  const f = b.face, nx = H.cx, ny = f.muzY - (f.flat ? 2 : 6);
  const nrx = f.flat ? 12 : 10.5, nry = f.flat ? 9 : 8;
  const muz = `<ellipse cx="${nx}" cy="${f.muzY}" rx="${f.muzRx}" ry="${f.muzRy}" fill="${c.coatL}" opacity=".85"/>
    <ellipse cx="${nx}" cy="${f.muzY + 3}" rx="${f.muzRx - 4}" ry="${f.muzRy - 4}" fill="${c.coatX}" opacity=".5"/>`;
  const nose = `<path d="M${nx - nrx} ${ny} q0-${nry} ${nrx} -${nry} q${nrx} 0 ${nrx} ${nry} q0 ${nry * .95} -${nrx} ${nry * 1.05} q-${nrx} -.1 -${nrx} -${nry * 1.05} Z" fill="${c.nose}"/>
    <ellipse cx="${nx - nrx * .38}" cy="${ny - nry * .34}" rx="${nrx * .32}" ry="${nry * .24}" fill="#fff" opacity=".3"/>
    <g fill="#000" opacity=".3"><ellipse cx="${nx - nrx * .4}" cy="${ny + nry * .3}" rx="1.5" ry="2.2"/><ellipse cx="${nx + nrx * .4}" cy="${ny + nry * .3}" rx="1.5" ry="2.2"/></g>`;
  const my = f.muzY + f.muzRy * .35;
  let mouth;
  if (mood === 'sad' || mood === 'cry')
    mouth = `<path d="M${nx - 13} ${my + 9} q13-9 26 0" fill="none" stroke="${c.nose}" stroke-width="3.2" stroke-linecap="round"/>`;
  else if (mood === 'sleep')
    mouth = `<path d="M${nx - 7} ${my + 3} q7 6 14 0" fill="none" stroke="${c.nose}" stroke-width="3" stroke-linecap="round"/>`;
  else if (mood === 'mad')
    mouth = `<path d="M${nx - 15} ${my + 6} q15 10 30 0" fill="none" stroke="${c.nose}" stroke-width="3.2" stroke-linecap="round"/>
      <path d="M${nx - 9} ${my + 7} l3 6 3-6 3 6 3-6" fill="#fff" stroke="${c.nose}" stroke-width="1.2" stroke-linejoin="round"/>`;
  else if (mood === 'ok')
    mouth = `<path d="M${nx} ${my} q-10 10 -15 1 M${nx} ${my} q10 10 15 1" fill="none" stroke="${c.nose}" stroke-width="3.2" stroke-linecap="round"/>`;
  else
    mouth = `<path d="M${nx} ${my} q-12 13 -18 1 M${nx} ${my} q12 13 18 1" fill="none" stroke="${c.nose}" stroke-width="3.2" stroke-linecap="round"/>
      <path d="M${nx - 11} ${my + 9} q11 16 22 0 q-11 6 -22 0z" fill="${c.tongue}" stroke="${c.nose}" stroke-width="1.6" stroke-linejoin="round"/>`;
  /* chấm râu hai bên mõm */
  const dots = `<g fill="${c.nose}" opacity=".3">
    ${[-1, 1].map(s => [0, 1, 2].map(i =>
      `<circle cx="${nx + s * (f.muzRx - 6 - i * 5)}" cy="${f.muzY + 2 + i * 4}" r="1.3"/>`).join('')).join('')}</g>`;
  return muz + nose + mouth + dots;
}

/* ---------- vòng cổ + thẻ tên ---------- */
function collar(c, look, H) {
  const y = H.cy + H.ry + 30;
  return `<path d="M${H.cx - 44} ${y - 10} C${H.cx - 22} ${y + 6} ${H.cx + 22} ${y + 6} ${H.cx + 44} ${y - 10} L${H.cx + 44} ${y + 2} C${H.cx + 22} ${y + 18} ${H.cx - 22} ${y + 18} ${H.cx - 44} ${y + 2} Z"
      fill="${look.collar}" stroke="rgba(0,0,0,.18)" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="${H.cx}" cy="${y + 18}" r="9" fill="#f2c14e" stroke="rgba(0,0,0,.2)" stroke-width="2"/>
    <circle cx="${H.cx - 2.4}" cy="${y + 15}" r="2.6" fill="#fff" opacity=".5"/>`;
}

/* ---------- nơ trên đầu, gắn sau khi làm xong ---------- */
function bow(look, H) {
  const x = H.cx + H.rx * .62, y = H.cy - H.ry * .78, col = look.bow;
  return `<g transform="translate(${x} ${y}) rotate(-14)" stroke="rgba(0,0,0,.16)" stroke-width="2" stroke-linejoin="round">
    <path d="M0 0 C-16-11 -26-4 -22 5 C-18 13 -6 9 0 0Z" fill="${col}"/>
    <path d="M0 0 C16-11 26-4 22 5 C18 13 6 9 0 0Z" fill="${col}"/>
    <circle cx="0" cy="1" r="5.4" fill="${shade(col, .22)}"/></g>`;
}

/* ---------- các lớp phủ theo trạng thái ---------- */
function stateLayer(state, b, c, look, H) {
  if (state === 'dirty') {
    const r = seedRnd(look.seed + 31);
    return `<g opacity=".5">${Array.from({ length: 6 }, () => {
      const a = r() * Math.PI * 2, rr = .5 + r() * .45;
      return `<ellipse cx="${(H.cx + Math.cos(a) * H.rx * rr).toFixed(1)}" cy="${(H.cy + Math.sin(a) * H.ry * rr).toFixed(1)}" rx="${(5 + r() * 6).toFixed(1)}" ry="${(4 + r() * 4).toFixed(1)}" fill="#8b6b4a" opacity=".5"/>`;
    }).join('')}</g>`;
  }
  if (state === 'soap') {
    /* Bọt chỉ đắp lên ĐỈNH đầu và hai bên, cố ý chừa mặt ra — trùm hết
       thì bé thành một cục mây, không còn nhìn ra biểu cảm. */
    const r = seedRnd(look.seed + 12);
    const spots = [[-.75, -.6], [-.3, -.95], [.25, -.95], [.72, -.58], [-.95, -.1], [.95, -.1], [0, -1.25], [-.55, -1.05], [.55, -1.05]];
    return `<g>${spots.map(([fx, fy]) => {
      const cx = H.cx + fx * H.rx * .92, cy = H.cy + fy * H.ry * .72;
      const rad = 9 + r() * 8;
      return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${rad.toFixed(1)}" fill="#fff" opacity=".92"/>
        <circle cx="${(cx - rad * .3).toFixed(1)}" cy="${(cy - rad * .32).toFixed(1)}" r="${(rad * .28).toFixed(1)}" fill="#dceefa"/>`;
    }).join('')}</g>`;
  }
  if (state === 'wet') {
    /* Giọt nước phải nhỏ XUỐNG DƯỚI hàm, ở ngoài khuôn mặt. Vẽ đè lên
       má thì y như hai dòng nước mắt, bé trông như đang khóc. */
    const r = seedRnd(look.seed + 22);
    return `<g stroke="#8fc8e8" stroke-width="3" stroke-linecap="round" opacity=".8">${
      [-.34, -.12, .12, .34].map(f => {
        const x = H.cx + f * H.rx, y = H.cy + H.ry + 2;
        return `<path d="M${x.toFixed(1)} ${y.toFixed(1)} v${(9 + r() * 12).toFixed(1)}"/>`;
      }).join('')}</g>`;
  }
  if (state === 'scent') {
    const r = seedRnd(look.seed + 44);
    return `<g>${Array.from({ length: 7 }, () => {
      const x = H.cx + (r() - .5) * 150, y = H.cy + (r() - .5) * 130;
      const s = (.5 + r() * .7).toFixed(2);
      return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s})">
        <path d="M0 -11 L2.8 -3 L11 0 L2.8 3 L0 11 L-2.8 3 L-11 0 L-2.8 -3 Z" fill="#ffd98a"/></g>`;
    }).join('')}</g>`;
  }
  return '';
}

/* ============================================================
   BA KIỂU TẠO KIỂU

   Người chơi cắt được SAI kiểu, nên phải nhìn một cái là biết ngay đã
   cắt kiểu nào. Muốn vậy thì phải đổi SILHOUETTE chứ không chỉ dán thêm
   vài hình lên mặt — dán thêm thì bị tai che, ba kiểu trông y nhau.

   Cách làm: mỗi kiểu chỉnh ba thứ cùng lúc
     1) biên độ gợn của viền đầu (styleAmp)
     2) cỡ tai — cắt mùa hè là tỉa cả tai (styleEar)
     3) lớp lông vẽ phía sau đầu + chỏm phía trên (styleBack / styleTop)

     gấu bông  — viền phình tròn vo, có vành lông sau đầu, chỏm to
     mùa hè    — cạo sát, viền gọn hẳn, tai nhỏ lại, chỉ chừa chỏm bé
     thiết kế  — bờm dựng cao phía sau, hai chùm tai tạo hình
   ============================================================ */
const styleAmp = (k, amp) => k === 'muahe' ? amp * .12 : k === 'gaubong' ? amp * 2 + 5 : k === 'thietke' ? amp * 1.25 : amp;
const styleEar = k => k === 'muahe' ? .62 : k === 'gaubong' ? 1.2 : 1;

/* lớp lông nằm SAU đầu — đổi hẳn dáng ngoài */
function styleBack(k, c, look, H) {
  const st = `stroke="${c.coatD}" stroke-width="2.6" stroke-linejoin="round"`;
  if (k === 'gaubong')
    return `<g ${st}><circle cx="${H.cx}" cy="${H.cy + 6}" r="${(Math.max(H.rx, H.ry) + 16).toFixed(1)}" fill="${c.coatL}"/></g>`;
  if (k === 'thietke')
    return `<g ${st}><path d="M${H.cx - 40} ${H.cy - H.ry + 22}
      C${H.cx - 52} ${H.cy - H.ry - 46} ${H.cx + 52} ${H.cy - H.ry - 46} ${H.cx + 40} ${H.cy - H.ry + 22} Z" fill="${c.coatL}"/></g>`;
  return '';
}
/* chỏm trên đỉnh đầu — luôn ở giữa nên tai không che được */
function styleTop(k, c, look, H) {
  const st = `stroke="${c.coatD}" stroke-width="2.6" stroke-linejoin="round"`;
  if (k === 'gaubong')
    return `<g ${st}><circle cx="${H.cx}" cy="${(H.cy - H.ry - 6).toFixed(1)}" r="22" fill="${c.coatX}"/>
      <circle cx="${(H.cx - 17).toFixed(1)}" cy="${(H.cy - H.ry + 6).toFixed(1)}" r="15" fill="${c.coatX}"/>
      <circle cx="${(H.cx + 17).toFixed(1)}" cy="${(H.cy - H.ry + 6).toFixed(1)}" r="15" fill="${c.coatX}"/></g>`;
  if (k === 'muahe')
    return `<g ${st}><path d="M${H.cx - 13} ${H.cy - H.ry + 12} C${H.cx - 15} ${H.cy - H.ry - 4} ${H.cx + 15} ${H.cy - H.ry - 4} ${H.cx + 13} ${H.cy - H.ry + 12} Z" fill="${c.coatX}"/></g>
      <path d="M${H.cx - H.rx * .8} ${H.cy - 14} q${(H.rx * .8).toFixed(1)} 15 ${(H.rx * 1.6).toFixed(1)} 0" fill="none" stroke="${c.coatD}" stroke-width="2" opacity=".32"/>`;
  if (k === 'thietke')
    return `<g ${st}><path d="M${H.cx - 20} ${H.cy - H.ry + 10}
        C${H.cx - 30} ${H.cy - H.ry - 38} ${H.cx + 30} ${H.cy - H.ry - 38} ${H.cx + 20} ${H.cy - H.ry + 10} Z" fill="${c.coatX}"/>
      <path d="M${H.cx} ${H.cy - H.ry - 24} v22" stroke="${c.coatD}" stroke-width="2" opacity=".35"/></g>`;
  return '';
}

/**
 * Vẽ chân dung đầu một bé.
 * @param breedKey khoá trong BREEDS
 * @param look     ngoại hình riêng, lấy từ makeLook()
 * @param mood     happy | ok | sad | mad | cry | sleep | love
 * @param opt      { w, state, style, bow, cls }
 *                 state: dirty | wet | soap | scent | null
 *                 style: gaubong | muahe | thietke | null
 */
function petHead(breedKey, look, mood, opt) {
  opt = opt || {};
  const b = BREEDS[breedKey] || BREEDS.golden;
  look = look || makeLook(breedKey, 1);
  const m = mood || 'happy', w = opt.w || 180, st = opt.state || null;
  const c = coatOf(b, look, st);
  const H = {
    cx: 100, cy: 98,
    rx: b.head.rx * look.faceW,
    ry: b.head.ry
  };
  /* ướt thì lông bết sát, sấy xong thì bung ra, tạo kiểu thì theo kiểu */
  let fl = b.fluff * look.fluffM;
  if (st === 'wet' || st === 'soap') fl *= .25;
  const amp = styleAmp(opt.style, fl * 7);
  const es = styleEar(opt.style) * (st === 'wet' || st === 'soap' ? .85 : 1);
  const g = ++_gid;

  return `<svg class="pet ${opt.cls || ''}" width="${w}" height="${Math.round(w * 210 / 200)}"
    viewBox="0 0 200 210" role="img" aria-label="${b.n}">
  <defs>
    <radialGradient id="cg${g}" cx="38%" cy="28%" r="78%">
      <stop offset="0" stop-color="${c.coatX}"/>
      <stop offset="55%" stop-color="${c.coat}"/>
      <stop offset="100%" stop-color="${c.coatD}"/>
    </radialGradient>
  </defs>

  <!-- cổ + ức, để cái đầu không lơ lửng -->
  <path d="M${H.cx - 34} ${H.cy + H.ry - 6} C${H.cx - 40} ${H.cy + H.ry + 34} ${H.cx - 44} ${H.cy + H.ry + 54} ${H.cx - 46} ${H.cy + H.ry + 62}
           L${H.cx + 46} ${H.cy + H.ry + 62} C${H.cx + 44} ${H.cy + H.ry + 54} ${H.cx + 40} ${H.cy + H.ry + 34} ${H.cx + 34} ${H.cy + H.ry - 6} Z"
        fill="${c.coatD}" stroke="${shade(c.coatD, -.2)}" stroke-width="2.6" stroke-linejoin="round"/>
  <ellipse cx="${H.cx}" cy="${H.cy + H.ry + 44}" rx="26" ry="20" fill="${c.belly}" opacity=".75"/>

  ${earsBack(b, c, look)}
  ${styleBack(opt.style, c, look, H)}
  ${furTufts(H.cx, H.cy, H.rx, H.ry, c.coatD, look, amp)}

  <!-- đầu -->
  <path d="${furPath(H.cx, H.cy, H.rx, H.ry, 14, amp)}" fill="url(#cg${g})" stroke="${c.coatD}" stroke-width="2.8" stroke-linejoin="round"/>
  <!-- bóng sáng trên trán và tối dưới hàm, cho ra khối -->
  <ellipse cx="${H.cx - H.rx * .3}" cy="${H.cy - H.ry * .48}" rx="${H.rx * .42}" ry="${H.ry * .26}" fill="#fff" opacity=".13"/>
  <ellipse cx="${H.cx}" cy="${H.cy + H.ry * .72}" rx="${H.rx * .62}" ry="${H.ry * .24}" fill="${c.coatD}" opacity=".26"/>

  ${faceMark(b, c, look, H)}
  ${look.wmuz && look.mark !== 'mask' ? `<ellipse cx="${H.cx}" cy="${b.face.muzY - 8}" rx="${b.face.muzRx + 7}" ry="${b.face.muzRy + 7}" fill="${c.belly}" opacity=".55"/>` : ''}
  ${earsFront(b, c, look, es)}
  ${look.earTip && (b.ear === 'floppy' || b.ear === 'long') ? `<g fill="${shade(c.coatD, -.28)}" opacity=".45">
      <ellipse cx="34" cy="${b.ear === 'long' ? 142 : 126}" rx="17" ry="13"/>
      <ellipse cx="166" cy="${b.ear === 'long' ? 142 : 126}" rx="17" ry="13"/></g>` : ''}
  ${styleTop(opt.style, c, look, H)}

  <!-- vài nét lông trên trán -->
  <g fill="none" stroke="${c.coatD}" stroke-width="2" stroke-linecap="round" opacity=".3">
    <path d="M${H.cx - 16} ${H.cy - H.ry + 12} q5 9 1 17"/>
    <path d="M${H.cx} ${H.cy - H.ry + 8} q5 10 0 18"/>
    <path d="M${H.cx + 16} ${H.cy - H.ry + 12} q-5 9 -1 17"/>
  </g>

  ${look.tuft && !opt.style ? `<path d="M${H.cx - 9} ${H.cy - H.ry + 6} C${H.cx - 12} ${H.cy - H.ry - 16} ${H.cx + 12} ${H.cy - H.ry - 16} ${H.cx + 9} ${H.cy - H.ry + 6} Z" fill="${c.coatL}" stroke="${c.coatD}" stroke-width="2.2" stroke-linejoin="round"/>` : ''}
  ${look.browDot && m !== 'mad' ? `<g fill="${c.coatD}" opacity=".4"><ellipse cx="${H.cx - 23}" cy="${H.cy - 22}" rx="6" ry="3.6"/><ellipse cx="${H.cx + 23}" cy="${H.cy - 22}" rx="6" ry="3.6"/></g>` : ''}
  ${m === 'sad' || m === 'sleep' || m === 'cry' ? '' : `<g fill="${c.blush}" opacity=".32"><ellipse cx="${H.cx - H.rx * .66}" cy="${H.cy + 16}" rx="11" ry="7"/><ellipse cx="${H.cx + H.rx * .66}" cy="${H.cy + 16}" rx="11" ry="7"/></g>`}
  ${look.freckle ? `<g fill="${c.coatD}" opacity=".28">${[[-30, 26], [-22, 32], [30, 26], [22, 32]].map(([dx, dy]) => `<circle cx="${H.cx + dx}" cy="${H.cy + dy}" r="1.8"/>`).join('')}</g>` : ''}

  ${snout(m, b, c, look, H)}
  ${eyes(m, c, look, H)}
  ${collar(c, look, H)}
  ${opt.bow ? bow(look, H) : ''}
  ${stateLayer(st, b, c, look, H)}
  ${m === 'sleep' ? `<g fill="#9a8fa8" font-weight="800" opacity=".8"><text x="150" y="42" font-size="16">z</text><text x="164" y="26" font-size="20">z</text></g>` : ''}
</svg>`;
}

/* ---------- ảnh nhỏ trong hàng chờ: chỉ cái đầu, không cổ ---------- */
function petFace(breedKey, look, mood, w) {
  return petHead(breedKey, look, mood, { w: w || 64, cls: 'mini' });
}

/* ============================================================
   BỘ ICON
   ============================================================ */
const ICONS = {
  money: '<rect x="2.5" y="6" width="19" height="12" rx="2" fill="#a8c99a"/><circle cx="12" cy="12" r="3.4" fill="#fdf6ea"/><path d="M12 9.6v4.8M10.4 11h3.2" stroke="#87ad78" stroke-width="1.5"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.8-4.4 4.3 1 6.1L12 17l-5.4 2.8 1-6.1-4.4-4.3 6.1-.8z" fill="#f2c14e"/>',
  clock: '<circle cx="12" cy="12" r="9" fill="#8fb8d8"/><path d="M12 7v5.5l3.5 2" stroke="#fdf6ea" stroke-width="2" fill="none" stroke-linecap="round"/>',
  paw: '<circle cx="8" cy="8" r="2.4" fill="#c49a7a"/><circle cx="16" cy="8" r="2.4" fill="#c49a7a"/><circle cx="5" cy="13.5" r="2.1" fill="#c49a7a"/><circle cx="19" cy="13.5" r="2.1" fill="#c49a7a"/><ellipse cx="12" cy="16" rx="5" ry="4.2" fill="#c49a7a"/>',
  heart: '<path d="M12 20s-8-5-8-10a4.5 4.5 0 018-2.8A4.5 4.5 0 0120 10c0 5-8 10-8 10z" fill="#ef7f9b"/>',
  box: '<path d="M3 8l9-4 9 4v9l-9 4-9-4z" fill="#d9bb92"/><path d="M3 8l9 4 9-4M12 12v9" stroke="#b8956a" stroke-width="1.6" fill="none"/>',
  price: '<path d="M3 11V4h7l10 10-7 7L3 11z" fill="#a8c99a"/><circle cx="7.5" cy="7.5" r="1.8" fill="#fdf6ea"/>',
  chart: '<rect x="4" y="12" width="4" height="8" rx="1" fill="#8fb8d8"/><rect x="10" y="7" width="4" height="13" rx="1" fill="#a8c99a"/><rect x="16" y="4" width="4" height="16" rx="1" fill="#f2c14e"/>',
  tools: '<path d="M14 3a5 5 0 00-4.6 7L3 16.4 6.6 20l6.4-6.4A5 5 0 1014 3z" fill="#b0a0c0"/>',
  warn: '<path d="M12 3l9.5 17H2.5z" fill="#e8a86a"/><path d="M12 9v5" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="17" r="1.3" fill="#fff"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z" fill="#b0a0c0"/>',
  trophy: '<path d="M7 4h10v5a5 5 0 01-10 0z" fill="#f2c14e"/><path d="M10 14h4v4h-4z" fill="#d9a83c"/><rect x="7" y="18" width="10" height="2.6" rx="1.3" fill="#d9a83c"/>',
  people: '<circle cx="9" cy="8" r="3.4" fill="#8fb8d8"/><circle cx="16.5" cy="9" r="2.8" fill="#a8c99a"/><path d="M3 19c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5z" fill="#8fb8d8"/>',
  trash: '<path d="M5 7h14l-1.2 13H6.2z" fill="#c0b0a0"/><rect x="8" y="3" width="8" height="3" rx="1.4" fill="#a89888"/>',
  sun: '<circle cx="12" cy="12" r="5" fill="#f2c14e"/><g stroke="#f2c14e" stroke-width="2.2" stroke-linecap="round"><path d="M12 2v2.6M12 19.4V22M2 12h2.6M19.4 12H22M5 5l1.8 1.8M17.2 17.2L19 19M19 5l-1.8 1.8M6.8 17.2L5 19"/></g>',
  rain: '<path d="M6 13a4.5 4.5 0 011.2-8.8A5.5 5.5 0 0118 6.5 3.8 3.8 0 0117.5 14z" fill="#b8c6d4"/><g stroke="#8fb8d8" stroke-width="2.2" stroke-linecap="round"><path d="M8 17l-1 3M13 17l-1 3M18 17l-1 3"/></g>',
  gift: '<rect x="3" y="9" width="18" height="11" rx="1.6" fill="#ef9bb0"/><rect x="2" y="6" width="20" height="4" rx="1.4" fill="#e07f9a"/><path d="M12 6v14" stroke="#fdf6ea" stroke-width="2"/>',
  phone: '<rect x="6" y="2.5" width="12" height="19" rx="2.6" fill="#8fb8d8"/><rect x="8" y="5" width="8" height="12" rx="1" fill="#fdf6ea"/>',
  bell: '<path d="M6 16V11a6 6 0 1112 0v5l1.5 2.2H4.5z" fill="#f2c14e"/><circle cx="12" cy="20" r="1.8" fill="#d9a83c"/>',
  check: '<circle cx="12" cy="12" r="9" fill="#a8c99a"/><path d="M7.6 12.4l3 3 5.8-6" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  lock: '<rect x="5" y="10" width="14" height="10" rx="2.2" fill="#b0a0c0"/><path d="M8.5 10V7.5a3.5 3.5 0 017 0V10" stroke="#b0a0c0" stroke-width="2.4" fill="none"/>',
  sound: '<path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4z" fill="#8fb8d8"/><path d="M15.5 9a4 4 0 010 6M18 6.5a7.5 7.5 0 010 11" stroke="#8fb8d8" stroke-width="2" fill="none" stroke-linecap="round"/>',
  mute: '<path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4z" fill="#bcb2a6"/><path d="M15.5 9.5l5 5M20.5 9.5l-5 5" stroke="#bcb2a6" stroke-width="2.2" fill="none" stroke-linecap="round"/>',
  reload: '<path d="M20 12a8 8 0 11-2.6-5.9" stroke="#c9a9d4" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M20 3v5h-5" stroke="#c9a9d4" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  share: '<path d="M8 10.5H6.5A1.5 1.5 0 005 12v7.5A1.5 1.5 0 006.5 21h11a1.5 1.5 0 001.5-1.5V12a1.5 1.5 0 00-1.5-1.5H16" stroke="#8fb8d8" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M12 2.6v11.2" stroke="#8fb8d8" stroke-width="2" stroke-linecap="round"/><path d="M8.4 6L12 2.5 15.6 6" stroke="#8fb8d8" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  dots: '<g fill="#8a7566"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></g>',
  install: '<rect x="5" y="2.5" width="14" height="19" rx="2.6" fill="#a8c99a"/><rect x="7" y="5" width="10" height="11" rx="1" fill="#fdf6ea"/><path d="M12 7v6" stroke="#86ab77" stroke-width="2" stroke-linecap="round"/><path d="M9.6 10.8L12 13.2l2.4-2.4" stroke="#86ab77" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',

  /* ---------- riêng cho spa ---------- */
  scale: '<path d="M4 20h16l-1.6-9H5.6z" fill="#b8c6d4"/><rect x="9" y="4" width="6" height="3" rx="1.4" fill="#8fb8d8"/><path d="M12 7v4" stroke="#8fb8d8" stroke-width="2"/><path d="M8.6 17.4a3.4 3.4 0 016.8 0z" fill="#fdf6ea"/>',
  clipper: '<rect x="8" y="8" width="8" height="12" rx="2" fill="#9aa8b8"/><path d="M7 8h10l-1-3H8z" fill="#c9d4de"/><g stroke="#7f8d9c" stroke-width="1.2"><path d="M8.6 5V3M11 5V3M13 5V3M15.4 5V3"/></g><rect x="9.6" y="12" width="4.8" height="1.6" rx=".8" fill="#e6eef4"/>',
  ear: '<path d="M8.6 3.4c4 0 7 3 7 7 0 3.4-2.4 4.6-2.4 7.2 0 2-1.4 3.4-3.2 3.4-2 0-3.4-1.6-3.4-3.6" fill="none" stroke="#e8a86a" stroke-width="2.2" stroke-linecap="round"/><circle cx="17.6" cy="16.6" r="3.2" fill="#fdf3e2" stroke="#d9bb92" stroke-width="1.4"/>',
  nail: '<path d="M4.6 6.6l13.4 7.6" stroke="#e8b8c4" stroke-width="2.6" stroke-linecap="round"/><path d="M4.6 11.4L18 3.8" stroke="#e8b8c4" stroke-width="2.6" stroke-linecap="round"/><rect x="16.4" y="7" width="4.6" height="4" rx="2" fill="#d99aa8"/><path d="M5.6 16.4c0-2 1.8-3.4 4-3.4s4 1.4 4 3.4-1.8 4-4 4-4-2-4-4z" fill="#fdf0f3" stroke="#d99aa8" stroke-width="1.2"/>',
  glove: '<path d="M7 20V12l-1.6-1.6a1.6 1.6 0 012.3-2.3l1 1V4.6a1.5 1.5 0 013 0v3.2a1.5 1.5 0 013 0v1a1.5 1.5 0 013 0V15a5 5 0 01-5 5z" fill="#cfe4de" stroke="#7fa893" stroke-width="1.4" stroke-linejoin="round"/>',
  shampoo: '<rect x="7" y="8" width="10" height="12" rx="2.4" fill="#8fb8d8"/><rect x="10" y="4" width="4" height="4" rx="1" fill="#bcd9ee"/><rect x="8.6" y="11" width="6.8" height="4.4" rx="1" fill="#fdf6ea"/><circle cx="19" cy="6" r="1.8" fill="#bcd9ee"/><circle cx="21" cy="10" r="1.2" fill="#bcd9ee"/>',
  bath: '<path d="M3 12h18v3a5 5 0 01-5 5H8a5 5 0 01-5-5z" fill="#8fb8d8"/><circle cx="8" cy="6" r="2" fill="#bcd9ee"/><circle cx="13" cy="4.5" r="1.4" fill="#bcd9ee"/>',
  dryer: '<path d="M3 9.6A3.6 3.6 0 016.6 6h5.6l4.4-2.4v12L12.2 13H9.2l-.6 5.6A1.4 1.4 0 017.2 20H6a1.4 1.4 0 01-1.4-1.6l.8-5.4A3.6 3.6 0 013 9.6z" fill="#bcd9ee" stroke="#6f9cbe" stroke-width="1.2" stroke-linejoin="round"/><g stroke="#8fb8d8" stroke-width="1.5" stroke-linecap="round"><path d="M19 7.4h2.6M19 10h3M19 12.6h2.6"/></g>',
  comb: '<rect x="4" y="12.6" width="15.2" height="4.4" rx="2.2" fill="#f0c8d4" stroke="#d99aa8" stroke-width="1.2"/><g stroke="#d99aa8" stroke-width="1.5" stroke-linecap="round"><path d="M6.6 17v3.2M9.6 17v3.6M12.6 17v3.6M15.6 17v3.2"/></g><path d="M9 12.6c0-3.4 2-5.6 4.4-6.4" fill="none" stroke="#d99aa8" stroke-width="1.6" stroke-linecap="round"/>',
  towel: '<path d="M4 6.6c0-1.2 1-2.2 2.2-2.2h11.6c1.2 0 2.2 1 2.2 2.2v12.8c0 .8-.6 1.4-1.4 1.4H5.4c-.8 0-1.4-.6-1.4-1.4z" fill="#f4ecdc" stroke="#c9b8a0" stroke-width="1.4"/><g stroke="#d9c8ae" stroke-width="1.4"><path d="M4 9h16M4 12h16M4 15h16"/></g><rect x="9" y="2.6" width="6" height="3" rx="1.4" fill="#8fb8d8"/>',
  scissors: '<circle cx="6.5" cy="17.5" r="2.6" fill="none" stroke="#d99aa8" stroke-width="2"/><circle cx="17.5" cy="17.5" r="2.6" fill="none" stroke="#d99aa8" stroke-width="2"/><path d="M8 15.5L18 4M16 15.5L6 4" stroke="#d99aa8" stroke-width="2" stroke-linecap="round"/>',
  perfume: '<rect x="8" y="9" width="8" height="11" rx="2" fill="#ef9bb0"/><rect x="10.4" y="5.6" width="3.2" height="3.4" rx="1" fill="#f7c4d0"/><rect x="9.8" y="3.4" width="4.4" height="2.4" rx="1.2" fill="#c9a9d4"/><g fill="#f2c14e"><circle cx="18.6" cy="6" r="1.4"/><circle cx="20.6" cy="9.4" r="1"/><circle cx="17.4" cy="10.4" r=".8"/></g>',
  bowl: '<path d="M3 11h18a9 9 0 01-18 0z" fill="#e8a86a"/><ellipse cx="12" cy="11" rx="9" ry="2.4" fill="#f0bc86"/>',
  bone: '<path d="M6.4 8.2a2.6 2.6 0 10-2 4.3 2.6 2.6 0 102 4.3l11.2-2.6a2.6 2.6 0 102-4.3 2.6 2.6 0 10-2-4.3z" fill="#e8c98a" stroke="#c7a361" stroke-width="1.2" stroke-linejoin="round"/>',
  mop: '<path d="M11 3h2v11h-2z" fill="#c9a97a"/><path d="M6.6 14h10.8l-1.2 6.4a1.4 1.4 0 01-1.4 1.2H9.2a1.4 1.4 0 01-1.4-1.2z" fill="#a8c99a" stroke="#86ab77" stroke-width="1.2"/><g stroke="#86ab77" stroke-width="1.2"><path d="M9.6 14v7.4M12 14v7.6M14.4 14v7.4"/></g>',
  music: '<path d="M9 18V6l10-2v12" stroke="#c9a9d4" stroke-width="2" fill="none"/><circle cx="6.6" cy="18" r="3" fill="#c9a9d4"/><circle cx="16.6" cy="16" r="3" fill="#c9a9d4"/>',
  ac: '<rect x="2.6" y="5" width="18.8" height="7.6" rx="2.2" fill="#dbe8f2" stroke="#9fc0d8" stroke-width="1.4"/><path d="M5 10.4h14" stroke="#9fc0d8" stroke-width="1.4"/><g stroke="#8fb8d8" stroke-width="1.8" stroke-linecap="round"><path d="M7.6 15v3.4M12 15v4.4M16.4 15v3.4"/></g>',
  bed: '<path d="M3 17v-6a2 2 0 012-2h14a2 2 0 012 2v6" fill="#c9a9d4"/><rect x="2" y="16" width="20" height="4" rx="1.6" fill="#a98cb8"/><circle cx="7.5" cy="10.5" r="2.4" fill="#fdf6ea"/>',
  crown: '<path d="M3 18l1.4-9 4 3.4L12 5l3.6 7.4 4-3.4L21 18z" fill="#f2c14e" stroke="#d6a331" stroke-width="1.2" stroke-linejoin="round"/>',
  book: '<path d="M4 4.6h6.4c.9 0 1.6.7 1.6 1.6v13c0-.9-.7-1.6-1.6-1.6H4z" fill="#8fb8d8"/><path d="M20 4.6h-6.4c-.9 0-1.6.7-1.6 1.6v13c0-.9.7-1.6 1.6-1.6H20z" fill="#a8c99a"/>',
  hand: '<path d="M7.4 21V11.6L5.6 9.8a1.7 1.7 0 012.4-2.4l1.2 1.2V3.8a1.6 1.6 0 013.2 0v4.4a1.6 1.6 0 013.2 0v1.2a1.6 1.6 0 013.2 0V16a5 5 0 01-5 5z" fill="#f2d4b8" stroke="#c9a07a" stroke-width="1.4" stroke-linejoin="round"/>',
  door: '<rect x="5" y="3" width="14" height="18" rx="1.8" fill="#c9a97a" stroke="#a8875c" stroke-width="1.4"/><circle cx="15.6" cy="12" r="1.4" fill="#f2c14e"/>',
  fire: '<path d="M12 21c-3.8 0-6.4-2.4-6.4-5.8 0-4.4 4.6-5.6 4-12.2 3 1.8 4.2 5 3.4 7 1-1 1.4-2.4 1.2-3.6 2.6 2 4.2 5 4.2 8.8 0 3.4-2.6 5.8-6.4 5.8z" fill="#f0a05a"/><path d="M12 21c-2 0-3.4-1.4-3.4-3.2 0-2.4 2.8-3 2.6-6.4 1.8 1 3 3 3 5 0 .8-.2 1.4-.6 2 1-.4 1.6-1.2 1.8-2 .4 1 .6 2 .6 2.6 0 1.8-1.6 2-4 2z" fill="#f7cf7a"/>'
};
function ic(n, cls) {
  const p = ICONS[n];
  if (!p) return '';
  return `<svg class="ic ${cls || ''}" viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;
}

/* ============================================================
   HÌNH TỪNG MÓN VẬT TƯ — khung 24×24
   ============================================================ */
const ITEM_ART = {
  luoi: `<rect x="4.6" y="9" width="14.8" height="6" rx="1.6" fill="#c9d4de" stroke="#8c9aa8" stroke-width="1.3"/>
      <g stroke="#8c9aa8" stroke-width="1.2"><path d="M7 15v3M9.4 15v3M11.8 15v3M14.2 15v3M16.6 15v3"/></g>
      <rect x="6.6" y="10.6" width="10.8" height="2.4" rx="1.2" fill="#eef4f8"/>`,
  taiset: `<circle cx="8" cy="15" r="4.2" fill="#fdf3e2" stroke="#d9bb92" stroke-width="1.4"/>
      <rect x="13" y="6" width="7" height="13" rx="2" fill="#e8a86a"/>
      <rect x="14.6" y="4" width="3.8" height="2.6" rx="1" fill="#c9884c"/>
      <rect x="14.2" y="9" width="4.6" height="4" rx="1" fill="#fdf6ea"/>`,
  nhamong: `<path d="M5 5.6h9.4l4.6 5.4-4.6 5.4H5z" fill="#e8c9a8" stroke="#c9a37a" stroke-width="1.3" stroke-linejoin="round"/>
      <g fill="#b8906a" opacity=".75"><circle cx="8" cy="8.6" r=".9"/><circle cx="11" cy="10" r=".9"/><circle cx="8.6" cy="12" r=".9"/><circle cx="12" cy="13.4" r=".9"/><circle cx="14.4" cy="10.8" r=".9"/></g>
      <rect x="4" y="17.4" width="12" height="2.6" rx="1.3" fill="#c9a37a"/>`,
  gangtay: `<path d="M7.6 20.4V11.6L5.8 9.8a1.7 1.7 0 012.4-2.4l1.2 1.2V4a1.6 1.6 0 013.2 0v4.6a1.6 1.6 0 013.2 0v1.2a1.6 1.6 0 013.2 0v5.6a4.6 4.6 0 01-4.6 4.6z" fill="#cfe4de" stroke="#7fa893" stroke-width="1.4" stroke-linejoin="round"/>
      <path d="M7.6 12.6h10.6" stroke="#7fa893" stroke-width="1.2" opacity=".6"/>`,
  sualam: `<rect x="7" y="8.4" width="10" height="11.6" rx="2.2" fill="#8fb8d8" stroke="#6f9cbe" stroke-width="1.3"/>
      <rect x="10" y="4.4" width="4" height="4" rx="1.1" fill="#bcd9ee" stroke="#6f9cbe" stroke-width="1.1"/>
      <rect x="8.6" y="11.4" width="6.8" height="4.6" rx="1" fill="#fdf6ea"/>
      <g fill="#bcd9ee"><circle cx="19.4" cy="5.6" r="1.8"/><circle cx="21.2" cy="9.4" r="1.1"/><circle cx="4.6" cy="7.6" r="1.4"/></g>`,
  khan: `<path d="M4 6.6c0-1.2 1-2.2 2.2-2.2h11.6c1.2 0 2.2 1 2.2 2.2v12.8c0 .8-.6 1.4-1.4 1.4H5.4c-.8 0-1.4-.6-1.4-1.4z" fill="#f4ecdc" stroke="#c9b8a0" stroke-width="1.3"/>
      <g stroke="#dccbb2" stroke-width="1.3"><path d="M4 9.4h16M4 12.4h16M4 15.4h16"/></g>
      <rect x="9" y="2.6" width="6" height="3" rx="1.4" fill="#8fb8d8"/>`,
  nhoaHe: `<rect x="8" y="9" width="8" height="11" rx="2" fill="#a8c99a" stroke="#86ab77" stroke-width="1.2"/>
      <rect x="10.4" y="5.6" width="3.2" height="3.4" rx="1" fill="#c6e0b8"/>
      <rect x="9.8" y="3.4" width="4.4" height="2.4" rx="1.2" fill="#f2c14e"/>
      <g fill="#f2c14e"><circle cx="18.8" cy="6.4" r="1.4"/><circle cx="20.6" cy="9.8" r=".9"/></g>`,
  nhoaThu: `<rect x="8" y="9" width="8" height="11" rx="2" fill="#e8a86a" stroke="#c9884c" stroke-width="1.2"/>
      <rect x="10.4" y="5.6" width="3.2" height="3.4" rx="1" fill="#f2cd9a"/>
      <rect x="9.8" y="3.4" width="4.4" height="2.4" rx="1.2" fill="#c9884c"/>
      <g fill="#f2c14e"><circle cx="18.8" cy="6.4" r="1.4"/><circle cx="20.6" cy="9.8" r=".9"/></g>`,
  nhoaDong: `<rect x="8" y="9" width="8" height="11" rx="2" fill="#a8bcd4" stroke="#7f95b0" stroke-width="1.2"/>
      <rect x="10.4" y="5.6" width="3.2" height="3.4" rx="1" fill="#d4e2ee"/>
      <rect x="9.8" y="3.4" width="4.4" height="2.4" rx="1.2" fill="#7f95b0"/>
      <g stroke="#d4e2ee" stroke-width="1.1"><path d="M18.8 4.6v3.6M17 6.4h3.6M17.6 5.2l2.4 2.4M20 5.2l-2.4 2.4"/></g>`,
  suatan: `<path d="M3.4 11.6h17a8.5 8.5 0 01-17 0z" fill="#e8a86a" stroke="#c9884c" stroke-width="1.2"/>
      <ellipse cx="12" cy="11.6" rx="8.5" ry="2.2" fill="#f0bc86"/>
      <g fill="#a87840"><circle cx="8.6" cy="11.2" r="1.4"/><circle cx="12" cy="11.8" r="1.4"/><circle cx="15.4" cy="11.2" r="1.4"/><circle cx="10.3" cy="9.2" r="1.2"/><circle cx="13.8" cy="9.2" r="1.2"/></g>
      <g stroke="#c9b8a8" stroke-width="1.2" fill="none" stroke-linecap="round" opacity=".8"><path d="M9.4 6.6q1-1.4 0-2.8"/><path d="M14.4 6.6q1-1.4 0-2.8"/></g>`,
  banhthuong: `<path d="M6.4 8.2a2.6 2.6 0 10-2 4.3 2.6 2.6 0 102 4.3l11.2-2.6a2.6 2.6 0 102-4.3 2.6 2.6 0 10-2-4.3z" fill="#e8c98a" stroke="#c7a361" stroke-width="1.2" stroke-linejoin="round"/>
      <circle cx="10.4" cy="12.2" r=".9" fill="#c7a361"/><circle cx="13.6" cy="11.4" r=".9" fill="#c7a361"/>`,
  bovesinh: `<path d="M11 3.4h2v10.2h-2z" fill="#c9a97a"/>
      <path d="M6.6 13.6h10.8l-1.2 6.4a1.4 1.4 0 01-1.4 1.2H9.2a1.4 1.4 0 01-1.4-1.2z" fill="#a8c99a" stroke="#86ab77" stroke-width="1.2"/>
      <g stroke="#86ab77" stroke-width="1.2"><path d="M9.6 13.6v7.4M12 13.6v7.6M14.4 13.6v7.4"/></g>`,
  ga: `<path d="M3.4 8.6l8.6-4 8.6 4-8.6 4z" fill="#f4ecdc" stroke="#c9b8a0" stroke-width="1.2" stroke-linejoin="round"/>
      <path d="M3.4 8.6v7l8.6 4 8.6-4v-7" fill="#e8dcc8" stroke="#c9b8a0" stroke-width="1.2" stroke-linejoin="round"/>
      <path d="M12 12.6v7" stroke="#c9b8a0" stroke-width="1.2"/>`
};

/** Hình của một món vật tư. */
function itemArt(k, sz, cls) {
  const a = ITEM_ART[k];
  const s = sz || 22;
  if (!a) return `<span class="sw"></span>`;
  return `<svg class="iart ${cls || ''}" width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true">${a}</svg>`;
}

/* ============================================================
   HẠT HIỆU ỨNG
   ============================================================ */
const FX_SVG = {
  heart: '<path d="M12 21S3.5 15.7 3.5 10.4A4.8 4.8 0 0112 6.6a4.8 4.8 0 018.5 3.8C20.5 15.7 12 21 12 21z" fill="#ef7f9b"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.8-4.4 4.3 1 6.1L12 17l-5.4 2.8 1-6.1L3.2 9.4l6.1-.8z" fill="#f2c14e"/>',
  spark: '<path d="M12 2l1.9 7.4L21 11l-7.1 1.6L12 20l-1.9-7.4L3 11l7.1-1.6z" fill="#ffd98a"/>',
  paw: '<g fill="#a8836a"><circle cx="8" cy="8.5" r="2.4"/><circle cx="16" cy="8.5" r="2.4"/><circle cx="5.2" cy="13.6" r="2.1"/><circle cx="18.8" cy="13.6" r="2.1"/><ellipse cx="12" cy="16.4" rx="5" ry="4.2"/></g>',
  note: '<path d="M9 18V6l10-2v12" stroke="#c9a9d4" stroke-width="2" fill="none"/><circle cx="7" cy="18" r="3" fill="#c9a9d4"/><circle cx="17" cy="16" r="3" fill="#c9a9d4"/>',
  drop: '<path d="M12 3s6 7.2 6 11a6 6 0 01-12 0c0-3.8 6-11 6-11z" fill="#9fc8e4"/>',
  leaf: '<path d="M4 20C4 10 11 4 20 4c0 9-6 16-16 16z" fill="#a8c99a"/><path d="M5 19C8 14 12 10 18 7" stroke="#86ab77" stroke-width="1.6" fill="none"/>'
};
const FX_ASSVG = Object.keys(FX_SVG);

function fxParticle(kind) {
  if (FX_ASSVG.includes(kind)) return `<svg viewBox="0 0 24 24" aria-hidden="true">${FX_SVG[kind]}</svg>`;
  return '';   /* còn lại vẽ thuần bằng CSS qua class p-<kind> */
}
