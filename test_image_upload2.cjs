const fs = require('fs');

async function test() {
  const fileBytes = fs.readFileSync('dist/assets/index-5_ooisdy.css'); // just reading some text file to base64
  // Actually I need a real JPEG image, I'll generate a 200x200 red JPEG using node canvas
  // Instead, let's just make a very basic POST using the same test_ocr.cjs but with a valid tiny JPEG.
}
test();
