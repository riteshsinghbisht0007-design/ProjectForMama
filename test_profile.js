fetch("http://localhost:3000/api/auth/me", {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ displayName: "Test" })
})
.then(async res => {
  console.log("Status:", res.status);
  const text = await res.text();
  console.log("Body:", text);
})
.catch(err => console.error(err));
