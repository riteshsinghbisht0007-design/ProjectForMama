import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function makeCrcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c;
  }
  return table;
}
const crcTable = makeCrcTable();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function createPng(width, height, isMaskable = false) {
  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  
  const ihdrLen = Buffer.alloc(4);
  ihdrLen.writeUInt32BE(13, 0);
  const ihdrType = Buffer.from('IHDR');
  const ihdrCrc = Buffer.alloc(4);
  ihdrCrc.writeUInt32BE(crc32(Buffer.concat([ihdrType, ihdrData])), 0);
  const ihdrChunk = Buffer.concat([ihdrLen, ihdrType, ihdrData, ihdrCrc]);
  
  const rowLen = width * 4 + 1;
  const rawData = Buffer.alloc(height * rowLen);
  
  const cx = width / 2;
  const cy = height / 2;
  const maxRadius = width / 2;
  // Safe zone for maskable icon is 80% (10% padding on all sides)
  const safeRadius = isMaskable ? maxRadius * 0.78 : maxRadius * 0.88;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowLen;
    rawData[rowOffset] = 0; // Filter: none
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      
      // Normalized coordinates from -1 to 1
      const nx = (x - cx) / safeRadius;
      const ny = (y - cy) / safeRadius;

      // Base background:
      if (isMaskable) {
        // Full bleed background for maskable
        rawData[pixelOffset] = 30;    // R: #1E3A8A
        rawData[pixelOffset + 1] = 58;  // G
        rawData[pixelOffset + 2] = 138; // B
        rawData[pixelOffset + 3] = 255; // A
      } else {
        const dist = Math.hypot(x - cx, y - cy);
        if (dist <= safeRadius) {
          rawData[pixelOffset] = 30;
          rawData[pixelOffset + 1] = 58;
          rawData[pixelOffset + 2] = 138;
          rawData[pixelOffset + 3] = 255;
        } else {
          rawData[pixelOffset] = 0;
          rawData[pixelOffset + 1] = 0;
          rawData[pixelOffset + 2] = 0;
          rawData[pixelOffset + 3] = 0;
          continue;
        }
      }

      // Police Shield Emblem shape inside the badge
      // Shield boundary: top horizontal (-0.5 <= nx <= 0.5, -0.6 <= ny <= -0.1), then curves down to (0, 0.6)
      const inShieldTop = Math.abs(nx) <= 0.5 && ny >= -0.65 && ny <= -0.15;
      const inShieldBottom = ny > -0.15 && ny <= 0.65 && Math.abs(nx) <= 0.5 * (1 - Math.pow((ny + 0.15) / 0.8, 1.6));
      
      if (inShieldTop || inShieldBottom) {
        // Gold emblem
        const shieldBorder = (Math.abs(nx) >= 0.42 && ny <= -0.15) || (ny >= 0.55);
        if (shieldBorder) {
          rawData[pixelOffset] = 245;   // #F59E0B
          rawData[pixelOffset + 1] = 158;
          rawData[pixelOffset + 2] = 11;
          rawData[pixelOffset + 3] = 255;
        } else {
          // Inside shield: Navy with star/scales symbol
          const starDist = Math.hypot(nx, ny - 0.05);
          if (starDist <= 0.18) {
            // Gold center star/scales
            rawData[pixelOffset] = 254;
            rawData[pixelOffset + 1] = 240;
            rawData[pixelOffset + 2] = 138; // Light Gold #FEF08A
            rawData[pixelOffset + 3] = 255;
          } else {
            rawData[pixelOffset] = 23;    // Darker Shield Navy #172554
            rawData[pixelOffset + 1] = 37;
            rawData[pixelOffset + 2] = 84;
            rawData[pixelOffset + 3] = 255;
          }
        }
      }
    }
  }
  
  const idatCompressed = zlib.deflateSync(rawData);
  const idatLen = Buffer.alloc(4);
  idatLen.writeUInt32BE(idatCompressed.length, 0);
  const idatType = Buffer.from('IDAT');
  const idatCrc = Buffer.alloc(4);
  idatCrc.writeUInt32BE(crc32(Buffer.concat([idatType, idatCompressed])), 0);
  const idatChunk = Buffer.concat([idatLen, idatType, idatCompressed, idatCrc]);
  
  const iendLen = Buffer.alloc(4);
  const iendType = Buffer.from('IEND');
  const iendCrc = Buffer.alloc(4);
  iendCrc.writeUInt32BE(crc32(iendType), 0);
  const iendChunk = Buffer.concat([iendLen, iendType, iendCrc]);
  
  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

const iconsDir = path.resolve('public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), createPng(192, 192, false));
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), createPng(512, 512, false));
fs.writeFileSync(path.join(iconsDir, 'icon-maskable-192.png'), createPng(192, 192, true));
fs.writeFileSync(path.join(iconsDir, 'icon-maskable-512.png'), createPng(512, 512, true));
fs.writeFileSync(path.join(iconsDir, 'badge-72.png'), createPng(72, 72, false));
fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.png'), createPng(180, 180, false));

console.log('Successfully generated all PWA icons in public/icons/');
