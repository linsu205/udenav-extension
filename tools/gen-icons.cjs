/* 生成 16/48/128 三个尺寸的扩展图标：圆角渐变底 + 白色 2×2 磁贴（导航网格意象）。
   纯像素数学画图 + 手写 PNG 编码，不依赖任何外部库。 */
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

/* ---------- PNG 编码 ---------- */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function encodePNG(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ---------- 图标绘制 ---------- */
/* 圆角矩形距离场：<=0 在内部 */
function roundedSDF(x, y, cx, cy, hw, hh, r) {
  const dx = Math.abs(x - cx) - (hw - r);
  const dy = Math.abs(y - cy) - (hh - r);
  const ox = Math.max(dx, 0), oy = Math.max(dy, 0);
  return Math.hypot(ox, oy) + Math.min(Math.max(dx, dy), 0) - r;
}
function lerp(a, b, t) { return a + (b - a) * t; }

function drawIcon(S) {
  const rgba = Buffer.alloc(S * S * 4);
  const half = S / 2;
  const bgR = S * 0.22;                       // 底板圆角
  const tile = S * 0.26, gap = S * 0.13;      // 2×2 磁贴
  const centers = [
    [-1, -1], [1, -1],
    [-1,  1], [1,  1],
  ];
  const alphas = [1, 0.62, 0.62, 0.82];
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const px = x + 0.5, py = y + 0.5;
      const i = (y * S + x) * 4;
      const d = roundedSDF(px, py, half, half, half - 0.5, half - 0.5, bgR);
      if (d > 0.5) { rgba[i + 3] = 0; continue; }            // 外部透明
      const t = py / S;
      let r = lerp(0x2b, 0x4e, t), g = lerp(0x58, 0x43, t), b = lerp(0x76, 0x76, t);
      let a = 255;
      if (d > -0.5) a = Math.round(255 * (1 - (d + 0.5)));   // 抗锯齿边缘
      /* 白色磁贴 */
      for (let k = 0; k < 4; k++) {
        const td = roundedSDF(px, py, half + centers[k][0] * (tile + gap) / 2, half + centers[k][1] * (tile + gap) / 2, tile / 2, tile / 2, tile * 0.28);
        if (td < 0.5) {
          const ta = alphas[k] * 255 * (td > -0.5 ? 1 - (td + 0.5) : 1);
          const na = ta / 255;
          r = lerp(r, 255, na); g = lerp(g, 255, na); b = lerp(b, 255, na);
        }
      }
      rgba[i] = Math.round(r); rgba[i + 1] = Math.round(g); rgba[i + 2] = Math.round(b); rgba[i + 3] = a;
    }
  }
  return encodePNG(S, S, rgba);
}

const outDir = path.join(__dirname, '..', 'icons');
for (const s of [16, 48, 128]) {
  fs.writeFileSync(path.join(outDir, `icon${s}.png`), drawIcon(s));
  console.log(`icon${s}.png OK`);
}
