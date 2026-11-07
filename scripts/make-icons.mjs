// 生成“加到桌面”用的 PNG 图标（无依赖）：蓝色渐变底 + 白色音符，和页面侧栏的 App 图标一致。
// 用法：node scripts/make-icons.mjs  → icons/icon-192.png、icon-512.png、icon-maskable-512.png、apple-touch-icon.png
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'icons');
fs.mkdirSync(OUT, { recursive: true });

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

// 音符形状，坐标系 24×24（与页面 i-music 图标相同的结构，做成实心）
const distSeg = (px, py, ax, ay, bx, by) => {
  const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
};
function inNote(x, y) {
  if (Math.hypot(x - 6.5, y - 18) <= 2.9) return true;          // 左音符头
  if (Math.hypot(x - 17.5, y - 16) <= 2.9) return true;         // 右音符头
  if (distSeg(x, y, 9.1, 18, 9.1, 5.4) <= 1.05) return true;    // 左符干
  if (distSeg(x, y, 20.1, 16, 20.1, 3.2) <= 1.05) return true;  // 右符干
  if (distSeg(x, y, 9.1, 5.6, 20.1, 3.4) <= 1.35) return true;  // 符杠
  return false;
}

function draw(size, { inset, rounded }) {
  const buf = Buffer.alloc(size * size * 4);
  const SS = 4; // 超采样抗锯齿
  const top = [0x6A, 0xA4, 0xFF], bot = [0x3A, 0x5B, 0xE0];
  const r = rounded ? size * 0.225 : 0;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let bg = 0, fg = 0;
    for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
      const px = x + (sx + .5) / SS, py = y + (sy + .5) / SS;
      // 圆角矩形背景
      let inside = true;
      if (r) {
        const cx = Math.min(Math.max(px, r), size - r), cy = Math.min(Math.max(py, r), size - r);
        inside = Math.hypot(px - cx, py - cy) <= r;
      }
      if (!inside) continue;
      bg++;
      // 音符放在中间，四周留 inset 比例的边距
      const span = size * (1 - 2 * inset);
      const nx = (px - size * inset) / span * 24, ny = (py - size * inset) / span * 24 + 0.6;
      if (inNote(nx, ny)) fg++;
    }
    const total = SS * SS, a = bg / total, f = bg ? fg / bg : 0;
    const t = y / size;
    const i = (y * size + x) * 4;
    for (let c = 0; c < 3; c++) {
      const base = top[c] + (bot[c] - top[c]) * t;
      buf[i + c] = Math.round(base + (255 - base) * f);
    }
    buf[i + 3] = Math.round(a * 255);
  }
  return png(size, buf);
}

const jobs = [
  ['icon-192.png', 192, { inset: 0.2, rounded: true }],
  ['icon-512.png', 512, { inset: 0.2, rounded: true }],
  ['icon-maskable-512.png', 512, { inset: 0.27, rounded: false }],  // 安卓自适应图标：内容在安全区内
  ['apple-touch-icon.png', 180, { inset: 0.2, rounded: false }],    // iPhone 会自己切圆角
];
for (const [name, size, opt] of jobs) {
  fs.writeFileSync(path.join(OUT, name), draw(size, opt));
  console.log('wrote icons/' + name);
}
