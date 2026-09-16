const fs = require('fs');

async function test() {
  const fileBytes = fs.readFileSync('public/icon.png');
  const base64 = fileBytes.toString('base64');
  const imgData = `data:image/png;base64,${base64}`;

  const res = await fetch('http://localhost:3000/api/ocr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: imgData, mimeType: 'image/png' })
  });
  console.log("Status:", res.status);
  const data = await res.text();
  console.log("Response:", data);
}
test();
