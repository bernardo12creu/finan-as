const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePNG(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowOff = y * (stride + 1);
    const srcOff = y * stride;
    raw[rowOff] = 1; // Sub filter
    for (let x = 0; x < stride; x++) {
      const left = x >= 4 ? rgba[srcOff + x - 4] : 0;
      raw[rowOff + 1 + x] = (rgba[srcOff + x] - left) & 0xff;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const compressed = zlib.deflateSync(raw, { level: 9 });
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

function distSeg(px, py, ax, ay, bx, by) {
  const vx = bx - ax;
  const vy = by - ay;
  const len2 = vx * vx + vy * vy;
  let t = ((px - ax) * vx + (py - ay) * vy) / len2;
  t = Math.max(0, Math.min(1, t));
  const dx = px - (ax + t * vx);
  const dy = py - (ay + t * vy);
  return Math.sqrt(dx * dx + dy * dy);
}

function renderFechoTile(width, height, emblemSize, withBox) {
  const rgba = Buffer.alloc(width * height * 4);
  const cx = width / 2;
  const cy = height / 2;
  const s = emblemSize / 512;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      let r = 10;
      let g = 10;
      let b = 10;

      const u = (x - cx) / s + 256;
      const v = (y - cy) / s + 256;

      if (u >= -16 && u <= 528 && v >= -16 && v <= 528) {
        if (withBox) {
          const rx = Math.max(0, Math.abs(u - 256) - 180);
          const ry = Math.max(0, Math.abs(v - 256) - 180);
          const boxDist = Math.sqrt(rx * rx + ry * ry) - 76;
          if (boxDist <= 0) {
            r = 18;
            g = 22;
            b = 19;
          }
          if (Math.abs(boxDist) < 4) {
            r = 25;
            g = 68;
            b = 40;
          }
        }

        const ringDist = Math.abs(Math.sqrt((u - 256) ** 2 + (v - 256) ** 2) - 180);
        if (ringDist < 14) {
          const alpha = Math.max(0, Math.min(1, 1 - Math.max(0, ringDist - 10) / 4)) * 0.45;
          r = Math.round(r * (1 - alpha) + 34 * alpha);
          g = Math.round(g * (1 - alpha) + 197 * alpha);
          b = Math.round(b * (1 - alpha) + 94 * alpha);
        }

        const d1 = distSeg(u, v, 170, 260, 230, 320);
        const d2 = distSeg(u, v, 230, 320, 342, 192);
        const checkDist = Math.min(d1, d2);
        if (checkDist < 22) {
          const alpha = Math.max(0, Math.min(1, 1 - Math.max(0, checkDist - 18) / 4));
          r = Math.round(r * (1 - alpha) + 34 * alpha);
          g = Math.round(g * (1 - alpha) + 197 * alpha);
          b = Math.round(b * (1 - alpha) + 94 * alpha);
        }
      }

      rgba[idx] = r;
      rgba[idx + 1] = g;
      rgba[idx + 2] = b;
      rgba[idx + 3] = 255;
    }
  }
  return encodePNG(width, height, rgba);
}

const publicDir = path.resolve(__dirname, '../public');
const iconsDir = path.join(publicDir, 'icons');
const splashDir = path.join(publicDir, 'splash');
fs.mkdirSync(iconsDir, { recursive: true });
fs.mkdirSync(splashDir, { recursive: true });

fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), renderFechoTile(180, 180, 172, false));
fs.writeFileSync(path.join(iconsDir, 'icon-192x192.png'), renderFechoTile(192, 192, 180, false));
fs.writeFileSync(path.join(iconsDir, 'icon-512x512.png'), renderFechoTile(512, 512, 460, false));
fs.writeFileSync(path.join(iconsDir, 'icon-512x512-maskable.png'), renderFechoTile(512, 512, 340, false));

const splashes = [
  ['iphone-14.png', 1170, 2532],
  ['iphone-16.png', 1179, 2556],
  ['iphone-16-pro.png', 1206, 2622],
  ['iphone-16-plus.png', 1290, 2796],
  ['iphone-16-pro-max.png', 1320, 2868],
];

for (const [name, w, h] of splashes) {
  fs.writeFileSync(path.join(splashDir, name), renderFechoTile(w, h, 260, true));
}

console.log('iOS & PWA icons/splash screens generated successfully.');
