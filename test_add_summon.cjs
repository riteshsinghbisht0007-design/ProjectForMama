async function test() {
  console.log("Fetching summons...");
  try {
    const res = await fetch('http://localhost:3000/api/summons', {
        headers: { 'Cookie': 'auth_token=placeholder' }
    });
    console.log(res.status);
    const data = await res.text();
    console.log(data);
  } catch (e) {
    console.error(e);
  }
}
test();
