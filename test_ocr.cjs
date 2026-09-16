const fs = require('fs');

async function test() {
  const imgData = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
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
