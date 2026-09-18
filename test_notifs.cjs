const http = require('http');

// Use the cookie from the earlier test
const cookie = 'auth_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YWFjYTI3YTI5YmUxN2JlZDUzYjBiZGUiLCJpYXQiOjE3ODk2OTg2ODMsImV4cCI6MTc5MDMwMzQ4M30.5DLKQYAf_WNiplcpDybq0jGSwTDY1E9TUXJR_eByTag';

const today = new Date().toISOString().split('T')[0];

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: `/api/notifications?today=${today}&upcomingDays=7`,
  method: 'GET',
  headers: {
    'Cookie': cookie
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Get Notifications:', res.statusCode, data));
});
req.end();
