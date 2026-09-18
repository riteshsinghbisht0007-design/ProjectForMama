import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import { createInMemoryDatabase } from './mockDb';

// Initialize Firebase Admin for secure token verification
if (!getApps().length) {
  try {
    initializeApp({
      projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'summonsviewer'
    });
    console.info('[Auth] Firebase Admin initialized for secure token verification.');
  } catch (err) {
    console.error('[Auth] Failed to initialize Firebase Admin:', err);
  }
}

// Load environment variables from .env and .env.local if present
for (const envFile of ['.env', '.env.local']) {
  const envFilePath = path.join(process.cwd(), envFile);
  if (fs.existsSync(envFilePath)) {
    try {
      const envContent = fs.readFileSync(envFilePath, 'utf8');
      for (const line of envContent.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const splitIdx = trimmed.indexOf('=');
          const key = trimmed.slice(0, splitIdx).trim();
          const val = trimmed.slice(splitIdx + 1).trim().replace(/^["'](.*)["']$/, '$1');
          if (!process.env[key] && val && !val.startsWith('your_')) {
            process.env[key] = val;
          }
        }
      }
    } catch (envReadErr) {
      console.warn(`Could not read ${envFile} file:`, envReadErr);
    }
  }
}

// Fallback for development environments if JWT_SECRET is not set
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'dev_fallback_secret_for_summon_mitra_2026';
  console.warn('[Auth] Warning: Using fallback JWT_SECRET. Please set JWT_SECRET in production.');
}

// Helper to retrieve Gemini API key across environment variables
function getGeminiApiKey(): string | undefined {
  const key =
    process.env.GEMINI_API_KEY ||
    process.env.API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.VITE_GEMINI_API_KEY;

  if (!key || key.startsWith('your_') || key.includes('placeholder')) {
    return undefined;
  }
  return key;
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  console.info(`[Server] Starting SummonMitra backend in ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} mode...`);

  // --- MongoDB Setup with In-Memory Mock Fallback ---
  
  let mongoClient: MongoClient | null = null;
  let db: any = null;

  if (process.env.MONGODB_URI) {
    try {
      console.info('[Server] Connecting to MongoDB...');
      mongoClient = new MongoClient(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        }
      });
      await mongoClient.connect();
      db = mongoClient.db(process.env.MONGODB_DB_NAME || 'summons_app');
      console.info('[Server] Successfully connected to MongoDB');

      // Ensure indexes for efficient querying
      await db.collection('summons').createIndex({ userId: 1 });
      await db.collection('summons').createIndex({ userId: 1, createdAt: -1 });
      await db.collection('summons').createIndex({ userId: 1, updatedAt: -1 });
      await db.collection('witnesses').createIndex({ userId: 1 });
      await db.collection('users').createIndex({ email: 1 });
      await db.collection('users').createIndex({ providerId: 1 });
      await db.collection('notifications').createIndex({ userId: 1 });
      await db.collection('notifications').createIndex({ uniqueKey: 1 }, { unique: true });
    } catch (err) {
      console.warn('[Server] Failed to connect to MongoDB, falling back to In-Memory DB:', err);
      db = null;
    }
  }

  if (!db) {
    console.info('[Server] Active: In-Memory Database Fallback (with pre-seeded officers, summons, and witnesses).');
    db = createInMemoryDatabase();
  }

  // ---------------------

  // Robust CORS configuration for preview iframe, localhost, and public shared domains
  app.use(
    cors({
      origin: true, // Echo origin to allow development and production mobile/desktop domains
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    })
  );

  // Large payload limits for high-resolution document scans and PDFs (up to 50MB)
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  app.use(cookieParser());

  // 1. General Health Check
  
  app.get('/api/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'summon-mitra-server',
      environment: process.env.NODE_ENV || 'development',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      database: db ? 'connected' : 'disconnected',
      databaseMode: db?.isInMemory ? 'in-memory' : (mongoClient ? 'mongodb' : 'unknown'),
    });
  });

  // DB specific health check
  app.get('/api/health/db', async (_req, res) => {
    if (!db) {
      return res.status(503).json({ server: 'ok', database: 'disconnected', error: 'Database not initialized' });
    }
    try {
      if (db.command) {
        await db.command({ ping: 1 });
      }
      res.status(200).json({ server: 'ok', database: 'connected', mode: db.isInMemory ? 'in-memory' : 'mongodb' });
    } catch (err: any) {
      res.status(500).json({ server: 'ok', database: 'error', error: err.message });
    }
  });

  // DB test endpoint
  app.post('/api/test/db', async (req, res) => {
    if (!db) {
      return res.status(503).json({ error: 'Database not connected' });
    }
    try {
      const collection = db.collection('test_connection');
      const testDoc = { testString: 'SummonsViewer DB Test', timestamp: new Date() };
      
      // Insert
      const insertResult = await collection.insertOne(testDoc);
      
      // Read back
      const readDoc = await collection.findOne({ _id: insertResult.insertedId });
      
      // Delete (Cleanup)
      await collection.deleteOne({ _id: insertResult.insertedId });
      
      res.status(200).json({
        success: true,
        message: 'Successfully inserted, read, and deleted test document',
        readDoc
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Authentication Middleware (Strict token validation)
  const requireAuth = async (req: any, res: any, next: any) => {
    let cookieToken = req.cookies?.auth_token;
    let bearerToken = null;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      bearerToken = req.headers.authorization.split(' ')[1];
    }

    const token = bearerToken || cookieToken;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: Missing token' });
    }

    try {
      // 1. Try Firebase Admin ID Token Verification First (per strict requirements)
      if (bearerToken || (cookieToken && cookieToken.length > 300)) { // Firebase tokens are large
        try {
          const decodedFirebaseToken = await getAuth().verifyIdToken(token);
          req.user = { uid: decodedFirebaseToken.uid, _id: null };
          return next();
        } catch (firebaseErr) {
          // If it fails to verify as Firebase token, fallback to local JWT verification
        }
      }

      // 2. Verify local JWT Session
      if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is missing');
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
      req.user = { uid: decoded.firebaseUid || decoded.userId, _id: decoded.userId };
      next();
    } catch (error) {
      console.error('[Auth] Token verification failed:', error);
      return res.status(401).json({ error: 'Unauthorized: Invalid or expired session' });
    }
  };

  // --- Auth Endpoints ---

  const setAuthCookie = (res: any, token: string) => {
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: true, // Always true in AI Studio (HTTPS)
      sameSite: 'none', // Required for cross-origin iframes
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
  };

  app.post('/api/auth/register', async (req: any, res: any) => {
    if (!db) return res.status(503).json({ error: 'Database disconnected' });
    if (!process.env.JWT_SECRET) return res.status(500).json({ error: 'JWT_SECRET missing on server' });

    try {
      const { email, password, name, badgeNumber, policeStation, district, rank } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const existingUser = await db.collection('users').findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(409).json({ error: 'An account with this email already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      
      const newUser = {
        email: email.toLowerCase(),
        password: hashedPassword,
        displayName: name || email.split('@')[0],
        badgeNumber: badgeNumber || '',
        policeStation: policeStation || '',
        district: district || '',
        rank: rank || 'Officer',
        authProvider: 'local',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await db.collection('users').insertOne(newUser);
      
      const token = jwt.sign({ userId: result.insertedId.toString() }, process.env.JWT_SECRET, { expiresIn: '7d' });
      setAuthCookie(res, token);
      
      delete (newUser as any).password;
      res.status(201).json({ user: { ...newUser, uid: result.insertedId.toString() } });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/auth/login', async (req: any, res: any) => {
    if (!db) return res.status(503).json({ error: 'Database disconnected' });
    if (!process.env.JWT_SECRET) return res.status(500).json({ error: 'JWT_SECRET missing on server' });

    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      let user = await db.collection('users').findOne({ email: email.toLowerCase() });

      // Auto-provision test accounts on first login if using standard test credentials
      if (!user && password === 'Police@2026' && email.toLowerCase().includes('@delhipolice.gov.in')) {
        const badge = email.split('@')[0].toUpperCase();
        const hashedPassword = await bcrypt.hash('Police@2026', 10);
        const newUser = {
          email: email.toLowerCase(),
          password: hashedPassword,
          displayName: `Officer ${badge}`,
          badgeNumber: badge,
          policeStation: 'PS Tis Hazari',
          district: 'Central District, Delhi',
          rank: 'Sub-Inspector',
          authProvider: 'local',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        const insertResult = await db.collection('users').insertOne(newUser);
        user = { ...newUser, _id: insertResult.insertedId };
      }

      if (!user || !user.password) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const token = jwt.sign({ userId: user._id.toString(), firebaseUid: user.providerId }, process.env.JWT_SECRET, { expiresIn: '7d' });
      setAuthCookie(res, token);
      
      delete user.password;
      res.json({ user: { ...user, uid: user.providerId || user._id.toString() } });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/auth/social', async (req: any, res: any) => {
    if (!db) return res.status(503).json({ error: 'Database disconnected' });
    if (!process.env.JWT_SECRET) return res.status(500).json({ error: 'JWT_SECRET missing on server' });

    try {
      const { idToken, provider } = req.body;
      if (!idToken) return res.status(400).json({ error: 'Firebase ID Token is required' });

      // Verify Firebase ID Token
      const decodedToken = await getAuth().verifyIdToken(idToken);
      const email = decodedToken.email ? decodedToken.email.toLowerCase() : null;
      const uid = decodedToken.uid;
      
      let user = null;
      if (email) {
        user = await db.collection('users').findOne({
          $or: [{ providerId: uid }, { email: email }]
        });
      } else {
        user = await db.collection('users').findOne({ providerId: uid });
      }
      
      if (!user) {
        // Create new user from social login
        const newUser = {
          email: email,
          displayName: decodedToken.name || (email ? email.split('@')[0] : 'Officer'),
          photoURL: decodedToken.picture || null,
          authProvider: provider || 'oauth',
          providerId: uid,
          badgeNumber: '',
          policeStation: '',
          district: '',
          rank: 'Officer',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        const result = await db.collection('users').insertOne(newUser);
        user = { ...newUser, _id: result.insertedId };
      } else {
        // Update existing user's last login
        await db.collection('users').updateOne(
          { _id: user._id },
          { $set: { updatedAt: new Date() } }
        );
      }

      const token = jwt.sign({ userId: user._id.toString(), firebaseUid: user.providerId }, process.env.JWT_SECRET, { expiresIn: '7d' });
      setAuthCookie(res, token);
      
      delete user.password;
      res.json({ user: { ...user, uid: user.providerId || user._id.toString() } });
    } catch (err: any) {
      console.error('[Auth] Social login error:', err);
      res.status(401).json({ error: 'Invalid social authentication token' });
    }
  });

  app.post('/api/auth/logout', (req: any, res: any) => {
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: true,
      sameSite: 'none'
    });
    res.json({ success: true });
  });

    app.put('/api/auth/me', requireAuth, async (req: any, res: any) => {
    if (!db) return res.status(503).json({ error: 'Database disconnected' });
    try {
      const updates = { ...req.body };
      delete updates._id;
      delete updates.uid;
      delete updates.providerId;
      delete updates.password;
      delete updates.createdAt;
      
      updates.updatedAt = new Date();

      const filter = req.user._id
        ? (ObjectId.isValid(req.user._id) ? { _id: new ObjectId(req.user._id) } : { _id: req.user._id })
        : { providerId: req.user.uid };
      
      const result = await db.collection('users').findOneAndUpdate(
        filter,
        { $set: updates },
        { returnDocument: 'after' }
      );

      if (!result) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const user = result;
      delete user.password;
      res.json({ user: { ...user, uid: user.providerId || user._id.toString() } });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/auth/me', requireAuth, async (req: any, res: any) => {
    if (!db) return res.status(503).json({ error: 'Database disconnected' });
    try {
      let user = null;
      if (req.user._id) {
        user = ObjectId.isValid(req.user._id)
          ? await db.collection('users').findOne({ _id: new ObjectId(req.user._id) })
          : await db.collection('users').findOne({ _id: req.user._id });
      }
      if (!user && req.user.uid) {
        user = await db.collection('users').findOne({ providerId: req.user.uid });
      }
      if (!user && req.user.uid) {
        user = await db.collection('users').findOne({ _id: req.user.uid });
      }
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      delete user.password;
      res.json({ user: { ...user, uid: user.providerId || user._id.toString() } });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Summons Endpoints ---
  app.get('/api/summons', requireAuth, async (req: any, res: any) => {
    if (!db) return res.status(503).json({ error: 'Database disconnected' });
    try {
      const summons = await db.collection('summons').find({ userId: req.user.uid }).toArray();
      res.json(summons.map((s: any) => ({ ...s, id: s._id.toString() })));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/summons', requireAuth, async (req: any, res: any) => {
    if (!db) return res.status(503).json({ error: 'Database disconnected' });
    try {
      const summon = { ...req.body, userId: req.user.uid };
      delete summon.id; // ensure no explicit string ID overrides mongo's ObjectId if they were passing it, wait actually client generates a string ID.
      // If client generates ID, we can store it as `id` or let mongo generate `_id` and map it. 
      // Let's store the client's `id` as `_id` so we don't have to rewrite everything.
      if (req.body.id) {
        summon._id = req.body.id;
        delete summon.id;
      }
      await db.collection('summons').insertOne(summon);
      res.status(201).json({ ...summon, id: summon._id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/summons/:id', requireAuth, async (req: any, res: any) => {
    if (!db) return res.status(503).json({ error: 'Database disconnected' });
    try {
      const { id } = req.params;
      const updates = { ...req.body };
      delete updates.id;
      delete updates._id;
      delete updates.userId;

      await db.collection('summons').updateOne(
        { _id: id, userId: req.user.uid },
        { $set: updates }
      );
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/summons/:id', requireAuth, async (req: any, res: any) => {
    if (!db) return res.status(503).json({ error: 'Database disconnected' });
    try {
      const { id } = req.params;
      await db.collection('summons').deleteOne({ _id: id, userId: req.user.uid });
      await db.collection('notifications').deleteMany({ summonsId: id, userId: req.user.uid });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Witnesses Endpoints ---
  app.get('/api/witnesses', requireAuth, async (req: any, res: any) => {
    if (!db) return res.status(503).json({ error: 'Database disconnected' });
    try {
      const witnesses = await db.collection('witnesses').find({ userId: req.user.uid }).toArray();
      res.json(witnesses.map((w: any) => ({ ...w, id: w._id.toString() })));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/witnesses', requireAuth, async (req: any, res: any) => {
    if (!db) return res.status(503).json({ error: 'Database disconnected' });
    try {
      const witness = { ...req.body, userId: req.user.uid };
      if (req.body.id) {
        witness._id = req.body.id;
        delete witness.id;
      }
      await db.collection('witnesses').insertOne(witness);
      res.status(201).json({ ...witness, id: witness._id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/witnesses/:id', requireAuth, async (req: any, res: any) => {
    if (!db) return res.status(503).json({ error: 'Database disconnected' });
    try {
      const { id } = req.params;
      const updates = { ...req.body };
      delete updates.id;
      delete updates._id;
      delete updates.userId;

      await db.collection('witnesses').updateOne(
        { _id: id, userId: req.user.uid },
        { $set: updates }
      );
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/witnesses/:id', requireAuth, async (req: any, res: any) => {
    if (!db) return res.status(503).json({ error: 'Database disconnected' });
    try {
      const { id } = req.params;
      await db.collection('witnesses').deleteOne({ _id: id, userId: req.user.uid });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. OCR Service Health Check (Safe: reports configuration without leaking key)
  app.get('/api/ocr/health', (_req, res) => {
    const key = getGeminiApiKey();
    const isConfigured = Boolean(key && key.trim().length > 6);
    res.status(200).json({
      status: 'ok',
      service: 'judicial-ocr',
      ocrAvailable: isConfigured,
      primaryModel: 'gemini-2.5-flash',
      fallbackModels: ['gemini-3.8-flash'],
      configured: isConfigured,
      timestamp: new Date().toISOString(),
    });
  });

  // 3. Document AI OCR Endpoint
  app.post('/api/ocr', async (req, res) => {
    const startTime = Date.now();
    try {
      const { image, mimeType } = req.body || {};

      if (!image) {
        return res.status(400).json({
          error: 'Missing document image or PDF payload. Please provide a base64 encoded document.',
          code: 'MISSING_PAYLOAD',
        });
      }

      const apiKey = getGeminiApiKey();
      if (!apiKey || !apiKey.trim()) {
        console.warn('[OCR Service] Gemini API key not found in server environment.');
        return res.status(503).json({
          error: 'Gemini API key is not configured on the server. Please set GEMINI_API_KEY.',
          code: 'API_KEY_NOT_CONFIGURED',
        });
      }

      // Trust the data URL's mime type if available
      let actualMime = mimeType || 'image/jpeg';
      if (image.startsWith('data:')) {
        const extractedMime = image.split(';')[0].split(':')[1];
        if (extractedMime) {
          actualMime = extractedMime;
        }
      }

      // Strip potential data URL prefix
      const cleanBase64 = image.includes('base64,') ? image.split('base64,')[1] : image;

      // Normalize mimeType
      let normalizedMime = actualMime.toLowerCase();
      if (normalizedMime.includes('pdf')) {
        normalizedMime = 'application/pdf';
      } else if (normalizedMime.includes('png')) {
        normalizedMime = 'image/png';
      } else if (normalizedMime.includes('webp')) {
        normalizedMime = 'image/webp';
      } else if (normalizedMime.includes('heic') || normalizedMime.includes('heif')) {
        normalizedMime = 'image/heic';
      } else {
        normalizedMime = 'image/jpeg'; // fallback
      }

      console.info(
        `[OCR Service] Processing legal document (${normalizedMime}, ~${Math.round((cleanBase64.length * 3) / 4 / 1024)} KB)...`
      );

      const ai = new GoogleGenAI({ apiKey });
      const prompt = `You are an expert legal document analyst and certified OCR extraction assistant specialized in judicial warrants, court summons, notices, and charge sheets.
Analyze this court summon or warrant document image or PDF and extract all factual legal particulars into this exact JSON structure:
{
  "summonNumber": "string (summon, warrant, notice, or CNR number found in the document, or empty string)",
  "caseNumber": "string (FIR number, case number, or CC number found in the document, or empty string)",
  "personName": "string (name of person summoned / respondent / accused as printed, or empty string)",
  "fatherName": "string (father or spouse name if mentioned, or empty string)",
  "address": "string (complete address with house/flat, street, area, landmark, pincode as written, or empty string)",
  "courtName": "string (name of the court / bench / judge, or empty string)",
  "courtAddress": "string (court complex location and room number, or empty string)",
  "policeStation": "string (police station jurisdiction if mentioned, or empty string)",
  "district": "string (district name if mentioned, or empty string)",
  "state": "string (state name if mentioned, or empty string)",
  "issueDate": "string (issue date in YYYY-MM-DD format if present, or empty string)",
  "hearingDate": "string (court appearance / hearing date in YYYY-MM-DD format, or empty string)",
  "issuingAuthority": "string (designation of Judge, Magistrate, or Officer, or empty string)",
  "officerDetails": "string (assigned serving officer if mentioned, or empty string)",
  "offenseCharges": "string (legal IPC/BNS/CrPC/NI Act sections or charges summary, or empty string)",
  "urgency": "Standard, High, or Urgent based on timeline and nature of offense"
}
IMPORTANT: Return ONLY valid JSON. If any field cannot be verified or is illegible in the document, set it to an empty string "". Never invent fictional names or addresses.`;

      const candidateModels = ['gemini-2.5-flash', 'gemini-3.8-flash'];
      let response: any = null;
      let lastModelError: any = null;

      for (const modelName of candidateModels) {
        try {
          console.info(`[OCR Service] Attempting legal extraction using model: ${modelName}...`);
          response = await ai.models.generateContent({
            model: modelName,
            contents: [
              {
                role: 'user',
                parts: [
                  { text: prompt },
                  {
                    inlineData: {
                      data: cleanBase64,
                      mimeType: normalizedMime,
                    },
                  },
                ],
              },
            ],
          });
          console.info(`[OCR Service] Extraction succeeded with model: ${modelName}`);
          break; // Succeeded!
        } catch (candidateErr: any) {
          lastModelError = candidateErr;
          console.warn(`[OCR Service] Model ${modelName} returned error: ${candidateErr.message}. Trying next candidate...`);
        }
      }

      if (!response && lastModelError) {
        throw lastModelError;
      }

      const rawText = response.text || '';
      const elapsed = Date.now() - startTime;
      console.info(`[OCR Service] Extraction completed in ${elapsed}ms`);

      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          return res.status(200).json(parsed);
        } catch (jsonParseErr) {
          console.warn('[OCR Service] JSON parse error on matched block, returning rawText payload:', jsonParseErr);
          return res.status(200).json({ rawText });
        }
      } else {
        return res.status(200).json({ rawText });
      }
    } catch (err: any) {
      console.error('[OCR Service] Server-side OCR exception:', err);
      const isAuthError =
        err.message?.toLowerCase().includes('api key') ||
        err.message?.toLowerCase().includes('permission') ||
        err.status === 401 ||
        err.status === 403;

      return res.status(isAuthError ? 401 : 500).json({
        error: isAuthError
          ? 'Gemini API authentication failed. Check API key configuration.'
          : err.message || 'Internal server error while processing document with Gemini OCR.',
        code: isAuthError ? 'AUTH_FAILED' : 'OCR_PROCESSING_ERROR',
      });
    }
  });


  // --- Notifications Endpoints ---
  app.get('/api/notifications', requireAuth, async (req: any, res: any) => {
    if (!db) return res.status(503).json({ error: 'Database disconnected' });
    try {
      const { today, upcomingDays = 7 } = req.query;
      if (!today) return res.status(400).json({ error: 'Missing today parameter (YYYY-MM-DD)' });
      
      const userId = req.user.uid;
      
      const summons = await db.collection('summons').find({ userId, status: { $ne: 'Completed' } }).toArray();
      
      const todayDate = new Date(today);
      const bulkOps = [];
      
      for (const summon of summons) {
        if (!summon.hearingDate) continue;
        const hearing = new Date(summon.hearingDate);
        const diffTime = hearing.getTime() - todayDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let type = null;
        let title = '';
        let message = '';
        
        if (diffDays < 0) {
          type = 'HEARING_OVERDUE';
          title = 'Overdue Hearing';
          message = `Hearing date for ${summon.personName} (${summon.summonNumber || summon.caseNumber}) has passed.`;
        } else if (diffDays === 0) {
          type = 'HEARING_TODAY';
          title = 'Hearing Today';
          message = `Hearing scheduled for today: ${summon.personName} (${summon.summonNumber || summon.caseNumber}).`;
        } else if (diffDays === 1) {
          type = 'HEARING_TOMORROW';
          title = 'Hearing Tomorrow';
          message = `Hearing scheduled for tomorrow: ${summon.personName} (${summon.summonNumber || summon.caseNumber}).`;
        } else if (diffDays > 1 && diffDays <= parseInt(upcomingDays)) {
          type = 'HEARING_UPCOMING';
          title = 'Upcoming Hearing';
          message = `Hearing in ${diffDays} days for ${summon.personName} (${summon.summonNumber || summon.caseNumber}).`;
        }
        
        if (type) {
          const uniqueKey = `${userId}_${summon._id}_${type}_${summon.hearingDate}`;
          bulkOps.push({
            updateOne: {
              filter: { uniqueKey },
              update: {
                $setOnInsert: {
                  userId,
                  summonsId: summon._id.toString(),
                  type,
                  title,
                  message,
                  hearingDate: summon.hearingDate,
                  isRead: false,
                  createdAt: new Date().toISOString()
                }
              },
              upsert: true
            }
          });
        }
      }
      
      if (bulkOps.length > 0) {
        await db.collection('notifications').bulkWrite(bulkOps, { ordered: false });
      }
      
      const notifications = await db.collection('notifications')
        .find({ userId })
        .sort({ createdAt: -1 })
        .toArray();
        
      res.json(notifications.map((n: any) => ({ ...n, id: n._id.toString() })));
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/notifications/:id/read', requireAuth, async (req: any, res: any) => {
    if (!db) return res.status(503).json({ error: 'Database disconnected' });
    try {
      const { id } = req.params;
      const filter = ObjectId.isValid(id)
        ? { _id: new ObjectId(id), userId: req.user.uid }
        : { _id: id, userId: req.user.uid };
      await db.collection('notifications').updateOne(
        filter,
        { $set: { isRead: true } }
      );
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
  
  app.put('/api/notifications/read-all', requireAuth, async (req: any, res: any) => {
    if (!db) return res.status(503).json({ error: 'Database disconnected' });
    try {
      await db.collection('notifications').updateMany(
        { userId: req.user.uid, isRead: false },
        { $set: { isRead: true } }
      );
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/notifications/cleanup/:summonsId', requireAuth, async (req: any, res: any) => {
    if (!db) return res.status(503).json({ error: 'Database disconnected' });
    try {
      const { summonsId } = req.params;
      await db.collection('notifications').deleteMany({ userId: req.user.uid, summonsId });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Serve Frontend Assets: Vite middleware in Development, static dist/ in Production
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: 3000 },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.info('[Server] Vite middleware attached for live development.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // SPA catch-all fallback
    app.use((_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.info(`[Server] Serving production static files from ${distPath}`);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.info(`[Server] Production-ready server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((fatalErr) => {
  console.error('[Server] Fatal server startup failure:', fatalErr);
  process.exit(1);
});
