// 生成“加到桌面”用的 PNG 图标（无依赖的小型矢量光栅器，4×4 超采样抗锯齿）。
// 画面（苹果 App 图标风格）：系统蓝渐变底，一个简洁的卡通小朋友头像，头顶压着白色大写字母 A B C。
// 用法：node scripts/make-icons.mjs  → icons/icon-192.png、icon-512.png、icon-maskable-512.png、apple-touch-icon.png
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'icons');
fs.mkdirSync(OUT, { recursive: true });

/* ---------- PNG 编码 ---------- */
const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = buf => { let c = 0xFFFFFFFF; for (const b of buf) c = crcTable[(c ^ b) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) { raw[y * (size * 4 + 1)] = 0; rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4); }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

/* ---------- 形状（坐标系 0–100） ---------- */
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const distSeg = (px, py, ax, ay, bx, by) => {
  const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy;
  const t = l ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l)) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
};
const norm = a => ((a % 360) + 360) % 360;
function inside(s, x, y) {
  switch (s.t) {
    case 'circle': return Math.hypot(x - s.cx, y - s.cy) <= s.r;
    case 'ellipse': return ((x - s.cx) / s.rx) ** 2 + ((y - s.cy) / s.ry) ** 2 <= 1;
    case 'seg': return distSeg(x, y, s.ax, s.ay, s.bx, s.by) <= s.r;
    case 'halfdisk': return y >= s.cy && Math.hypot(x - s.cx, y - s.cy) <= s.r;
    case 'arc': {
      const d = Math.hypot(x - s.cx, y - s.cy);
      const a = norm(Math.atan2(y - s.cy, x - s.cx) * 180 / Math.PI);
      const a0 = norm(s.a0), span = norm(s.a1 - s.a0) || 360;
      if (Math.abs(d - s.R) <= s.w && norm(a - a0) <= span) return true;
      // 圆头
      const end = deg => [s.cx + s.R * Math.cos(deg * Math.PI / 180), s.cy + s.R * Math.sin(deg * Math.PI / 180)];
      const [x0, y0] = end(s.a0), [x1, y1] = end(s.a1);
      return Math.hypot(x - x0, y - y0) <= s.w || Math.hypot(x - x1, y - y1) <= s.w;
    }
    default: return false;
  }
}
// 把形状整体平移 / 加粗（用于描边和投影）
function grow(s, g, dx = 0, dy = 0) {
  const o = { ...s };
  if ('cx' in o) { o.cx += dx; o.cy += dy; }
  if ('ax' in o) { o.ax += dx; o.ay += dy; o.bx += dx; o.by += dy; }
  if (o.t === 'circle' || o.t === 'halfdisk') o.r += g;
  if (o.t === 'ellipse') { o.rx += g; o.ry += g; }
  if (o.t === 'seg') o.r += g;
  if (o.t === 'arc') o.w += g;
  return o;
}

/* ---------- 字母 A B C（粗圆头笔画） ---------- */
function letter(ch, ox, oy, w) {
  const S = (ax, ay, bx, by) => ({ t: 'seg', ax: ox + ax, ay: oy + ay, bx: ox + bx, by: oy + by, r: w });
  const A = (cx, cy, R, a0, a1) => ({ t: 'arc', cx: ox + cx, cy: oy + cy, R, a0, a1, w });
  if (ch === 'A') return [S(0, 24, 9, 0), S(9, 0, 18, 24), S(4, 15.5, 14, 15.5)];
  if (ch === 'B') return [S(1.5, 0, 1.5, 24), S(1.5, 0, 8.5, 0), A(8.5, 5.75, 5.75, -90, 90), S(8.5, 11.5, 1.5, 11.5),
    S(1.5, 11.5, 9.5, 11.5), A(9.5, 17.75, 6.25, -90, 90), S(9.5, 24, 1.5, 24)];
  if (ch === 'C') return [A(11, 12, 11.2, 42, 318)];
  return [];
}

/* ---------- 场景（苹果 App 图标风格：单一主体、柔和渐变、无描边、柔和投影） ----------
   颜色可以是 '#RRGGBB'，也可以是 [上色, 下色, y0, y1] 表示在 y0→y1 之间的竖向渐变。 */
function scene() {
  const L = [];
  const add = (s, c, a = 1) => L.push([s, c, a]);
  // 柔和投影：用一圈圈逐渐变大、很淡的副本近似模糊
  const shadow = (s, dy, spread, alpha, steps = 6) => {
    for (let k = steps; k >= 1; k--) add(grow(s, spread * k / steps, 0, dy), '#0A2A6B', alpha / steps);
  };
  // 顶部一层很淡的高光，增加一点玻璃质感

  // 肩膀（上衣）
  const body = { t: 'ellipse', cx: 50, cy: 112, rx: 30, ry: 25 };
  shadow(body, 1.5, 3, 0.18);
  add(body, ['#FFB35C', '#FF7F36', 87, 112]);
  add({ t: 'halfdisk', cx: 50, cy: 87.2, r: 6.2 }, ['#FFE7CF', '#F6C9A0', 87, 93]); // 领口露出的脖子

  // 头部投影
  const head = { t: 'circle', cx: 50, cy: 66, r: 22.5 };
  shadow(head, 2.2, 3.2, 0.22);
  // 头发（后层，整颗头的轮廓）
  add(head, ['#6B4630', '#3E2718', 43, 88]);
  // 脸
  add({ t: 'ellipse', cx: 50, cy: 70.5, rx: 20.2, ry: 17.8 }, ['#FFE3C4', '#F6C196', 53, 88]);
  // 刘海：两片柔和的弧形
  add({ t: 'ellipse', cx: 42, cy: 55.2, rx: 13.5, ry: 6.4 }, ['#6B4630', '#4A2F1E', 49, 62]);
  add({ t: 'ellipse', cx: 59.5, cy: 56, rx: 10.5, ry: 5.2 }, ['#6B4630', '#4A2F1E', 50, 62]);
  // 眼睛：简单的深色椭圆 + 小高光
  for (const cx of [42.5, 57.5]) {
    add({ t: 'ellipse', cx, cy: 69.5, rx: 2.7, ry: 3.5 }, '#2A1A12');
    add({ t: 'circle', cx: cx + 0.9, cy: 68.2, r: 0.95 }, '#FFFFFF');
  }
  // 腮红
  for (const cx of [36.5, 63.5]) add({ t: 'ellipse', cx, cy: 76, rx: 3.6, ry: 2.3 }, '#FF8A9B', 0.45);
  // 微笑
  add({ t: 'arc', cx: 50, cy: 73.8, R: 4.6, a0: 25, a1: 155, w: 0.85 }, '#7A3B26');

  // 白色大写字母 ABC，压在头顶上
  const letters = [['A', 13.5, 20.5], ['B', 41.2, 20.5], ['C', 63.2, 20.5]];
  const W = 2.9;
  for (const [ch, x, y] of letters) for (const st of letter(ch, x, y, W)) shadow(st, 1.4, 1.8, 0.28, 4);
  for (const [ch, x, y] of letters) for (const st of letter(ch, x, y, W)) add(st, ['#FFFFFF', '#EAF4FF', y, y + 24]);
  return L;
}

const colorAt = (c, v) => {
  if (typeof c === 'string') return hex(c);
  const [c1, c2, y0, y1] = c, t = Math.max(0, Math.min(1, (v - y0) / (y1 - y0)));
  const a = hex(c1), b = hex(c2);
  return a.map((x, i) => x + (b[i] - x) * t);
};

function draw(size, { scale, rounded }) {
  const layers = scene();
  const buf = Buffer.alloc(size * size * 4);
  const SS = 4;
  const top = hex('#62C6FF'), bot = hex('#1C6FF0'); // 接近 iOS 系统蓝的渐变
  const rr = rounded ? size * 0.225 : 0;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let R = 0, G = 0, B = 0, A = 0;
    for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
      const px = x + (sx + .5) / SS, py = y + (sy + .5) / SS;
      if (rr) {
        const cx = Math.min(Math.max(px, rr), size - rr), cy = Math.min(Math.max(py, rr), size - rr);
        if (Math.hypot(px - cx, py - cy) > rr) continue;
      }
      const t = py / size;
      let c = top.map((v, i) => v + (bot[i] - v) * t);
      const u = 50 + (px / size * 100 - 50) / scale, v = 50 + (py / size * 100 - 50) / scale;
      for (const [s, col, a] of layers) if (inside(s, u, v)) { const k = colorAt(col, v); c = c.map((ch, i) => ch + (k[i] - ch) * a); }
      R += c[0]; G += c[1]; B += c[2]; A++;
    }
    const i = (y * size + x) * 4, n = SS * SS;
    if (A) { buf[i] = Math.round(R / A); buf[i + 1] = Math.round(G / A); buf[i + 2] = Math.round(B / A); }
    buf[i + 3] = Math.round(A / n * 255);
  }
  return png(size, buf);
}

const jobs = [
  ['icon-192.png', 192, { scale: 1, rounded: true }],
  ['icon-512.png', 512, { scale: 1, rounded: true }],
  ['icon-maskable-512.png', 512, { scale: 0.8, rounded: false }], // 安卓自适应图标：内容缩进安全区
  ['apple-touch-icon.png', 180, { scale: 1, rounded: false }],     // iPhone 会自己切圆角
];
for (const [name, size, opt] of jobs) {
  fs.writeFileSync(path.join(OUT, name), draw(size, opt));
  console.log('wrote icons/' + name);
}
