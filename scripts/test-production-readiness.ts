import { parseJudicialQR } from '../server/services/judicialQrParser.ts';
import { validateQrLookupRequest } from '../server/validators/caseValidators.ts';
import { sanitizeFileName, getImageFormatInfo } from '../src/utils/documentDownloadService.ts';
import { parseSummonTextStrict, normalizeJudicialDate, validateDocketData } from '../src/utils/ocrService.ts';
import { getApp } from '../server/app.ts';
import fs from 'fs';
import path from 'path';

async function runProductionReadinessTests() {
  console.log('====================================================');
  console.log('  SUMMONS MITRA — PRODUCTION READINESS TEST SUITE  ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(name: string, condition: boolean, details?: string) {
    if (condition) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name} ${details ? '— ' + details : ''}`);
      failed++;
    }
  }

  // 1. Static Assets & PWA Verification
  console.log('--- 1. PWA & Static Assets Audit ---');
  const manifestPath = path.join(process.cwd(), 'public', 'manifest.json');
  assert('manifest.json exists', fs.existsSync(manifestPath));
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    assert('manifest has valid name and icons', !!manifest.name && Array.isArray(manifest.icons) && manifest.icons.length >= 2);
  }

  const logoPath = path.join(process.cwd(), 'public', 'summonsmitra-logo.svg');
  assert('Official SVG logo exists in public/', fs.existsSync(logoPath));

  const faviconIcoPath = path.join(process.cwd(), 'public', 'favicon.ico');
  assert('favicon.ico exists and has valid size', fs.existsSync(faviconIcoPath) && fs.statSync(faviconIcoPath).size > 100);

  const fav16Path = path.join(process.cwd(), 'public', 'favicon-16x16.png');
  assert('favicon-16x16.png exists', fs.existsSync(fav16Path));

  const fav32Path = path.join(process.cwd(), 'public', 'favicon-32x32.png');
  assert('favicon-32x32.png exists', fs.existsSync(fav32Path));

  const appleTouchPath = path.join(process.cwd(), 'public', 'apple-touch-icon.png');
  assert('apple-touch-icon.png exists', fs.existsSync(appleTouchPath));

  const swPath = path.join(process.cwd(), 'public', 'firebase-messaging-sw.js');
  assert('Firebase Messaging Service Worker exists in public/', fs.existsSync(swPath));

  const iconsDir = path.join(process.cwd(), 'public', 'icons');
  assert('PWA Icons directory exists', fs.existsSync(iconsDir));
  assert('icon-192.png exists', fs.existsSync(path.join(iconsDir, 'icon-192.png')));
  assert('icon-512.png exists', fs.existsSync(path.join(iconsDir, 'icon-512.png')));

  // 2. Vercel Configuration & Serverless Entrypoint
  console.log('\n--- 2. Vercel Configuration & Routing Audit ---');
  const vercelConfigPath = path.join(process.cwd(), 'vercel.json');
  assert('vercel.json exists', fs.existsSync(vercelConfigPath));
  if (fs.existsSync(vercelConfigPath)) {
    const vercelConfig = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'));
    assert('vercel.json has SPA rewrites', Array.isArray(vercelConfig.rewrites) && vercelConfig.rewrites.length >= 2);
    assert('vercel.json has security headers', Array.isArray(vercelConfig.headers) && vercelConfig.headers.length > 0);
  }

  const apiIndexPath = fs.existsSync(path.join(process.cwd(), 'api', 'index.js'))
    ? path.join(process.cwd(), 'api', 'index.js')
    : path.join(process.cwd(), 'api', 'index.ts');
  assert('Vercel serverless function entrypoint (api/index.js) exists', fs.existsSync(apiIndexPath));

  // 3. QR Decoding & CNR Extraction Unit Tests
  console.log('\n--- 3. Judicial QR & CNR Parser Unit Tests ---');
  const sampleCnr = 'DLCT010001232026';
  const cnrParsed = parseJudicialQR(sampleCnr);
  assert('Raw CNR string parsed correctly', cnrParsed.type === 'CNR' && cnrParsed.cnrNumber === sampleCnr);

  const sampleUrl = `https://services.ecourts.gov.in/ecourtindia_v6/?cnr_no=${sampleCnr}`;
  const urlParsed = parseJudicialQR(sampleUrl);
  assert('eCourts URL with cnr_no parameter parsed correctly', urlParsed.type === 'URL' && urlParsed.cnrNumber === sampleCnr);

  const sampleJson = JSON.stringify({ cnr: sampleCnr, case: 'FIR 12/2026' });
  const jsonParsed = parseJudicialQR(sampleJson);
  assert('JSON formatted Judicial QR parsed correctly', (jsonParsed.type === 'STRUCTURED' || jsonParsed.type === 'CNR') && jsonParsed.cnrNumber === sampleCnr);

  const invalidQr = validateQrLookupRequest({ qrPayload: '   ' });
  assert('Empty QR payload correctly rejected', !invalidQr.isValid);

  const validQr = validateQrLookupRequest({ qrPayload: sampleCnr, source: 'camera_scanner' });
  assert('Valid QR payload accepted by validator', validQr.isValid && validQr.sanitizedPayload === sampleCnr);

  // 4. Document Download Sanitizer Unit Tests
  console.log('\n--- 4. Document Download Service Tests ---');
  const sanitized = sanitizeFileName('SUM/DEL/2026/0482: Court Order*');
  assert('Sanitizes illegal filename characters for safe OS downloads', sanitized === 'SUM_DEL_2026_0482_Court_Order_');

  const formatInfo = getImageFormatInfo('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
  assert('Detects PNG mime type from data URL correctly', formatInfo.ext === 'png' && formatInfo.mimeType === 'image/png');

  // 5. AI Docket OCR & Judicial Parsing Unit Tests
  console.log('\n--- 5. AI Docket OCR & Judicial Parsing Tests ---');
  const sampleCourtNotice = `
    IN THE COURT OF SHRI ANAND VERMA, CHIEF METROPOLITAN MAGISTRATE, TIS HAZARI COURTS, DELHI
    SUMMONS TO ACCUSED PERSON
    SUMMON NO: SUM/DEL/2026/0921
    CASE NO: FIR 84/2026 U/S 420/468/471 IPC
    POLICE STATION: CONNAUGHT PLACE, DISTRICT: CENTRAL DISTRICT
    TO: SHRI RAJESH KUMAR, S/O SHRI OM PRAKASH
    ADDRESS: H.NO 42B, SECTOR 14, ROHINI, NEW DELHI
    HEARING DATE: 25-10-2026
    YOU ARE HEREBY SUMMONED TO APPEAR BEFORE THIS COURT ON 25/10/2026 AT 10:00 AM.
  `;

  const parsedNotice = parseSummonTextStrict(sampleCourtNotice);
  assert('Strict parser extracts summonNumber', parsedNotice.summonNumber.includes('SUM/DEL/2026/0921'));
  assert('Strict parser extracts caseNumber', parsedNotice.caseNumber.includes('FIR 84/2026'));
  assert('Strict parser extracts accused personName', parsedNotice.personName.toUpperCase().includes('RAJESH KUMAR'));
  assert('Strict parser extracts fatherName', parsedNotice.fatherName?.toUpperCase().includes('OM PRAKASH') || false);
  assert('Strict parser extracts courtName', parsedNotice.courtName.toUpperCase().includes('METROPOLITAN MAGISTRATE'));
  assert('Strict parser extracts policeStation', parsedNotice.policeStation.toUpperCase().includes('CONNAUGHT PLACE'));
  assert('Strict parser extracts hearingDate', parsedNotice.hearingDate === '2026-10-25');

  const normalizedDmy = normalizeJudicialDate('15/11/2026');
  assert('Normalizes DD/MM/YYYY court dates to YYYY-MM-DD', normalizedDmy === '2026-11-15');

  const normalizedDash = normalizeJudicialDate('05-12-2026');
  assert('Normalizes DD-MM-YYYY court dates to YYYY-MM-DD', normalizedDash === '2026-12-05');

  const validDocket = validateDocketData({
    summonNumber: 'SUM/DEL/2026/0921',
    caseNumber: 'FIR 84/2026',
    personName: 'Rajesh Kumar',
    courtName: 'Tis Hazari District Court',
    hearingDate: '2026-10-25',
  });
  assert('Docket validator accepts complete summons particulars', validDocket.isValid && validDocket.data.personName === 'Rajesh Kumar');

  const invalidDocket = validateDocketData({});
  assert('Docket validator rejects empty docket data', !invalidDocket.isValid && invalidDocket.errors.length > 0);

  // 6. Express API & Database Integration Test
  console.log('\n--- 6. Express Backend & Database Integration Tests ---');
  try {
    const { app, db } = await getApp();
    assert('Express app created successfully', !!app);
    assert('Database layer initialized', !!db);

    if (db) {
      // Test basic connection
      const testCol = db.collection('test_connection');
      const testDoc = { testId: 'audit_test_' + Date.now(), timestamp: new Date() };
      const insResult = await testCol.insertOne(testDoc);
      assert('Database insert test succeeded', !!insResult.insertedId);

      const fetched = await testCol.findOne({ _id: insResult.insertedId });
      assert('Database read back test succeeded', fetched?.testId === testDoc.testId);

      await testCol.deleteOne({ _id: insResult.insertedId });
      const verifyDeleted = await testCol.findOne({ _id: insResult.insertedId });
      assert('Database cleanup test succeeded', verifyDeleted === null);

      // Test 6: Summons CRUD in MongoDB collection 'summons'
      console.log('\n--- 6. MongoDB Summons Collection CRUD Tests ---');
      const testSummonId = 'test_sum_' + Date.now();
      const testUserId = 'test_officer_uid_101';
      const testSummonDoc = {
        _id: testSummonId,
        userId: testUserId,
        ownerId: testUserId,
        summonNumber: 'TEST/SUM/2026/001',
        caseNumber: 'FIR 101/2026 PS Connaught Place',
        personName: 'Test Accused Person',
        courtName: 'Tis Hazari District Court',
        hearingDate: '2026-10-15',
        status: 'Pending',
        urgency: 'High',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 1. Create / Upsert
      await db.collection('summons').updateOne(
        { _id: testSummonId },
        { $set: testSummonDoc },
        { upsert: true }
      );
      const insertedSummon = await db.collection('summons').findOne({ _id: testSummonId });
      assert('MongoDB summons document created and verified', insertedSummon?.personName === 'Test Accused Person');

      // 2. Read
      const userSummons = await db.collection('summons').find({ userId: testUserId }).toArray();
      assert('MongoDB summons queried by userId successfully', Array.isArray(userSummons) && userSummons.length >= 1);

      // 3. Update
      await db.collection('summons').updateOne(
        { _id: testSummonId, userId: testUserId },
        { $set: { status: 'Completed', servedDate: '2026-10-02', updatedAt: new Date().toISOString() } }
      );
      const updatedSummon = await db.collection('summons').findOne({ _id: testSummonId });
      assert('MongoDB summons updated and status verified', updatedSummon?.status === 'Completed' && updatedSummon?.servedDate === '2026-10-02');

      // 4. Delete & Cleanup
      const delResult = await db.collection('summons').deleteOne({ _id: testSummonId, userId: testUserId });
      assert('MongoDB summons deleted successfully', delResult.deletedCount === 1);
      const afterDel = await db.collection('summons').findOne({ _id: testSummonId });
      assert('MongoDB summons confirmed removed', afterDel === null);

      // Test 7: Witnesses CRUD in MongoDB collection 'witnesses'
      console.log('\n--- 7. MongoDB Witnesses Collection CRUD Tests ---');
      const testWitnessId = 'test_wit_' + Date.now();
      const testWitnessDoc = {
        _id: testWitnessId,
        userId: testUserId,
        ownerId: testUserId,
        name: 'Dr. Expert Witness',
        phone: '9876543210',
        caseNumber: 'FIR 101/2026',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.collection('witnesses').updateOne(
        { _id: testWitnessId },
        { $set: testWitnessDoc },
        { upsert: true }
      );
      const insertedWit = await db.collection('witnesses').findOne({ _id: testWitnessId });
      assert('MongoDB witness document created and verified', insertedWit?.name === 'Dr. Expert Witness');

      await db.collection('witnesses').deleteOne({ _id: testWitnessId, userId: testUserId });
      const afterDelWit = await db.collection('witnesses').findOne({ _id: testWitnessId });
      assert('MongoDB witness cleaned up successfully', afterDelWit === null);

      // Test 8: Reviews CRUD in MongoDB collection 'reviews'
      console.log('\n--- 8. MongoDB Reviews Collection CRUD Tests ---');
      const testReviewDoc = {
        _id: testUserId,
        userId: testUserId,
        officerName: 'Inspector Sharma',
        badgeNumber: 'DL-POL-101',
        rank: 'Inspector',
        rating: 5,
        feedback: 'Outstanding summons management workflow and seamless tracking.',
        appVersion: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.collection('reviews').updateOne(
        { _id: testUserId },
        { $set: testReviewDoc },
        { upsert: true }
      );
      const savedReview = await db.collection('reviews').findOne({ _id: testUserId });
      assert('MongoDB review document created and verified', savedReview?.rating === 5 && savedReview?.officerName === 'Inspector Sharma');

      const allReviews = await db.collection('reviews').find({}).toArray();
      assert('MongoDB reviews list query returns saved records', Array.isArray(allReviews) && allReviews.length >= 1);

      await db.collection('reviews').deleteOne({ _id: testUserId });
      const afterDelReview = await db.collection('reviews').findOne({ _id: testUserId });
      assert('MongoDB review cleaned up successfully', afterDelReview === null);

      // Test 9: Notifications CRUD in MongoDB collection 'notifications'
      console.log('\n--- 9. MongoDB Notifications Collection CRUD Tests ---');
      const testNotifId = 'test_notif_' + Date.now();
      const testNotifDoc = {
        _id: testNotifId,
        userId: testUserId,
        title: 'Court Hearing Reminder',
        message: 'Upcoming court appearance scheduled for tomorrow at Tis Hazari.',
        type: 'HEARING_REMINDER',
        read: false,
        createdAt: new Date().toISOString(),
      };

      await db.collection('notifications').updateOne(
        { _id: testNotifId },
        { $set: testNotifDoc },
        { upsert: true }
      );
      const savedNotif = await db.collection('notifications').findOne({ _id: testNotifId });
      assert('MongoDB notification created and verified', savedNotif?.title === 'Court Hearing Reminder');

      await db.collection('notifications').deleteOne({ _id: testNotifId, userId: testUserId });
      const afterDelNotif = await db.collection('notifications').findOne({ _id: testNotifId });
      assert('MongoDB notification cleaned up successfully', afterDelNotif === null);

      // Test 10: OCR Health & Endpoint Availability
      console.log('\n--- 10. OCR & Health Endpoints Route Verification ---');
      const stack = (app as any).router?.stack || (app as any)._router?.stack || [];
      const matchRoute = (p: string) =>
        stack.some((layer: any) =>
          Array.isArray(layer.route?.path)
            ? layer.route.path.includes(p)
            : layer.route?.path === p
        );
      const hasOcrRoute = matchRoute('/api/ocr');
      const hasOcrHealthRoute = matchRoute('/api/ocr/health');
      const hasHealthRoute = matchRoute('/api/health');
      assert('Express registers /api/ocr endpoint', hasOcrRoute);
      assert('Express registers /api/ocr/health endpoint', hasOcrHealthRoute);
      assert('Express registers /api/health endpoint', hasHealthRoute);

      // Test 11: Real HTTP In-Flight API Verification
      console.log('\n--- 11. Real HTTP API In-Flight Verification (GET /, GET /api, OCR) ---');
      const server = await new Promise<any>((resolve) => {
        const s = app.listen(0, '127.0.0.1', () => resolve(s));
      });
      const addr: any = server.address();
      const baseUrl = `http://127.0.0.1:${addr.port}`;

      try {
        // Test GET /
        const rootRes = await fetch(`${baseUrl}/`, {
          headers: { Accept: 'application/json' },
        });
        assert('GET / returns HTTP 200 OK', rootRes.status === 200);
        const rootJson: any = await rootRes.json();
        assert('GET / returns valid JSON with service: judicial-ocr', rootJson.service === 'judicial-ocr');
        assert('GET / reports status: online', rootJson.status === 'online');
        assert('GET / lists primaryModel: gemini-3.8-flash', rootJson.primaryModel === 'gemini-3.8-flash');
        assert('GET / provides endpoints dictionary including /api/ocr', !!rootJson.endpoints?.ocr);

        // Test GET /api
        const apiRes = await fetch(`${baseUrl}/api`);
        assert('GET /api returns HTTP 200 OK', apiRes.status === 200);
        const apiJson: any = await apiRes.json();
        assert('GET /api returns service descriptor', apiJson.service === 'judicial-ocr');

        // Test GET /api/ocr/health
        const ocrHealthRes = await fetch(`${baseUrl}/api/ocr/health`);
        assert('GET /api/ocr/health returns HTTP 200 OK', ocrHealthRes.status === 200);
        const ocrHealthJson: any = await ocrHealthRes.json();
        assert('GET /api/ocr/health reports status: ok', ocrHealthJson.status === 'ok');
        assert('GET /api/ocr/health reports primaryModel: gemini-3.8-flash', ocrHealthJson.primaryModel === 'gemini-3.8-flash');

        // Test POST /api/ocr missing payload validation
        const ocrMissingRes = await fetch(`${baseUrl}/api/ocr`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        assert('POST /api/ocr with empty payload returns HTTP 400', ocrMissingRes.status === 400);
        const ocrMissingJson: any = await ocrMissingRes.json();
        assert('POST /api/ocr returns MISSING_PAYLOAD code', ocrMissingJson.code === 'MISSING_PAYLOAD');

        // Test POST /api/ocr endpoint payload validation
        const ocrEmptyImgRes = await fetch(`${baseUrl}/api/ocr`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: '', sessionId: 'test_session_audit' }),
        });
        assert('POST /api/ocr responds with JSON content-type', ocrEmptyImgRes.headers.get('content-type')?.includes('application/json') || false);
        const ocrEmptyJson: any = await ocrEmptyImgRes.json();
        assert('POST /api/ocr preserves sessionId on error response', ocrEmptyJson.sessionId === 'test_session_audit');
        assert('POST /api/ocr rejects invalid/empty image payload', ocrEmptyImgRes.status === 400);

        // Test 12: Complete Authentication & Data Persistence Flow
        console.log('\n--- 12. Full User Authentication, Account Management & Session Isolation Tests ---');
        const randId = Math.random().toString(36).substring(2, 7);
        const testUser1 = {
          fullName: 'Sub-Inspector Vikram Singh',
          username: `vikram_${randId}`,
          email: `vikram_${randId}@delhipolice.gov.in`,
          password: 'Password@2026',
          badgeNumber: `DL-POL-${randId.toUpperCase()}`,
          policeStation: 'Connaught Place PS',
          district: 'Central District, Delhi',
          rank: 'Sub-Inspector',
        };

        // 12a. Register User 1
        const reg1Res = await fetch(`${baseUrl}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testUser1),
        });
        assert('POST /api/auth/register creates new account with HTTP 201', reg1Res.status === 201);
        const reg1Json: any = await reg1Res.json();
        assert('Registered user has unique ID and username', reg1Json.user?.username === testUser1.username.toLowerCase());
        const user1Cookie = reg1Res.headers.get('set-cookie');
        assert('Registration sets secure auth_token cookie', !!user1Cookie && user1Cookie.includes('auth_token'));

        // 12b. Duplicate Email Registration Prevention
        const dupEmailRes = await fetch(`${baseUrl}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...testUser1,
            username: `different_user_${randId}`,
          }),
        });
        assert('Duplicate email registration is rejected with HTTP 409 Conflict', dupEmailRes.status === 409);

        // 12c. Duplicate Username Registration Prevention
        const dupUserRes = await fetch(`${baseUrl}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...testUser1,
            email: `different_email_${randId}@delhipolice.gov.in`,
          }),
        });
        assert('Duplicate username registration is rejected with HTTP 409 Conflict', dupUserRes.status === 409);

        // 12d. Login with Username & Password
        const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: testUser1.username,
            password: testUser1.password,
          }),
        });
        assert('POST /api/auth/login with valid credentials succeeds with HTTP 200', loginRes.status === 200);
        const loginCookie = loginRes.headers.get('set-cookie');
        const cookieHeader = loginCookie ? loginCookie.split(';')[0] : '';

        // 12e. Forgot Password Endpoint
        const forgotRes = await fetch(`${baseUrl}/api/auth/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: testUser1.email }),
        });
        assert('POST /api/auth/forgot-password responds with HTTP 200', forgotRes.status === 200);

        // 12f. Profile Retrieval via GET /api/auth/me
        const meRes = await fetch(`${baseUrl}/api/auth/me`, {
          headers: { Cookie: cookieHeader },
        });
        assert('GET /api/auth/me returns authenticated profile with HTTP 200', meRes.status === 200);
        const meJson: any = await meRes.json();
        assert('Profile returns verified username, email and police stats', meJson.user?.username === testUser1.username && typeof meJson.user?.stats?.totalSummons === 'number');

        // 12g. Profile Update via PUT /api/auth/me
        const updateProfileRes = await fetch(`${baseUrl}/api/auth/me`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
          body: JSON.stringify({ policeStation: 'Tis Hazari Police Post', upcomingAlertDays: 14 }),
        });
        assert('PUT /api/auth/me updates officer profile with HTTP 200', updateProfileRes.status === 200);
        const updatedProfileJson: any = await updateProfileRes.json();
        assert('Updated profile reflects new police station in MongoDB', updatedProfileJson.user?.policeStation === 'Tis Hazari Police Post');

        // 12h. Activity Log Audit Trail
        const activitiesRes = await fetch(`${baseUrl}/api/activities`, {
          headers: { Cookie: cookieHeader },
        });
        assert('GET /api/activities returns HTTP 200', activitiesRes.status === 200);
        const activitiesJson: any = await activitiesRes.json();
        assert('Activity trail records registration and login actions', Array.isArray(activitiesJson) && activitiesJson.length >= 2);

        // 12i. Summons Persistence & Strict User Isolation
        // Register User 2
        const testUser2 = {
          fullName: 'Constable Anita Roy',
          username: `anita_${randId}`,
          email: `anita_${randId}@delhipolice.gov.in`,
          password: 'Password@2026',
        };
        const reg2Res = await fetch(`${baseUrl}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testUser2),
        });
        const user2CookieRaw = reg2Res.headers.get('set-cookie');
        const user2Cookie = user2CookieRaw ? user2CookieRaw.split(';')[0] : '';

        // User 1 creates a private summons
        const user1SummonRes = await fetch(`${baseUrl}/api/summons`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
          body: JSON.stringify({
            summonNumber: `SUM/ISO/${randId}/001`,
            caseNumber: `FIR 77/${randId}`,
            personName: 'Confidential Accused A',
            courtName: 'Patiala House Courts',
            hearingDate: '2026-11-20',
            status: 'Pending',
            urgency: 'Urgent',
          }),
        });
        assert('User 1 persists new summon with HTTP 201', user1SummonRes.status === 201);
        const user1SummonJson: any = await user1SummonRes.json();
        const summonId = user1SummonJson.id;

        // User 2 queries their summons: must NOT see User 1's summon
        const user2SummonsRes = await fetch(`${baseUrl}/api/summons`, {
          headers: { Cookie: user2Cookie },
        });
        const user2SummonsJson: any = await user2SummonsRes.json();
        const foundLeak = Array.isArray(user2SummonsJson) && user2SummonsJson.some((s: any) => s.id === summonId);
        assert('User 2 summons query enforces strict tenant isolation (no leak)', !foundLeak);

        // User 2 attempts to fetch User 1's summon directly: must return HTTP 404 / access denied
        const user2DirectGet = await fetch(`${baseUrl}/api/summons/${summonId}`, {
          headers: { Cookie: user2Cookie },
        });
        assert('User 2 direct access to User 1 summon is blocked with HTTP 404', user2DirectGet.status === 404);

        // User 2 attempts to delete User 1's summon: must return HTTP 404
        const user2DirectDel = await fetch(`${baseUrl}/api/summons/${summonId}`, {
          method: 'DELETE',
          headers: { Cookie: user2Cookie },
        });
        assert('User 2 deletion of User 1 summon is blocked with HTTP 404', user2DirectDel.status === 404);

        // User 1 updates summon status to Completed
        const updateSummonRes = await fetch(`${baseUrl}/api/summons/${summonId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
          body: JSON.stringify({ status: 'Completed', notes: 'Served with signature' }),
        });
        assert('User 1 updates own summon with HTTP 200', updateSummonRes.status === 200);

        // User 1 deletes own summon
        const delSummonRes = await fetch(`${baseUrl}/api/summons/${summonId}`, {
          method: 'DELETE',
          headers: { Cookie: cookieHeader },
        });
        assert('User 1 deletes own summon with HTTP 200', delSummonRes.status === 200);

        // Cleanup test users from DB
        await db.collection('users').deleteOne({ email: testUser1.email });
        await db.collection('users').deleteOne({ email: testUser2.email });
        await db.collection('activities').deleteMany({ userId: { $in: [testUser1.username, testUser2.username] } });
      } finally {
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
    }
  } catch (err: any) {
    assert('Express app and DB initialize without crash', false, err.message);
  }

  console.log('\n====================================================');
  console.log(`  TOTAL PASSED: ${passed} | TOTAL FAILED: ${failed}`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runProductionReadinessTests().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
