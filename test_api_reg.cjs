const http = require('http');

const data = JSON.stringify({
  name: 'Test',
  badgeNumber: '123',
  email: 'test1234@delhipolice.gov.in',
  policeStation: 'PS',
  district: 'D',
  rank: 'SI',
  password: 'test'
});

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Reg Response:', res.statusCode, body);
    const cookie = res.headers['set-cookie']?.[0];
    if (cookie) {
      const token = cookie.split(';')[0];
      
      const summonData = JSON.stringify({
        summonNumber: 'S-123',
        caseNumber: 'FIR-456',
        personName: 'Test Name',
        address: 'Test Addr',
        courtName: 'Test Court',
        hearingDate: '2026-12-12',
        status: 'Pending',
        urgency: 'Standard'
      });
      
      const req2 = http.request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/summons',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(summonData),
          'Cookie': token
        }
      }, (res2) => {
        let body2 = '';
        res2.on('data', chunk => body2 += chunk);
        res2.on('end', () => {
          console.log('Save Summon Response:', res2.statusCode, body2);
        });
      });
      req2.write(summonData);
      req2.end();
    }
  });
});
req.write(data);
req.end();
