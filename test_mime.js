const image = 'data:base64,iVBOR...';
let actualMime = 'image/jpeg';
if (image.startsWith('data:')) {
  const extractedMime = image.split(';')[0].split(':')[1];
  if (extractedMime) {
    actualMime = extractedMime;
  }
}
console.log(actualMime);
