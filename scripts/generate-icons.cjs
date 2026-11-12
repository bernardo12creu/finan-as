const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Function to generate a simple PNG buffer with a solid color and size
function createPng(width, height, r, g, b) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor (RGB)
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(4 + 4 + len + 4);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4);
    data.copy(buf, 8);
    // CRC calculation
    let crc = 0xffffffff;
    const chunkData = buf.subarray(4, 8 + len);
    for (let i = 0; i < chunkData.length; i++) {
      crc ^= chunkData[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
      }
    }
    buf.writeInt32BE(crc ^ 0xffffffff, 8 + len);
    return buf;
  }

  const ihdrChunk = makeChunk('IHDR', ihdr);

  // Scanlines: 1 filter byte (0) + width * 3 bytes
  const scanlineLen = 1 + width * 3;
  const rawData = Buffer.alloc(scanlineLen * height);

  for (let y = 0; y < height; y++) {
    const offset = y * scanlineLen;
    rawData[offset] = 0; // Filter None
    for (let x = 0; x < width; x++) {
      // Create a green border/accent
      const isCenter = Math.abs(x - width/2) < width*0.35 && Math.abs(y - height/2) < height*0.35;
      const pixelOffset = offset + 1 + x * 3;
      if (isCenter) {
        rawData[pixelOffset] = 0x22; // R
        rawData[pixelOffset + 1] = 0xC5; // G
        rawData[pixelOffset + 2] = 0x5E; // B
      } else {
        rawData[pixelOffset] = r;
        rawData[pixelOffset + 1] = g;
        rawData[pixelOffset + 2] = b;
      }
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const iconsDir = path.resolve(__dirname, '../public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

fs.writeFileSync(path.join(iconsDir, 'icon-192x192.png'), createPng(192, 192, 10, 10, 10));
fs.writeFileSync(path.join(iconsDir, 'icon-512x512.png'), createPng(512, 512, 10, 10, 10));
fs.writeFileSync(path.join(iconsDir, 'icon-512x512-maskable.png'), createPng(512, 512, 10, 10, 10));
console.log('PWA icons created successfully.');
