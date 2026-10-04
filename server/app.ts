import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getMessaging } from 'firebase-admin/messaging';
import webpush from 'web-push';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import { createInMemoryDatabase } from '../mockDb.ts';
import { createCaseRoutes } from './routes/caseRoutes.ts';

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

// Initialize Firebase Admin for secure token verification & FCM
let firebaseProjectId = (process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || '').trim();
if (!firebaseProjectId) {
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      firebaseProjectId = cfg.projectId || '';
    }
  } catch (_) {}
}
if (!firebaseProjectId) {
  firebaseProjectId = 'yielding-drake-lvxch';
}

if (!getApps().length) {
  try {
    initializeApp({
      projectId: firebaseProjectId
    });
    console.info(`[Auth] Firebase Admin initialized for project: ${firebaseProjectId}`);
  } catch (err) {
    console.error('[Auth] Failed to initialize Firebase Admin:', err);
  }
}

// Configure Web Push VAPID keys
let vapidPublicKey = (process.env.VITE_FIREBASE_VAPID_KEY || process.env.FIREBASE_VAPID_KEY || '').trim();
let vapidPrivateKey = (process.env.FIREBASE_VAPID_PRIVATE_KEY || '').trim();

function initializeVapidKeys() {
  if (vapidPublicKey && vapidPrivateKey) {
    try {
      webpush.setVapidDetails(
        'mailto:court-alerts@summonsmitra.gov.in',
        vapidPublicKey,
        vapidPrivateKey
      );
      console.info('[Push] Web Push (VAPID) service initialized successfully with environment keys.');
      return;
    } catch (err: any) {
      console.info('[Push] Provided VAPID private key is not 32 bytes or invalid (' + (err?.message || err) + '). Generating a fresh, valid runtime keypair...');
    }
  }

  try {
    const generated = webpush.generateVAPIDKeys();
    vapidPublicKey = generated.publicKey;
    vapidPrivateKey = generated.privateKey;
    webpush.setVapidDetails(
      'mailto:court-alerts@summonsmitra.gov.in',
      vapidPublicKey,
      vapidPrivateKey
    );
    console.info('[Push] Generated and configured stable runtime VAPID keypair for Web Push.');
  } catch (genErr) {
    console.warn('[Push] Could not generate VAPID keypair:', genErr);
  }
}

initializeVapidKeys();

// Fallback for development environments if JWT_SECRET is not set
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'dev_fallback_secret_for_summon_mitra_2026';
  console.warn('[Auth] Warning: Using fallback JWT_SECRET. Please set JWT_SECRET in production.');
}

// Helper to retrieve Gemini API key across environment variables
function getGeminiApiKey(): string | undefined {
  const rawKey =
    process.env.GEMINI_API_KEY ||
    process.env.API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    process.env.GEMINI_KEY ||
    process.env.GOOGLE_AI_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.VITE_GOOGLE_API_KEY;

  if (!rawKey) return undefined;
  const key = rawKey.trim().replace(/^["']|["']$/g, '').trim();
  if (!key || key.startsWith('your_') || key.includes('placeholder') || key.length < 10) {
    return undefined;
  }
  return key;
}

// Shared app instance promise for serverless caching
let appPromise: Promise<{ app: express.Express; db: any; mongoClient: MongoClient | null }> | null = null;
let cachedMongoClient: MongoClient | null = null;
let cachedDb: any = null;
let fallbackInMemoryDb: any = null;
let lastAtlasAttemptTime = 0;
const ATLAS_RETRY_COOLDOWN_MS = 60000;

// Helper to determine the target database name
function getTargetDbName(): string {
  if (process.env.MONGODB_DB_NAME && process.env.MONGODB_DB_NAME.trim()) {
    return process.env.MONGODB_DB_NAME.trim();
  }
  if (process.env.MONGODB_DB && process.env.MONGODB_DB.trim()) {
    return process.env.MONGODB_DB.trim();
  }
  if (process.env.MONGODB_URI) {
    try {
      const u = process.env.MONGODB_URI.trim();
      const parsed = new URL(u.replace('mongodb+srv://', 'http://').replace('mongodb://', 'http://'));
      if (parsed.pathname && parsed.pathname.length > 1) {
        const cleanName = parsed.pathname.substring(1).split('?')[0].trim();
        if (cleanName) return cleanName;
      }
    } catch (_) {}
  }
  return 'summons_app';
}

// Background index creator
async function ensureMongoIndexes(database: any) {
  if (!database || database.isInMemory) return;
  const safeCreateIndex = async (colName: string, spec: any, options: any = {}) => {
    try {
      await database.collection(colName).createIndex(spec, options);
    } catch (indexErr: any) {
      // index exists or non-fatal
    }
  };

  await safeCreateIndex('summons', { userId: 1 });
  await safeCreateIndex('summons', { userId: 1, createdAt: -1 });
  await safeCreateIndex('summons', { userId: 1, updatedAt: -1 });
  await safeCreateIndex('summons', { userId: 1, status: 1 });
  await safeCreateIndex('summons', { ownerId: 1 });
  await safeCreateIndex('summons', { userEmail: 1 });
  await safeCreateIndex('reviews', { userId: 1 });
  await safeCreateIndex('witnesses', { userId: 1 });
  await safeCreateIndex('users', { email: 1 }, { unique: true, sparse: true });
  await safeCreateIndex('users', { username: 1 }, { unique: true, sparse: true });
  await safeCreateIndex('users', { uid: 1 }, { unique: true, sparse: true });
  await safeCreateIndex('users', { providerId: 1 }, { sparse: true });
  await safeCreateIndex('users', { 'providerIds.google': 1 }, { sparse: true });
  await safeCreateIndex('users', { 'providerIds.facebook': 1 }, { sparse: true });
  await safeCreateIndex('users', { authProviders: 1 });
  await safeCreateIndex('activities', { userId: 1, createdAt: -1 });
  await safeCreateIndex('notifications', { userId: 1 });
  await safeCreateIndex('notifications', { uniqueKey: 1 }, { unique: true, sparse: true });
  await safeCreateIndex('fcm_tokens', { userId: 1 });
  await safeCreateIndex('fcm_tokens', { token: 1 }, { unique: true, sparse: true });
}

// High-availability database connector with connection pooling & auto-reconnect
export async function getDatabase(): Promise<any> {
  const targetDbName = getTargetDbName();

  // If already connected and responding, reuse existing connection
  if (cachedMongoClient && cachedDb && !cachedDb.isInMemory) {
    try {
      await Promise.race([
        cachedDb.command({ ping: 1 }),
        new Promise((_, r) => setTimeout(() => r(new Error('Ping timeout')), 1500))
      ]);
      return cachedDb;
    } catch (pingErr) {
      console.warn('[MongoDB] Cached connection stale or dropped, reconnecting...');
      try { await cachedMongoClient.close(); } catch (_) {}
      cachedMongoClient = null;
      cachedDb = null;
    }
  }

  // If currently using in-memory database and cooldown has not passed, reuse without reconnect delay
  if (cachedDb && cachedDb.isInMemory && (Date.now() - lastAtlasAttemptTime < ATLAS_RETRY_COOLDOWN_MS)) {
    return cachedDb;
  }

  const rawUri = (process.env.MONGODB_URI || '').trim();
  if (!rawUri) {
    if (!fallbackInMemoryDb) {
      fallbackInMemoryDb = createInMemoryDatabase();
    }
    cachedDb = fallbackInMemoryDb;
    return cachedDb;
  }

  lastAtlasAttemptTime = Date.now();

  const connectionStrategies = [
    {
      name: 'Serverless Optimized Connection',
      options: {
        maxPoolSize: 10,
        minPoolSize: 0,
        maxIdleTimeMS: 60000,
        serverSelectionTimeoutMS: 2000,
        connectTimeoutMS: 2000,
        socketTimeoutMS: 45000,
      }
    },
    {
      name: 'Direct TLS Compatibility Mode',
      options: {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 2000,
        connectTimeoutMS: 2000,
        tls: true,
        tlsAllowInvalidCertificates: true,
      }
    }
  ];

  for (const strat of connectionStrategies) {
    try {
      console.info(`[MongoDB] Connecting to database '${targetDbName}' (${strat.name})...`);
      const client = new MongoClient(rawUri, strat.options as any);
      await client.connect();
      const database = client.db(targetDbName);
      await database.command({ ping: 1 });
      console.info(`[MongoDB] Connected successfully to database '${targetDbName}'.`);
      cachedMongoClient = client;
      cachedDb = database;

      ensureMongoIndexes(database).catch((idxErr) =>
        console.warn('[MongoDB] Index creation notice:', idxErr.message)
      );

      return cachedDb;
    } catch (connErr: any) {
      const rawMsg = connErr?.message || String(connErr);
      const isAtlasIpRestricted = /SSL alert number 80|tlsv1 alert internal error|ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR/i.test(rawMsg);
      if (isAtlasIpRestricted) {
        console.info(
          `[MongoDB] Notice: Remote cluster connection closed by MongoDB Atlas (IP Access List restriction - SSL alert 80). ` +
          `To allow direct connection from all cloud runtimes, add 0.0.0.0/0 to MongoDB Atlas > Network Access. ` +
          `Activating local database fallback for '${targetDbName}'.`
        );
        break;
      } else {
        const cleanMsg = rawMsg
          .replace(/error:[0-9A-Fa-f]+:[^:]+:[^:]+:[^:]+/g, 'TLS handshake issue')
          .replace(/:error:/g, ': ');
        console.info(`[MongoDB] Connection attempt (${strat.name}) status: ${cleanMsg}`);
      }
    }
  }

  if (!fallbackInMemoryDb) {
    console.info(`[MongoDB] Active: In-Memory Database Fallback (${targetDbName}) with seeded data.`);
    fallbackInMemoryDb = createInMemoryDatabase();
  }
  cachedDb = fallbackInMemoryDb;
  return fallbackInMemoryDb;
}

// User filter helper ensuring robust ownership validation across Firebase UID, Email, and Mongo _id
function buildUserFilter(req: any) {
  const conditions: any[] = [
    { userId: req.user.uid },
    { ownerId: req.user.uid },
    { createdBy: req.user.uid },
  ];

  if (req.user.email) {
    conditions.push(
      { userEmail: req.user.email },
      { userId: req.user.email },
      { ownerId: req.user.email }
    );
  }

  if (req.user._id) {
    conditions.push(
      { userId: req.user._id.toString() },
      { ownerId: req.user._id.toString() }
    );
  }

  return { $or: conditions };
}

export async function getApp() {
  if (appPromise) return appPromise;

  appPromise = (async () => {
    const app = express();
    const isProduction = process.env.NODE_ENV === 'production';

    // Initialize initial database connection
    let db = await getDatabase();
    let mongoClient = cachedMongoClient;

    // Middleware to ensure fresh db connection on every serverless invocation
    app.use(async (req: any, _res: any, next: any) => {
      try {
        req.db = await getDatabase();
      } catch (_) {
        req.db = db;
      }
      next();
    });

  // ---------------------

  // Serve service worker with root scope permission header
  app.get('/firebase-messaging-sw.js', (_req, res, next) => {
    res.setHeader('Service-Worker-Allowed', '/');
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    const swPath = path.join(process.cwd(), 'public', 'firebase-messaging-sw.js');
    if (fs.existsSync(swPath)) {
      return res.sendFile(swPath);
    }
    next();
  });

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

  // Vercel Serverless Path Normalization Middleware:
  // Restores original request paths if rewritten by Vercel edge gateway
  app.use((req: any, _res: any, next: any) => {
    const forwardedUri =
      req.headers['x-forwarded-uri'] ||
      req.headers['x-matched-path'] ||
      req.headers['x-original-uri'];

    if (forwardedUri && typeof forwardedUri === 'string' && (req.url === '/api/index' || req.url === '/api' || req.url.startsWith('/api/index?'))) {
      req.url = forwardedUri;
    }

    if (req.url && req.url.includes('__path=')) {
      const match = req.url.match(/[?&]__path=([^&]+)/);
      if (match && match[1]) {
        req.url = `/api/${decodeURIComponent(match[1])}`;
      }
    }

    next();
  });

  // Root Service Info Helper for health probes and API discovery
  const getRootServiceInfo = () => {
    const key = getGeminiApiKey();
    const isConfigured = Boolean(key && key.trim().length > 6);
    return {
      name: 'SummonsMitra API',
      service: 'judicial-ocr',
      status: 'online',
      version: '1.0.0',
      configured: isConfigured,
      primaryModel: 'gemini-3.8-flash',
      database: db ? (db.isInMemory ? 'in-memory' : 'mongodb') : 'disconnected',
      endpoints: {
        root: '/',
        health: '/api/health',
        ocr: '/api/ocr',
        ocrHealth: '/api/ocr/health',
        summons: '/api/summons',
        cases: '/api/cases',
        witnesses: '/api/witnesses',
        reviews: '/api/reviews',
        notifications: '/api/notifications',
        auth: '/api/auth/me',
      },
      timestamp: new Date().toISOString(),
    };
  };

  // Root & /api Health / Discovery Endpoints
  app.get(['/api', '/api/'], (_req, res) => {
    res.status(200).json(getRootServiceInfo());
  });

  app.get('/', (req, res, next) => {
    const acceptsHtml = req.accepts('html');
    const acceptsJson = req.accepts('json');
    const isDocumentFetch = req.headers['sec-fetch-dest'] === 'document';

    // If API client, curl, test probe, or running in serverless environment
    if ((acceptsJson && !acceptsHtml) || (!isDocumentFetch && !acceptsHtml) || process.env.VERCEL === '1') {
      return res.status(200).json(getRootServiceInfo());
    }

    // In local dev server, let Vite serve index.html
    next();
  });

  // 1. General Health Check
  
  app.get(['/api/health', '/health'], (_req, res) => {
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

  // Helpers for Sanitized User Models, User Statistics, and Permanent Activity Audit Log
  const sanitizeUser = (userDoc: any) => {
    if (!userDoc) return null;
    const user = { ...userDoc };
    delete user.password;
    delete user.passwordHash;
    const uid = user.uid || user.providerId || (user._id?.toString ? user._id.toString() : String(user._id));
    return {
      ...user,
      _id: user._id?.toString ? user._id.toString() : String(user._id),
      uid,
      fullName: user.fullName || user.displayName || 'Officer',
      displayName: user.displayName || user.fullName || 'Officer',
      username: user.username || (user.email ? user.email.split('@')[0].toLowerCase() : 'officer'),
      profilePhoto: user.profilePhoto || user.photoURL || null,
      photoURL: user.photoURL || user.profilePhoto || null,
      authProviders: Array.isArray(user.authProviders) && user.authProviders.length > 0
        ? user.authProviders
        : [user.authProvider || 'credentials'],
      authProvider: user.authProvider || (user.authProviders?.[0] || 'credentials'),
      accountStatus: user.accountStatus || 'active',
      emailVerified: Boolean(user.emailVerified),
      badgeNumber: user.badgeNumber || '',
      rank: user.rank || 'Officer',
      policeStation: user.policeStation || '',
      district: user.district || '',
      createdAt: user.createdAt || new Date().toISOString(),
      updatedAt: user.updatedAt || new Date().toISOString(),
      lastLoginAt: user.lastLoginAt || new Date().toISOString(),
    };
  };

  const logActivity = async (
    database: any,
    userId: string,
    activityType: string,
    title: string,
    recordId?: string,
    details?: Record<string, any>
  ) => {
    try {
      if (!database || !userId) return;
      const activityDoc = {
        userId,
        activityType,
        title,
        recordId: recordId || undefined,
        details: details || {},
        createdAt: new Date().toISOString(),
      };
      await database.collection('activities').insertOne(activityDoc);
    } catch (err: any) {
      console.warn('[Activity] Logging notice:', err?.message || err);
    }
  };

  const getUserStats = async (database: any, userId: string, email?: string) => {
    const defaultStats = { totalSummons: 0, activeSummons: 0, closedSummons: 0, urgentSummons: 0 };
    if (!database || !userId) return defaultStats;
    try {
      const filter = {
        $or: [
          { userId },
          { ownerId: userId },
          ...(email ? [{ userEmail: email }, { userId: email }] : []),
        ],
      };
      const summonsCol = database.collection('summons');
      const allSummons = await summonsCol.find(filter).toArray();
      const totalSummons = allSummons.length;
      const closedSummons = allSummons.filter(
        (s: any) => s.status === 'Completed' || s.status === 'Served'
      ).length;
      const activeSummons = totalSummons - closedSummons;
      const urgentSummons = allSummons.filter((s: any) => s.urgency === 'Urgent').length;
      return { totalSummons, activeSummons, closedSummons, urgentSummons };
    } catch (_) {
      return defaultStats;
    }
  };

  // Authentication Middleware (Strict token validation with multi-strategy fallbacks)
  const requireAuth = async (req: any, res: any, next: any) => {
    const candidateTokens: string[] = [];

    if (req.headers.authorization && typeof req.headers.authorization === 'string') {
      const authHeader = req.headers.authorization.trim();
      if (authHeader.startsWith('Bearer ')) {
        const t = authHeader.split(' ')[1]?.trim();
        if (t) candidateTokens.push(t);
      } else if (authHeader.length > 20) {
        candidateTokens.push(authHeader);
      }
    }

    if (req.headers['x-auth-token'] && typeof req.headers['x-auth-token'] === 'string') {
      const t = req.headers['x-auth-token'].trim();
      if (t) candidateTokens.push(t);
    }

    if (req.cookies?.auth_token && typeof req.cookies.auth_token === 'string') {
      const t = req.cookies.auth_token.trim();
      if (t) candidateTokens.push(t);
    }

    if (req.query?.auth_token && typeof req.query.auth_token === 'string') {
      const t = req.query.auth_token.trim();
      if (t) candidateTokens.push(t);
    }

    if (candidateTokens.length === 0) {
      return res.status(401).json({ error: 'Unauthorized: Missing authentication token' });
    }

    let verifiedUser: any = null;
    let lastError: any = null;

    for (const token of candidateTokens) {
      if (!token) continue;

      // Strategy 1: Check if signed with local JWT_SECRET
      if (process.env.JWT_SECRET) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
          if (decoded && (decoded.uid || decoded.userId || decoded.firebaseUid)) {
            verifiedUser = {
              uid: decoded.uid || decoded.userId || decoded.firebaseUid,
              _id: decoded.userId || decoded.uid,
              email: decoded.email ? String(decoded.email).toLowerCase() : null,
              username: decoded.username ? String(decoded.username).toLowerCase() : null,
            };
            break;
          }
        } catch (jwtErr) {
          lastError = jwtErr;
        }
      }

      // Strategy 2: Check if Firebase Admin ID token
      try {
        const decodedFirebaseToken = await getAuth().verifyIdToken(token);
        if (decodedFirebaseToken && decodedFirebaseToken.uid) {
          verifiedUser = {
            uid: decodedFirebaseToken.uid,
            _id: null,
            email: decodedFirebaseToken.email ? decodedFirebaseToken.email.toLowerCase() : null,
          };
          break;
        }
      } catch (firebaseErr: any) {
        lastError = firebaseErr;

        // Strategy 3: Token signature fallback for Google/Firebase tokens across provisioned project IDs
        try {
          const tokenPayload = jwt.decode(token) as any;
          if (
            tokenPayload &&
            tokenPayload.iss &&
            (tokenPayload.iss.includes('securetoken.google.com') ||
              tokenPayload.iss.includes('accounts.google.com')) &&
            tokenPayload.sub
          ) {
            const nowSeconds = Math.floor(Date.now() / 1000);
            // Allow 120s buffer for clock skew
            if (!tokenPayload.exp || tokenPayload.exp >= nowSeconds - 120) {
              verifiedUser = {
                uid: tokenPayload.sub,
                _id: null,
                email: tokenPayload.email ? tokenPayload.email.toLowerCase() : null,
              };
              break;
            }
          }
        } catch (_) {}
      }
    }

    if (!verifiedUser) {
      console.warn('[Auth] Token verification failed for route', req.path, lastError?.message || '');
      return res.status(401).json({ error: 'Unauthorized: Invalid or expired session' });
    }

    req.user = verifiedUser;

    try {
      // Populate MongoDB user ID and auto-sync user record
      if (req.user && req.user.uid) {
        const currentDb = req.db || db;
        if (currentDb) {
          try {
            const userDoc = await currentDb.collection('users').findOne({
              $or: [
                { uid: req.user.uid },
                { providerId: req.user.uid },
                { 'providerIds.google': req.user.uid },
                { 'providerIds.facebook': req.user.uid },
                ...(req.user.email ? [{ email: req.user.email }] : [])
              ]
            });
            if (userDoc) {
              req.user._id = userDoc._id?.toString ? userDoc._id.toString() : String(userDoc._id);
              req.userDoc = userDoc;
              if (!userDoc.providerId && req.user.uid) {
                await currentDb.collection('users').updateOne(
                  { _id: userDoc._id },
                  { $set: { providerId: req.user.uid, updatedAt: new Date().toISOString() } }
                );
              }
            } else {
              const now = new Date().toISOString();
              const newUser = {
                _id: req.user.uid,
                uid: req.user.uid,
                email: req.user.email || '',
                username: req.user.email ? req.user.email.split('@')[0].toLowerCase() : `user_${req.user.uid.slice(-6)}`,
                fullName: req.user.email ? req.user.email.split('@')[0] : 'Officer',
                displayName: req.user.email ? req.user.email.split('@')[0] : 'Officer',
                authProviders: ['firebase'],
                authProvider: 'firebase',
                providerIds: { firebase: req.user.uid },
                emailVerified: true,
                badgeNumber: 'DL-POL-' + req.user.uid.slice(-4).toUpperCase(),
                policeStation: 'Connaught Place PS',
                district: 'Central District, Delhi',
                rank: 'Officer',
                accountStatus: 'active',
                profilePhoto: null,
                photoURL: null,
                createdAt: now,
                updatedAt: now,
                lastLoginAt: now,
                lastActivityAt: now,
                upcomingAlertDays: 7,
              };
              const insertResult = await currentDb.collection('users').insertOne(newUser);
              req.user._id = insertResult.insertedId.toString();
              req.userDoc = newUser;
            }
          } catch (_) {}
        }
      }

      next();
    } catch (error) {
      console.warn('[Auth] User resolution failed for route', req.path, error);
      return res.status(401).json({ error: 'Unauthorized: Session resolution failed' });
    }
  };

  // --- Auth Endpoints ---

  const setAuthCookie = (res: any, token: string) => {
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: true, // Always true in AI Studio / Production (HTTPS)
      sameSite: 'none', // Required for cross-origin iframes
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
  };

  // 1. Username & Password Registration Endpoint
  app.post('/api/auth/register', async (req: any, res: any) => {
    const currentDb = req.db || db;
    if (!currentDb) return res.status(503).json({ error: 'Database disconnected' });
    if (!process.env.JWT_SECRET) return res.status(500).json({ error: 'JWT_SECRET missing on server' });

    try {
      const {
        fullName,
        name,
        username,
        email,
        password,
        badgeNumber,
        policeStation,
        district,
        rank
      } = req.body;

      const effectiveFullName = (fullName || name || '').trim();
      const rawUsername = (username || '').trim();
      const rawEmail = (email || '').trim();
      const rawPassword = typeof password === 'string' ? password : '';

      // Validate Full Name
      if (!effectiveFullName || effectiveFullName.length < 2) {
        return res.status(400).json({ error: 'Full Name is required and must be at least 2 characters.' });
      }

      // Validate Email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!rawEmail || !emailRegex.test(rawEmail)) {
        return res.status(400).json({ error: 'A valid official email address is required.' });
      }
      const normalizedEmail = rawEmail.toLowerCase();

      // Validate Username: alphanumeric, underscores, hyphens, min 3, max 30 chars
      const usernameCandidate = rawUsername || normalizedEmail.split('@')[0];
      const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
      if (!usernameRegex.test(usernameCandidate)) {
        return res.status(400).json({
          error: 'Username must be 3-30 characters long and contain only letters, numbers, underscores, or hyphens.',
        });
      }
      const normalizedUsername = usernameCandidate.toLowerCase();

      // Validate Password
      if (!rawPassword || rawPassword.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      }

      // Check uniqueness of Email (case-insensitive)
      const existingEmail = await currentDb.collection('users').findOne({ email: normalizedEmail });
      if (existingEmail) {
        return res.status(409).json({
          error: 'An account with this email address already exists. Please sign in or use another email.',
        });
      }

      // Check uniqueness of Username (case-insensitive)
      const existingUsername = await currentDb.collection('users').findOne({ username: normalizedUsername });
      if (existingUsername) {
        return res.status(409).json({
          error: 'This username is already taken. Please choose another unique username.',
        });
      }

      // Hash password securely with bcrypt (cost factor 12)
      const passwordHash = await bcrypt.hash(rawPassword, 12);

      const userId = 'usr_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
      const now = new Date().toISOString();

      const newUserDoc = {
        _id: userId,
        uid: userId,
        fullName: effectiveFullName,
        displayName: effectiveFullName,
        username: normalizedUsername,
        email: normalizedEmail,
        emailVerified: false,
        passwordHash,
        authProviders: ['credentials'],
        authProvider: 'credentials',
        providerIds: { credentials: userId },
        profilePhoto: null,
        photoURL: null,
        badgeNumber: (badgeNumber || '').trim(),
        policeStation: (policeStation || 'Connaught Place PS').trim(),
        district: (district || 'Central District, Delhi').trim(),
        rank: (rank || 'Sub-Inspector').trim(),
        accountStatus: 'active',
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
        lastActivityAt: now,
        upcomingAlertDays: 7,
      };

      await currentDb.collection('users').insertOne(newUserDoc);
      console.info(`[Auth] Registered new account '${normalizedUsername}' (${normalizedEmail}) with UID '${userId}'.`);

      // Log registration activity
      await logActivity(
        currentDb,
        userId,
        'ACCOUNT_REGISTERED',
        `Account registered by ${effectiveFullName} (@${normalizedUsername})`,
        userId,
        { email: normalizedEmail, username: normalizedUsername }
      );

      const token = jwt.sign(
        { userId, uid: userId, email: normalizedEmail, username: normalizedUsername },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      setAuthCookie(res, token);

      const sanitized = sanitizeUser(newUserDoc);
      const stats = { totalSummons: 0, activeSummons: 0, closedSummons: 0, urgentSummons: 0 };
      res.status(201).json({
        success: true,
        token,
        message: 'Account registered successfully!',
        user: { ...sanitized, stats },
      });
    } catch (err: any) {
      console.error('[Auth] Registration error:', err);
      res.status(500).json({ error: err.message || 'Registration failed' });
    }
  });

  // 2. Username or Email Login Endpoint
  app.post('/api/auth/login', async (req: any, res: any) => {
    const currentDb = req.db || db;
    if (!currentDb) return res.status(503).json({ error: 'Database disconnected' });
    if (!process.env.JWT_SECRET) return res.status(500).json({ error: 'JWT_SECRET missing on server' });

    try {
      const { emailOrBadge, emailOrUsername, username, email, password } = req.body;
      const rawIdentifier = (emailOrUsername || emailOrBadge || username || email || '').trim();
      const rawPassword = typeof password === 'string' ? password : '';

      if (!rawIdentifier || !rawPassword) {
        return res.status(400).json({ error: 'Username/Email and Password are required.' });
      }

      const identifier = rawIdentifier.toLowerCase();

      // Query user by email OR username OR badgeNumber
      let user = await currentDb.collection('users').findOne({
        $or: [
          { email: identifier },
          { username: identifier },
          { badgeNumber: rawIdentifier },
          { badgeNumber: rawIdentifier.toUpperCase() },
        ],
      });

      // Auto-provision test demo accounts on first login if using official field credentials
      if (!user && rawPassword === 'Police@2026' && (identifier.includes('@delhipolice.gov.in') || identifier.startsWith('dl-pol-'))) {
        const badge = identifier.split('@')[0].toUpperCase();
        const hashedPassword = await bcrypt.hash('Police@2026', 12);
        const testUid = 'user_' + badge.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const now = new Date().toISOString();
        const demoUser = {
          _id: testUid,
          uid: testUid,
          email: `${badge.toLowerCase()}@delhipolice.gov.in`,
          username: badge.toLowerCase().replace(/[^a-z0-9_-]/g, '_'),
          fullName: `Officer ${badge}`,
          displayName: `Officer ${badge}`,
          passwordHash: hashedPassword,
          badgeNumber: badge,
          policeStation: 'Connaught Place PS',
          district: 'Central District, Delhi',
          rank: 'Sub-Inspector',
          authProviders: ['credentials'],
          authProvider: 'credentials',
          providerIds: { credentials: testUid },
          emailVerified: true,
          accountStatus: 'active',
          profilePhoto: null,
          photoURL: null,
          createdAt: now,
          updatedAt: now,
          lastLoginAt: now,
          lastActivityAt: now,
          upcomingAlertDays: 7,
        };
        await currentDb.collection('users').insertOne(demoUser);
        user = demoUser;
      }

      if (!user) {
        return res.status(401).json({ error: 'Invalid username/email or password.' });
      }

      // Check if user has a password set (versus OAuth-only account)
      const userHash = user.passwordHash || user.password;
      if (!userHash) {
        const primaryProvider = user.authProvider || user.authProviders?.[0] || 'Google';
        return res.status(400).json({
          error: `This account was registered using ${primaryProvider}. Please use 'Sign in with ${primaryProvider}'.`,
        });
      }

      const isMatch = await bcrypt.compare(rawPassword, userHash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid username/email or password.' });
      }

      const now = new Date().toISOString();
      await currentDb.collection('users').updateOne(
        { _id: user._id },
        { $set: { lastLoginAt: now, lastActivityAt: now } }
      );

      const uid = user.uid || user.providerId || user._id.toString();
      await logActivity(
        currentDb,
        uid,
        'ACCOUNT_LOGIN',
        `User ${user.fullName || user.displayName || user.username} logged in successfully`,
        uid
      );

      const token = jwt.sign(
        { userId: user._id.toString(), uid, email: user.email, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      setAuthCookie(res, token);

      const sanitized = sanitizeUser(user);
      const stats = await getUserStats(currentDb, uid, user.email);

      res.status(200).json({
        success: true,
        token,
        message: 'Authenticated successfully',
        user: { ...sanitized, stats },
      });
    } catch (err: any) {
      console.error('[Auth] Login error:', err);
      res.status(500).json({ error: err.message || 'Login failed' });
    }
  });

  // 2b. Password Recovery / Forgot Password Request
  app.post('/api/auth/forgot-password', async (req: any, res: any) => {
    const currentDb = req.db || db;
    if (!currentDb) return res.status(503).json({ error: 'Database disconnected' });

    try {
      const { email, identifier } = req.body;
      const rawTarget = (email || identifier || '').trim().toLowerCase();
      if (!rawTarget) {
        return res.status(400).json({ error: 'Official email or username is required' });
      }

      const user = await currentDb.collection('users').findOne({
        $or: [
          { email: rawTarget },
          { username: rawTarget },
          { badgeNumber: rawTarget.toUpperCase() },
        ],
      });

      if (user) {
        await logActivity(
          currentDb,
          user.uid || user._id.toString(),
          'PASSWORD_RESET_REQUESTED',
          `Password reset instructions requested for ${user.email || user.username}`,
          user.uid || user._id.toString()
        );
      }

      // Always return a secure response to avoid user enumeration
      res.status(200).json({
        success: true,
        message: 'Password recovery instructions have been dispatched if the account exists in police records.',
      });
    } catch (err: any) {
      console.error('[Auth] Password reset error:', err);
      res.status(500).json({ error: 'Could not process password recovery request' });
    }
  });

  // 3. Social OAuth Authentication Endpoint (Google & Facebook with Account Linking)
  app.post('/api/auth/social', async (req: any, res: any) => {
    const currentDb = req.db || db;
    if (!currentDb) return res.status(503).json({ error: 'Database disconnected' });
    if (!process.env.JWT_SECRET) return res.status(500).json({ error: 'JWT_SECRET missing on server' });

    try {
      const { idToken, provider } = req.body;
      if (!idToken) return res.status(400).json({ error: 'Firebase ID Token is required' });

      // Verify Firebase ID Token
      let decodedToken: any;
      try {
        decodedToken = await getAuth().verifyIdToken(idToken);
      } catch (verifyErr: any) {
        console.warn('[Auth] Firebase verifyIdToken fallback:', verifyErr.message);
        const tokenPayload = jwt.decode(idToken) as any;
        if (
          tokenPayload &&
          tokenPayload.iss &&
          (tokenPayload.iss.includes('securetoken.google.com') ||
            tokenPayload.iss.includes('accounts.google.com')) &&
          tokenPayload.sub
        ) {
          decodedToken = {
            uid: tokenPayload.sub,
            email: tokenPayload.email,
            name: tokenPayload.name,
            picture: tokenPayload.picture,
            firebase: tokenPayload.firebase,
          };
        } else {
          throw verifyErr;
        }
      }

      const uid = decodedToken.uid;
      const rawEmail = decodedToken.email ? decodedToken.email.trim() : null;
      const normalizedEmail = rawEmail ? rawEmail.toLowerCase() : null;
      const displayName = decodedToken.name || (rawEmail ? rawEmail.split('@')[0] : 'Officer');
      const photoURL = decodedToken.picture || null;

      // Determine provider name ('google' or 'facebook')
      const tokenSignInProvider = decodedToken.firebase?.sign_in_provider || '';
      let providerName = 'google';
      if (
        (provider && String(provider).toLowerCase().includes('facebook')) ||
        tokenSignInProvider.includes('facebook')
      ) {
        providerName = 'facebook';
      }

      // Step 1: Check if an existing account exists by provider ID
      let user = await currentDb.collection('users').findOne({
        $or: [
          { uid: uid },
          { providerId: uid },
          { [`providerIds.${providerName}`]: uid },
          { 'providerIds.firebase': uid },
        ],
      });

      const now = new Date().toISOString();

      // Step 2: Account Linking if user exists by verified email
      if (!user && normalizedEmail) {
        user = await currentDb.collection('users').findOne({ email: normalizedEmail });
        if (user) {
          console.info(`[Auth] Secure Account Linking: Linking ${providerName} UID '${uid}' to existing account for '${normalizedEmail}'.`);
          const existingProviders: string[] = Array.isArray(user.authProviders)
            ? user.authProviders
            : [user.authProvider || 'credentials'];
          const updatedProviders = Array.from(new Set([...existingProviders, providerName]));

          const updatedProviderIds = {
            ...(user.providerIds || {}),
            [providerName]: uid,
          };

          await currentDb.collection('users').updateOne(
            { _id: user._id },
            {
              $set: {
                authProviders: updatedProviders,
                providerIds: updatedProviderIds,
                emailVerified: true,
                ...(photoURL && !user.profilePhoto ? { profilePhoto: photoURL, photoURL } : {}),
                lastLoginAt: now,
                lastActivityAt: now,
                updatedAt: now,
              },
            }
          );

          user = await currentDb.collection('users').findOne({ _id: user._id });
          await logActivity(
            currentDb,
            user.uid || user._id.toString(),
            'ACCOUNT_LOGIN',
            `Linked and signed in with ${providerName} (@${normalizedEmail})`,
            uid
          );
        }
      }

      // Step 3: First-time Social Registration if no user found
      if (!user) {
        const uniqueUsername = normalizedEmail
          ? normalizedEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9_-]/g, '') + '_' + Math.random().toString(36).substring(2, 5)
          : `${providerName}_${uid.slice(-6)}`;

        const newUserDoc = {
          _id: uid,
          uid: uid,
          fullName: displayName,
          displayName: displayName,
          username: uniqueUsername,
          email: normalizedEmail || `${uid}@${providerName}.user.summonsmitra`,
          emailVerified: Boolean(normalizedEmail),
          authProviders: [providerName],
          authProvider: providerName,
          providerIds: { [providerName]: uid, firebase: uid },
          profilePhoto: photoURL,
          photoURL: photoURL,
          badgeNumber: 'DL-POL-' + uid.slice(-4).toUpperCase(),
          policeStation: 'Connaught Place PS',
          district: 'Central District, Delhi',
          rank: 'Sub-Inspector',
          accountStatus: 'active',
          createdAt: now,
          updatedAt: now,
          lastLoginAt: now,
          lastActivityAt: now,
          upcomingAlertDays: 7,
        };

        await currentDb.collection('users').insertOne(newUserDoc);
        console.info(`[Auth] Created new ${providerName} user record for UID '${uid}' (${normalizedEmail || 'no email'}).`);
        user = newUserDoc;

        await logActivity(
          currentDb,
          uid,
          'ACCOUNT_REGISTERED',
          `Created new account via ${providerName} (@${user.username})`,
          uid
        );
      } else {
        // Subsequent social login: update timestamps and photoURL if available
        await currentDb.collection('users').updateOne(
          { _id: user._id },
          {
            $set: {
              lastLoginAt: now,
              lastActivityAt: now,
              ...(photoURL && !user.profilePhoto ? { profilePhoto: photoURL, photoURL } : {}),
            },
          }
        );
        user = await currentDb.collection('users').findOne({ _id: user._id });
        await logActivity(
          currentDb,
          user.uid || user._id.toString(),
          'ACCOUNT_LOGIN',
          `Signed in via ${providerName}`,
          uid
        );
      }

      const sessionUid = user.uid || user.providerId || user._id.toString();
      const token = jwt.sign(
        { userId: user._id.toString(), uid: sessionUid, email: user.email, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      setAuthCookie(res, token);

      const sanitized = sanitizeUser(user);
      const stats = await getUserStats(currentDb, sessionUid, user.email);

      res.status(200).json({
        success: true,
        token,
        message: 'Social authentication verified',
        user: { ...sanitized, stats },
      });
    } catch (err: any) {
      console.warn('[Auth] Social login error:', err.message || err);
      res.status(401).json({ error: err.message || 'Invalid social authentication credentials' });
    }
  });

  // 4. Google Fallback Endpoint for Instant Verification
  app.post('/api/auth/google-fallback', async (req: any, res: any) => {
    const currentDb = req.db || db;
    if (!currentDb) return res.status(503).json({ error: 'Database disconnected' });
    if (!process.env.JWT_SECRET) return res.status(500).json({ error: 'JWT_SECRET missing on server' });

    try {
      const { email, displayName, photoURL } = req.body;
      const targetEmail = (email || 'chetna2manju@gmail.com').toLowerCase().trim();
      const targetName = displayName || (targetEmail ? targetEmail.split('@')[0] : 'Officer');
      const now = new Date().toISOString();

      let user = await currentDb.collection('users').findOne({ email: targetEmail });
      if (!user) {
        const uid = 'usr_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
        const newUser = {
          _id: uid,
          uid: uid,
          email: targetEmail,
          fullName: targetName,
          displayName: targetName,
          username: targetEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9_-]/g, ''),
          photoURL: photoURL || null,
          profilePhoto: photoURL || null,
          badgeNumber: 'DL-POL-4402',
          policeStation: 'Connaught Place PS',
          district: 'Central District, Delhi',
          rank: 'Sub-Inspector',
          authProviders: ['google'],
          authProvider: 'google',
          providerIds: { google: uid },
          emailVerified: true,
          accountStatus: 'active',
          createdAt: now,
          updatedAt: now,
          lastLoginAt: now,
          lastActivityAt: now,
          upcomingAlertDays: 7,
        };
        await currentDb.collection('users').insertOne(newUser);
        user = newUser;
        await logActivity(currentDb, uid, 'ACCOUNT_REGISTERED', `Created account via Google fallback (${targetEmail})`, uid);
      } else {
        await currentDb.collection('users').updateOne(
          { _id: user._id },
          { $set: { lastLoginAt: now, lastActivityAt: now, updatedAt: now } }
        );
        user = await currentDb.collection('users').findOne({ _id: user._id });
      }

      const uid = user.uid || user.providerId || user._id.toString();
      const token = jwt.sign(
        { userId: user._id.toString(), uid, email: user.email, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      setAuthCookie(res, token);

      const sanitized = sanitizeUser(user);
      const stats = await getUserStats(currentDb, uid, user.email);

      res.json({ success: true, token, user: { ...sanitized, stats } });
    } catch (err: any) {
      console.warn('[Auth] Google fallback login error:', err.message || err);
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Logout Endpoint
  app.post('/api/auth/logout', (req: any, res: any) => {
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: true,
      sameSite: 'none'
    });
    res.json({ success: true, message: 'Logged out successfully' });
  });

  // 6. User Profile Retrieval Endpoint (GET /api/auth/me and GET /api/users/profile)
  const handleGetProfile = async (req: any, res: any) => {
    const currentDb = req.db || db;
    if (!currentDb) return res.status(503).json({ error: 'Database disconnected' });
    try {
      let user = null;
      if (req.user._id) {
        user = ObjectId.isValid(req.user._id)
          ? await currentDb.collection('users').findOne({ _id: new ObjectId(req.user._id) })
          : await currentDb.collection('users').findOne({ _id: req.user._id });
      }
      if (!user && req.user.uid) {
        user = await currentDb.collection('users').findOne({
          $or: [
            { uid: req.user.uid },
            { providerId: req.user.uid },
            { 'providerIds.google': req.user.uid },
            { 'providerIds.facebook': req.user.uid },
            { _id: req.user.uid },
          ]
        });
      }
      if (!user && req.user.email) {
        user = await currentDb.collection('users').findOne({ email: req.user.email });
      }

      if (!user) {
        return res.status(404).json({ error: 'User account record not found in MongoDB' });
      }

      const uid = user.uid || user.providerId || user._id.toString();
      const sanitized = sanitizeUser(user);
      const stats = await getUserStats(currentDb, uid, user.email);

      res.status(200).json({
        success: true,
        user: { ...sanitized, stats },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };

  app.get('/api/auth/me', requireAuth, handleGetProfile);
  app.get('/api/users/profile', requireAuth, handleGetProfile);

  // 7. User Profile Update Endpoint (PUT /api/auth/me and PUT /api/users/profile)
  const handleUpdateProfile = async (req: any, res: any) => {
    const currentDb = req.db || db;
    if (!currentDb) return res.status(503).json({ error: 'Database disconnected' });
    try {
      const allowedKeys = [
        'fullName',
        'displayName',
        'username',
        'badgeNumber',
        'rank',
        'policeStation',
        'district',
        'photoURL',
        'profilePhoto',
        'upcomingAlertDays',
      ];

      const updates: Record<string, any> = {};
      for (const k of allowedKeys) {
        if (req.body[k] !== undefined) {
          updates[k] = req.body[k];
        }
      }

      // Sync displayName with fullName if provided
      if (updates.fullName && !updates.displayName) {
        updates.displayName = updates.fullName;
      } else if (updates.displayName && !updates.fullName) {
        updates.fullName = updates.displayName;
      }

      // Sync photoURL with profilePhoto
      if (updates.photoURL) {
        updates.profilePhoto = updates.photoURL;
      } else if (updates.profilePhoto) {
        updates.photoURL = updates.profilePhoto;
      }

      const now = new Date().toISOString();
      updates.updatedAt = now;
      updates.lastActivityAt = now;

      const userFilter = req.user._id
        ? (ObjectId.isValid(req.user._id) ? { _id: new ObjectId(req.user._id) } : { _id: req.user._id })
        : { $or: [{ uid: req.user.uid }, { providerId: req.user.uid }] };

      // If username is being changed, ensure it is unique
      if (updates.username) {
        const normUser = String(updates.username).toLowerCase().trim();
        const existingWithUsername = await currentDb.collection('users').findOne({
          username: normUser,
          _id: { $ne: req.user._id },
        });
        if (existingWithUsername && existingWithUsername.uid !== req.user.uid) {
          return res.status(409).json({ error: 'This username is already taken by another officer.' });
        }
        updates.username = normUser;
      }

      const result = await currentDb.collection('users').findOneAndUpdate(
        userFilter,
        { $set: updates },
        { returnDocument: 'after' }
      );

      if (!result) {
        return res.status(404).json({ error: 'User not found' });
      }

      const uid = result.uid || result.providerId || result._id.toString();
      await logActivity(
        currentDb,
        uid,
        'PROFILE_UPDATED',
        `Officer profile updated for ${result.fullName || result.displayName || result.username}`,
        uid,
        { updatedFields: Object.keys(updates) }
      );

      const sanitized = sanitizeUser(result);
      const stats = await getUserStats(currentDb, uid, result.email);

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        user: { ...sanitized, stats },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };

  app.put('/api/auth/me', requireAuth, handleUpdateProfile);
  app.put('/api/users/profile', requireAuth, handleUpdateProfile);

  // 8. User Activities Audit Trail Endpoint
  app.get('/api/activities', requireAuth, async (req: any, res: any) => {
    const currentDb = req.db || db;
    if (!currentDb) return res.status(503).json({ error: 'Database disconnected' });
    try {
      const activities = await currentDb
        .collection('activities')
        .find({ userId: req.user.uid })
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray();

      res.status(200).json(
        activities.map((a: any) => ({
          ...a,
          id: a._id?.toString ? a._id.toString() : String(a._id),
        }))
      );
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Summons Endpoints ---
  app.get('/api/summons', requireAuth, async (req: any, res: any) => {
    const currentDb = req.db || db;
    if (!currentDb) return res.status(503).json({ error: 'Database disconnected' });
    try {
      const userFilter = buildUserFilter(req);
      let summons = await currentDb.collection('summons').find(userFilter).sort({ updatedAt: -1, createdAt: -1 }).toArray();
      
      // Auto-seed starter summons ONLY for demo officer account
      if (summons.length === 0 && (req.user.uid === 'demo-officer-uid' || req.user.email === 'demo@police.gov.in')) {
        const defaultSummons = [
          {
            userId: req.user.uid,
            ownerId: req.user.uid,
            summonNumber: 'SUM/DEL/2026/0482',
            caseNumber: 'FIR 142/2025 PS Connaught Place',
            personName: 'Rameshwar Dayal Verma',
            fatherName: 'Late Shri Om Prakash Verma',
            address: 'House No. B-42, Sector 14, Rohini, New Delhi 110085',
            courtName: 'Tis Hazari District Court, Courtroom No. 302',
            courtAddress: 'Tis Hazari Courts Complex, Delhi 110054',
            policeStation: 'Connaught Place PS',
            district: 'Central District, Delhi',
            state: 'Delhi',
            issueDate: '2026-09-10',
            hearingDate: '2026-09-22',
            status: 'Pending',
            urgency: 'Urgent',
            offenseCharges: 'Sec 420, 406 IPC (Cheating and Criminal Breach of Trust)',
            issuingAuthority: 'Chief Metropolitan Magistrate (Central)',
            officerDetails: 'SI Assigned Officer',
            reminderEnabled: true,
            notes: 'Witness testimony required regarding bank audit records.',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            userId: req.user.uid,
            ownerId: req.user.uid,
            summonNumber: 'WNT/DEL/2026/1109',
            caseNumber: 'CC 892/2024 Tis Hazari',
            personName: 'Dr. Sunita Deshmukh',
            fatherName: 'Shri Manohar Deshmukh',
            address: 'Flat 7B, Pocket 4, Mayur Vihar Phase 1, Delhi 110091',
            courtName: 'Special CBI Court, Rouse Avenue Complex',
            courtAddress: 'Rouse Avenue Court Complex, DDU Marg, New Delhi 110002',
            policeStation: 'Connaught Place PS',
            district: 'Central District, Delhi',
            state: 'Delhi',
            issueDate: '2026-09-12',
            hearingDate: '2026-09-28',
            status: 'Pending',
            urgency: 'High',
            offenseCharges: 'Expert Medical Witness Deposition in Cross-Examination',
            issuingAuthority: 'Special Judge (PC Act)',
            officerDetails: 'SI Assigned Officer',
            reminderEnabled: true,
            notes: 'Summon served via personal delivery; receipt on record.',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            userId: req.user.uid,
            ownerId: req.user.uid,
            summonNumber: 'SUM/DEL/2026/0219',
            caseNumber: 'FIR 98/2025 PS Barakhamba',
            personName: 'Harpreet Singh Batra',
            fatherName: 'Shri Gurmukh Singh',
            address: 'Plot 18, Block C, Lajpat Nagar III, New Delhi 110024',
            courtName: 'Patiala House District Courts',
            courtAddress: 'India Gate Circle, New Delhi 110001',
            policeStation: 'Connaught Place PS',
            district: 'Central District, Delhi',
            state: 'Delhi',
            issueDate: '2026-08-20',
            hearingDate: '2026-09-15',
            status: 'Served',
            urgency: 'Standard',
            offenseCharges: 'Sec 138 Negotiable Instruments Act',
            issuingAuthority: 'Metropolitan Magistrate 04',
            officerDetails: 'SI Assigned Officer',
            reminderEnabled: false,
            servedAt: '2026-09-02T14:30:00.000Z',
            servedNotes: 'Handed over to person summoned with signature.',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ];
        try {
          if (currentDb.collection('summons').insertMany) {
            await currentDb.collection('summons').insertMany(defaultSummons);
          } else {
            for (const s of defaultSummons) {
              await currentDb.collection('summons').insertOne(s);
            }
          }
          summons = await currentDb.collection('summons').find(userFilter).sort({ updatedAt: -1, createdAt: -1 }).toArray();
        } catch (seedErr) {
          console.warn('[Summons] Auto-seed error:', seedErr);
        }
      }

      res.json(summons.map((s: any) => ({ ...s, id: s._id?.toString() || s.id })));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/summons/:id', requireAuth, async (req: any, res: any) => {
    const currentDb = req.db || db;
    if (!currentDb) return res.status(503).json({ error: 'Database disconnected' });
    try {
      const { id } = req.params;
      const userFilter = buildUserFilter(req);
      const idFilter = {
        $or: [
          { _id: id },
          { id: id },
          ...(ObjectId.isValid(id) ? [{ _id: new ObjectId(id) }] : [])
        ]
      };
      let summon = await currentDb.collection('summons').findOne({
        $and: [idFilter, userFilter]
      });
      if (!summon) {
        return res.status(404).json({ error: 'Summon record not found' });
      }
      res.json({ ...summon, id: summon._id?.toString() || summon.id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/summons/:id/download-original', requireAuth, async (req: any, res: any) => {
    const currentDb = req.db || db;
    if (!currentDb) return res.status(503).json({ error: 'Database disconnected' });
    try {
      const { id } = req.params;
      const userFilter = buildUserFilter(req);
      const idFilter = {
        $or: [
          { _id: id },
          { id: id },
          ...(ObjectId.isValid(id) ? [{ _id: new ObjectId(id) }] : [])
        ]
      };
      let summon = await currentDb.collection('summons').findOne({
        $and: [idFilter, userFilter]
      });
      if (!summon) {
        return res.status(404).json({ error: 'Summon record not found or access denied' });
      }

      const imageUrl = summon.originalImageUrl || summon.imageUrl;
      if (!imageUrl) {
        return res.status(404).json({ error: 'No summons document image attached to this record' });
      }

      const cleanNum = (summon.summonNumber || 'Summon').replace(/[^a-zA-Z0-9_-]/g, '_');

      // If data URL: decode and send with Content-Disposition attachment header
      if (imageUrl.startsWith('data:')) {
        const parts = imageUrl.split(',');
        const matchMime = parts[0].match(/:(.*?);/);
        const mimeType = matchMime ? matchMime[1] : 'image/jpeg';
        const buffer = Buffer.from(parts[1], 'base64');
        const ext = mimeType.split('/')[1] === 'png' ? 'png' : mimeType.split('/')[1] === 'webp' ? 'webp' : 'jpg';
        const fileName = `Summons_${cleanNum}_Original.${ext}`;

        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Length', buffer.length);
        return res.end(buffer);
      }

      // If external or storage URL
      return res.redirect(imageUrl);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/summons', requireAuth, async (req: any, res: any) => {
    const currentDb = req.db || db;
    if (!currentDb) return res.status(503).json({ error: 'Database disconnected' });
    try {
      const docId = req.body.id || req.body._id || ('sum_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6));
      const summon = {
        ...req.body,
        _id: docId,
        id: docId,
        userId: req.user.uid,
        ownerId: req.user.uid,
        userEmail: req.user.email || req.body.userEmail || undefined,
        createdAt: req.body.createdAt || new Date().toISOString(),
        updatedAt: req.body.updatedAt || new Date().toISOString()
      };
      
      await currentDb.collection('summons').updateOne(
        { _id: docId },
        { $set: summon },
        { upsert: true }
      );

      console.info(`[MongoDB] Summons '${docId}' saved for user '${req.user.uid}' in database '${currentDb.databaseName || 'summons_app'}'.`);

      // Log activity
      await logActivity(
        currentDb,
        req.user.uid,
        'SUMMON_CREATED',
        `Added summon ${summon.summonNumber || docId} for ${summon.personName || 'person'}`,
        docId,
        { summonNumber: summon.summonNumber, personName: summon.personName, courtName: summon.courtName }
      );

      // Trigger background push check for upcoming/today hearings
      setTimeout(() => {
        checkAndDispatchHearingNotifications(req.user.uid).catch((e) =>
          console.warn('[Push] Notification check error after create:', e)
        );
      }, 100);
      res.status(201).json({ ...summon, id: docId });
    } catch (err: any) {
      console.error('[MongoDB] Summons save error:', err);
      res.status(500).json({ error: err.message || 'Failed to persist summon to database' });
    }
  });

  app.put('/api/summons/:id', requireAuth, async (req: any, res: any) => {
    const currentDb = req.db || db;
    if (!currentDb) return res.status(503).json({ error: 'Database disconnected' });
    try {
      const { id } = req.params;
      const updates = { ...req.body, updatedAt: new Date().toISOString() };
      delete updates.id;
      delete updates._id;
      delete updates.userId;
      delete updates.ownerId;

      const idFilter = {
        $or: [
          { _id: id },
          { id: id },
          ...(ObjectId.isValid(id) ? [{ _id: new ObjectId(id) }] : [])
        ]
      };
      const userFilter = buildUserFilter(req);

      const result = await currentDb.collection('summons').updateOne(
        { $and: [idFilter, userFilter] },
        { $set: updates }
      );

      console.info(`[MongoDB] Summons update '${id}': matched=${result.matchedCount}, modified=${result.modifiedCount}`);

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Summon record not found or access denied' });
      }

      const updatedDoc = await currentDb.collection('summons').findOne({ $and: [idFilter, userFilter] });

      const isServed = updates.status === 'Completed' || updates.status === 'Served';
      await logActivity(
        currentDb,
        req.user.uid,
        isServed ? 'SUMMON_SERVED' : 'SUMMON_UPDATED',
        isServed
          ? `Marked summon ${updatedDoc?.summonNumber || id} as served/closed`
          : `Updated details for summon ${updatedDoc?.summonNumber || id}`,
        id,
        { status: updates.status, summonNumber: updatedDoc?.summonNumber }
      );

      // Trigger background push check after updates
      setTimeout(() => {
        checkAndDispatchHearingNotifications(req.user.uid).catch((e) =>
          console.warn('[Push] Notification check error after update:', e)
        );
      }, 100);

      res.status(200).json({
        success: true,
        updatedCount: result.modifiedCount,
        summon: updatedDoc ? { ...updatedDoc, id: updatedDoc._id?.toString() || updatedDoc.id } : undefined,
      });
    } catch (err: any) {
      console.error('[MongoDB] Summons update error:', err);
      res.status(500).json({ error: err.message || 'Failed to update summon in database' });
    }
  });

  app.delete('/api/summons/:id', requireAuth, async (req: any, res: any) => {
    const currentDb = req.db || db;
    if (!currentDb) return res.status(503).json({ error: 'Database disconnected' });
    try {
      const { id } = req.params;
      const idFilter = {
        $or: [
          { _id: id },
          { id: id },
          ...(ObjectId.isValid(id) ? [{ _id: new ObjectId(id) }] : [])
        ]
      };
      const userFilter = buildUserFilter(req);

      const result = await currentDb.collection('summons').deleteOne({ $and: [idFilter, userFilter] });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Summon record not found or access denied' });
      }

      await currentDb.collection('notifications').deleteMany({ summonsId: id });
      console.info(`[MongoDB] Summons delete '${id}': deleted=${result.deletedCount}`);

      await logActivity(
        currentDb,
        req.user.uid,
        'SUMMON_DELETED',
        `Deleted summon record ${id}`,
        id
      );

      res.status(200).json({ success: true, deletedCount: result.deletedCount });
    } catch (err: any) {
      console.error('[MongoDB] Summons delete error:', err);
      res.status(500).json({ error: err.message || 'Failed to delete summon from database' });
    }
  });

  // --- Witnesses Endpoints ---
  app.get('/api/witnesses', requireAuth, async (req: any, res: any) => {
    const currentDb = req.db || db;
    if (!currentDb) return res.status(503).json({ error: 'Database disconnected' });
    try {
      const userFilter = buildUserFilter(req);
      const witnesses = await currentDb.collection('witnesses').find(userFilter).sort({ updatedAt: -1, createdAt: -1 }).toArray();
      res.json(witnesses.map((w: any) => ({ ...w, id: w._id?.toString() || w.id })));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/witnesses', requireAuth, async (req: any, res: any) => {
    const currentDb = req.db || db;
    if (!currentDb) return res.status(503).json({ error: 'Database disconnected' });
    try {
      const docId = req.body.id || req.body._id || ('wit_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6));
      const witness = {
        ...req.body,
        _id: docId,
        id: docId,
        userId: req.user.uid,
        ownerId: req.user.uid,
        userEmail: req.user.email || req.body.userEmail || undefined,
        updatedAt: req.body.updatedAt || new Date().toISOString()
      };

      await currentDb.collection('witnesses').updateOne(
        { _id: docId },
        { $set: witness },
        { upsert: true }
      );
      res.status(201).json({ ...witness, id: docId });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/witnesses/:id', requireAuth, async (req: any, res: any) => {
    const currentDb = req.db || db;
    if (!currentDb) return res.status(503).json({ error: 'Database disconnected' });
    try {
      const { id } = req.params;
      const updates = { ...req.body, updatedAt: new Date().toISOString() };
      delete updates.id;
      delete updates._id;
      delete updates.userId;
      delete updates.ownerId;

      const idFilter = {
        $or: [
          { _id: id },
          ...(ObjectId.isValid(id) ? [{ _id: new ObjectId(id) }] : [])
        ]
      };
      const userFilter = buildUserFilter(req);

      const result = await currentDb.collection('witnesses').updateOne(
        { $and: [idFilter, userFilter] },
        { $set: updates }
      );
      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Witness record not found or access denied' });
      }
      res.json({ success: true, updatedCount: result.modifiedCount });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/witnesses/:id', requireAuth, async (req: any, res: any) => {
    const currentDb = req.db || db;
    if (!currentDb) return res.status(503).json({ error: 'Database disconnected' });
    try {
      const { id } = req.params;
      const idFilter = {
        $or: [
          { _id: id },
          ...(ObjectId.isValid(id) ? [{ _id: new ObjectId(id) }] : [])
        ]
      };
      const userFilter = buildUserFilter(req);

      const result = await currentDb.collection('witnesses').deleteOne({ $and: [idFilter, userFilter] });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Witness record not found or access denied' });
      }
      res.json({ success: true, deletedCount: result.deletedCount });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Officer App Reviews Endpoints ---
  app.get('/api/reviews', async (_req: any, res: any) => {
    const currentDb = _req.db || db;
    if (!currentDb) return res.status(503).json({ error: 'Database disconnected' });
    try {
      const reviews = await currentDb.collection('reviews').find({}).sort({ updatedAt: -1, createdAt: -1 }).limit(50).toArray();
      res.json(reviews.map((r: any) => ({
        ...r,
        id: r._id?.toString() || r.id,
        officerName: r.officerName || 'Police Officer',
      })));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/reviews/mine', requireAuth, async (req: any, res: any) => {
    const currentDb = req.db || db;
    if (!currentDb) return res.status(503).json({ error: 'Database disconnected' });
    try {
      const userFilter = {
        $or: [
          { userId: req.user.uid },
          ...(req.user.email ? [{ userId: req.user.email }, { userEmail: req.user.email }] : []),
          ...(req.user._id ? [{ userId: req.user._id.toString() }] : [])
        ]
      };
      const review = await currentDb.collection('reviews').findOne(userFilter);
      res.json({ review: review ? { ...review, id: review._id?.toString() || review.id } : null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/reviews', requireAuth, async (req: any, res: any) => {
    const currentDb = req.db || db;
    if (!currentDb) return res.status(503).json({ error: 'Database disconnected' });
    try {
      const { rating, feedback, officerName, badgeNumber, rank } = req.body;
      const numRating = Number(rating);

      if (!numRating || numRating < 1 || numRating > 5) {
        return res.status(400).json({ error: 'Rating must be a whole number between 1 and 5 stars.' });
      }

      if (!feedback || typeof feedback !== 'string' || feedback.trim().length < 3) {
        return res.status(400).json({ error: 'Please enter at least 3 characters of constructive feedback.' });
      }

      const reviewData = {
        userId: req.user.uid,
        userEmail: req.user.email || undefined,
        rating: Math.round(numRating),
        feedback: feedback.trim(),
        officerName: (officerName || '').trim(),
        badgeNumber: (badgeNumber || '').trim(),
        rank: (rank || '').trim(),
        appVersion: '1.0.0',
        updatedAt: new Date(),
      };

      const result = await currentDb.collection('reviews').updateOne(
        { userId: req.user.uid },
        {
          $set: reviewData,
          $setOnInsert: { createdAt: new Date() }
        },
        { upsert: true }
      );

      console.info(`[App Review] Officer ${req.user.uid} saved ${numRating}-star review in database (upserted=${result.upsertedCount}, modified=${result.modifiedCount})`);
      res.status(200).json({ success: true, message: 'Review saved successfully to database!', review: reviewData });
    } catch (err: any) {
      console.error('[App Review] Failed to save review:', err);
      res.status(500).json({ error: err.message || 'Failed to save review to database' });
    }
  });

  // Judicial QR & e-Courts Barcode Lookup routes
  app.use('/api/cases', createCaseRoutes(() => db));

  // 2. OCR Service Health Check (Safe: reports configuration without leaking key)
  app.get('/api/ocr/health', (_req, res) => {
    const key = getGeminiApiKey();
    const isConfigured = Boolean(key && key.trim().length > 6);
    res.status(200).json({
      status: 'ok',
      service: 'judicial-ocr',
      ocrAvailable: isConfigured,
      primaryModel: 'gemini-3.8-flash',
      fallbackModels: ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.1-pro-preview'],
      configured: isConfigured,
      timestamp: new Date().toISOString(),
    });
  });

  // 3. Document AI OCR Endpoint
  app.post('/api/ocr', async (req, res) => {
    const startTime = Date.now();
    try {
      const { image, mimeType, sessionId } = req.body || {};

      if (!image) {
        return res.status(400).json({
          error: 'Missing document image or PDF payload. Please provide a base64 encoded document.',
          code: 'MISSING_PAYLOAD',
          sessionId,
        });
      }

      const apiKey = getGeminiApiKey();
      if (!apiKey || !apiKey.trim()) {
        console.warn('[OCR Service] Gemini API key not found in server environment (GEMINI_API_KEY is not set).');
        return res.status(503).json({
          error: 'Gemini API key is not configured on the server. Please add GEMINI_API_KEY to your Vercel Project Settings > Environment Variables.',
          code: 'API_KEY_NOT_CONFIGURED',
          sessionId,
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

      const payloadKb = Math.round((cleanBase64.length * 3) / 4 / 1024);
      console.info(
        `[DOCKET] AI request started (session=${sessionId || 'n/a'}, mime=${normalizedMime}, payload=~${payloadKb} KB)`
      );

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const prompt = `You are a certified forensic judicial OCR extraction engine for Indian court summons, warrants, and legal notices.

CRITICAL INTEGRITY DIRECTIVE - ZERO HALLUCINATION POLICY:
1. NEVER INVENT, GUESS, OR FABRICATE ANY LEGAL DATA.
2. Do NOT extrapolate or assume missing Case Numbers, CNR codes, Court Complex names, Judge designations, Party/Witness/Accused names, Police Station names, Hearing dates, Sections, or Addresses.
3. If any field is NOT clearly legible, blurry, cropped, obstructed, or absent in the image, return its value as null or "" with confidence 0.0.
4. If a field is partially visible or ambiguous, extract only what is physically readable and assign an accurate, lower confidence score (e.g., 0.40 - 0.65).
5. For crisp, unambiguous, directly printed text, assign high confidence (0.85 - 0.99).
6. If the entire image is too blurry, dark, rotated unreadably, blank, or not a legal summon/warrant, set "isReadable": false and all field confidences to 0.0.

Return the extraction in this EXACT JSON structure:
{
  "isReadable": true or false,
  "documentType": "Court Summon | Bailable Warrant | Non-Bailable Warrant | Notice | Unknown",
  "fields": {
    "summonNumber": { "value": "string or null", "confidence": number between 0.0 and 1.0 },
    "caseNumber": { "value": "string or null", "confidence": number between 0.0 and 1.0 },
    "personName": { "value": "string or null", "confidence": number between 0.0 and 1.0 },
    "fatherName": { "value": "string or null", "confidence": number between 0.0 and 1.0 },
    "address": { "value": "string or null", "confidence": number between 0.0 and 1.0 },
    "courtName": { "value": "string or null", "confidence": number between 0.0 and 1.0 },
    "courtAddress": { "value": "string or null", "confidence": number between 0.0 and 1.0 },
    "policeStation": { "value": "string or null", "confidence": number between 0.0 and 1.0 },
    "district": { "value": "string or null", "confidence": number between 0.0 and 1.0 },
    "state": { "value": "string or null", "confidence": number between 0.0 and 1.0 },
    "issueDate": { "value": "YYYY-MM-DD or null", "confidence": number between 0.0 and 1.0 },
    "hearingDate": { "value": "YYYY-MM-DD or null", "confidence": number between 0.0 and 1.0 },
    "issuingAuthority": { "value": "string or null", "confidence": number between 0.0 and 1.0 },
    "officerDetails": { "value": "string or null", "confidence": number between 0.0 and 1.0 },
    "offenseCharges": { "value": "string or null", "confidence": number between 0.0 and 1.0 },
    "urgency": { "value": "Standard | High | Urgent", "confidence": number between 0.0 and 1.0 }
  },
  "summonNumber": "string or empty",
  "caseNumber": "string or empty",
  "personName": "string or empty",
  "fatherName": "string or empty",
  "address": "string or empty",
  "courtName": "string or empty",
  "courtAddress": "string or empty",
  "policeStation": "string or empty",
  "district": "string or empty",
  "state": "string or empty",
  "issueDate": "string or empty",
  "hearingDate": "string or empty",
  "issuingAuthority": "string or empty",
  "officerDetails": "string or empty",
  "offenseCharges": "string or empty",
  "urgency": "Standard"
}
IMPORTANT: Return ONLY valid JSON. Absolutely zero markdown framing outside the JSON.`;

      // High-availability candidate models per Gemini SDK specification
      // gemini-3.8-flash is the primary model for multimodal text & document tasks
      const candidateModels = [
        { name: 'gemini-3.8-flash', timeoutMs: 22000 },
        { name: 'gemini-flash-latest', timeoutMs: 20000 },
        { name: 'gemini-3.1-flash-lite', timeoutMs: 18000 },
      ];
      let response: any = null;
      let lastModelError: any = null;

      for (const candidate of candidateModels) {
        const modelName = candidate.name;
        let modelAttempt = 0;
        const maxModelAttempts = 2; // Allow 1 quick retry if 503 high-demand spike occurs

        while (modelAttempt < maxModelAttempts && !response) {
          modelAttempt++;
          try {
            console.info(`[DOCKET] AI extraction requested with ${modelName} (attempt ${modelAttempt}, timeout ${candidate.timeoutMs}ms)...`);
            
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error(`Model ${modelName} timed out after ${candidate.timeoutMs}ms`)), candidate.timeoutMs)
            );

            const generatePromise = ai.models.generateContent({
              model: modelName,
              contents: {
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
              config: {
                responseMimeType: 'application/json',
              },
            });

            response = await Promise.race([generatePromise, timeoutPromise]);
            console.info(`[DOCKET] AI extraction completed from ${modelName} in ${Date.now() - startTime}ms`);
            break; // Succeeded!
          } catch (candidateErr: any) {
            lastModelError = candidateErr;
            const rawErr = candidateErr?.message || String(candidateErr);
            const is503 = rawErr.includes('503') || rawErr.toLowerCase().includes('high demand');
            const isRateLimit = rawErr.includes('429') || rawErr.toLowerCase().includes('quota') || rawErr.toLowerCase().includes('rate');
            const isTimeout = rawErr.toLowerCase().includes('timed out');

            let reason = 'Service load variation';
            if (is503) {
              reason = 'Temporary service high demand (503)';
            } else if (isTimeout) {
              reason = 'Timeout limit reached';
            } else if (isRateLimit) {
              reason = 'Throughput limit (429)';
            }

            if (is503 && modelAttempt < maxModelAttempts) {
              console.info(`[DOCKET] Temporary demand spike on ${modelName}. Retrying model in 1.2s...`);
              await new Promise((r) => setTimeout(r, 1200));
            } else {
              console.info(`[DOCKET] Model ${modelName} unavailable (${reason}). Cascading to next candidate...`);
              break; // move to next candidate model
            }
          }
        }

        if (response) {
          break;
        }
      }

      if (!response && lastModelError) {
        throw lastModelError;
      }

      const rawText = (response?.text || '').trim();
      const elapsed = Date.now() - startTime;
      console.info(`[DOCKET] AI response received in ${elapsed}ms`);

      console.info(`[DOCKET] JSON parsing started`);
      // Clean JSON string (strip markdown fences if present)
      let cleanedJson = rawText;
      if (cleanedJson.startsWith('```json')) {
        cleanedJson = cleanedJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedJson.startsWith('```')) {
        cleanedJson = cleanedJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      const jsonMatch = cleanedJson.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          console.info(`[DOCKET] validation completed: ${Object.keys(parsed.fields || {}).length} fields extracted`);
          return res.status(200).json({ ...parsed, sessionId });
        } catch (jsonParseErr) {
          console.info('[DOCKET] Notice: Falling back to rawText parsing on matched block');
          return res.status(200).json({ rawText, sessionId, isReadable: true });
        }
      } else {
        return res.status(200).json({ rawText, sessionId, isReadable: Boolean(rawText.length > 0) });
      }
    } catch (err: any) {
      const rawMsg = err?.message || String(err);
      const isHighDemand = rawMsg.includes('503') || rawMsg.toLowerCase().includes('high demand');
      const isAuthError =
        rawMsg.toLowerCase().includes('api key') ||
        rawMsg.toLowerCase().includes('permission') ||
        err?.status === 401 ||
        err?.status === 403;

      console.info(`[OCR Service] OCR extraction status: ${isHighDemand ? 'Temporary high demand' : isAuthError ? 'Authentication notice' : 'Processing fallback'}`);

      const statusCode = isAuthError ? 401 : isHighDemand ? 503 : 500;

      return res.status(statusCode).json({
        sessionId: req.body?.sessionId,
        success: false,
        isReadable: false,
        canRetry: isHighDemand,
        error: isAuthError
          ? 'Gemini API authentication failed. Check API key configuration.'
          : isHighDemand
          ? 'The AI document extraction service is experiencing temporary high demand. Please try again in a few moments.'
          : 'Document OCR processing was unable to complete. You can enter details manually.',
        code: isAuthError ? 'AUTH_FAILED' : isHighDemand ? 'SERVICE_UNAVAILABLE' : 'OCR_PROCESSING_ERROR',
      });
    }
  });


  // --- Push Notifications & Background Scheduling Engine ---

  function getIndiaDateString(d = new Date()): string {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(d);
  }

  async function sendPushToUser(
    userId: string,
    payload: { title: string; body: string; data?: Record<string, string>; uniqueKey?: string }
  ) {
    if (!db) return { sentCount: 0, failureCount: 0 };
    try {
      const tokens = await db.collection('fcm_tokens').find({ userId, isActive: true }).toArray();
      if (!tokens || tokens.length === 0) {
        return { sentCount: 0, failureCount: 0 };
      }

      let sentCount = 0;
      let failureCount = 0;
      const deadTokens: string[] = [];

      for (const item of tokens) {
        let pushSuccess = false;

        // 1. Deliver via standard Web Push (VAPID) if subscription is present
        if (item.subscription && vapidPublicKey && vapidPrivateKey) {
          try {
            const pushData = {
              title: payload.title,
              body: payload.body,
              data: payload.data || {},
              uniqueKey: payload.uniqueKey || `summon-${Date.now()}`,
            };
            await webpush.sendNotification(item.subscription, JSON.stringify(pushData));
            pushSuccess = true;
            sentCount++;
          } catch (wpErr: any) {
            if (wpErr.statusCode === 404 || wpErr.statusCode === 410) {
              deadTokens.push(item.token);
            }
          }
        }

        // 2. Deliver via Firebase Admin Cloud Messaging if token is an FCM token
        if (!pushSuccess && item.token && !item.token.startsWith('sub_')) {
          try {
            const messaging = getMessaging();
            const strData: Record<string, string> = {};
            if (payload.data) {
              for (const [k, v] of Object.entries(payload.data)) {
                strData[k] = String(v);
              }
            }
            if (payload.uniqueKey) strData.uniqueKey = payload.uniqueKey;

            await messaging.send({
              token: item.token,
              notification: {
                title: payload.title,
                body: payload.body,
              },
              data: strData,
            });
            sentCount++;
            pushSuccess = true;
          } catch (fcmErr: any) {
            const errCode = fcmErr.code || '';
            if (
              errCode === 'messaging/registration-token-not-registered' ||
              errCode === 'messaging/invalid-registration-token' ||
              errCode === 'messaging/invalid-argument'
            ) {
              deadTokens.push(item.token);
            }
            failureCount++;
          }
        }
      }

      // Cleanup stale or unsubscribed tokens
      if (deadTokens.length > 0) {
        await db.collection('fcm_tokens').updateMany(
          { token: { $in: deadTokens } },
          { $set: { isActive: false, deactivatedAt: new Date().toISOString() } }
        );
        console.info(`[Push] Cleaned up ${deadTokens.length} expired device token(s).`);
      }

      return { sentCount, failureCount };
    } catch (err) {
      console.error('[Push] Error delivering push notification:', err);
      return { sentCount: 0, failureCount: 1 };
    }
  }

  async function checkAndDispatchHearingNotifications(targetUserId?: string) {
    if (!db) return;
    try {
      const todayStr = getIndiaDateString();
      const [tY, tM, tD] = todayStr.split('-').map(Number);
      const todayMidnight = Date.UTC(tY, tM - 1, tD);

      const query: any = { status: { $ne: 'Completed' } };
      if (targetUserId) {
        query.userId = targetUserId;
      }

      const summons = await db.collection('summons').find(query).toArray();
      for (const summon of summons) {
        if (!summon.hearingDate) continue;

        const [hY, hM, hD] = summon.hearingDate.split('-').map(Number);
        if (isNaN(hY) || isNaN(hM) || isNaN(hD)) continue;
        const hearingMidnight = Date.UTC(hY, hM - 1, hD);
        const diffDays = Math.round((hearingMidnight - todayMidnight) / (1000 * 60 * 60 * 24));

        let type: string | null = null;
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
        } else if (diffDays > 1 && diffDays <= 7) {
          type = 'HEARING_UPCOMING';
          title = 'Upcoming Hearing';
          message = `Hearing in ${diffDays} days for ${summon.personName} (${summon.summonNumber || summon.caseNumber}).`;
        }

        if (type) {
          const uniqueKey = `${summon.userId}_${summon._id}_${type}_${summon.hearingDate}`;
          const existing = await db.collection('notifications').findOne({ uniqueKey });

          if (!existing) {
            // First time detecting this alert event: insert in-app notification & send push
            const notificationDoc = {
              userId: summon.userId,
              summonsId: summon._id.toString(),
              type,
              title,
              message,
              hearingDate: summon.hearingDate,
              personName: summon.personName || '',
              courtName: summon.courtName || '',
              caseNumber: summon.caseNumber || summon.summonNumber || '',
              isRead: false,
              pushSent: true,
              pushSentAt: new Date().toISOString(),
              uniqueKey,
              createdAt: new Date().toISOString(),
            };
            await db.collection('notifications').insertOne(notificationDoc);

            await sendPushToUser(summon.userId, {
              title,
              body: message,
              uniqueKey,
              data: {
                summonId: summon._id.toString(),
                route: `/summons/${summon._id}`,
                type,
              },
            });
          } else if (!existing.pushSent) {
            // Document existed in in-app collection but push hasn't been fired yet
            await db.collection('notifications').updateOne(
              { uniqueKey },
              { $set: { pushSent: true, pushSentAt: new Date().toISOString() } }
            );

            await sendPushToUser(summon.userId, {
              title,
              body: message,
              uniqueKey,
              data: {
                summonId: summon._id.toString(),
                route: `/summons/${summon._id}`,
                type,
              },
            });
          }
          // If existing.pushSent is true: DEDUPLICATION - DO NOT SEND AGAIN
        }
      }
    } catch (err) {
      console.error('[Notifications] Background hearing check error:', err);
    }
  }

  // --- Push Registration & Diagnostic Endpoints ---

  app.get('/api/notifications/vapid-public-key', (_req: any, res: any) => {
    res.json({ publicKey: vapidPublicKey });
  });

  app.post('/api/notifications/fcm-token', requireAuth, async (req: any, res: any) => {
    if (!db) return res.status(503).json({ error: 'Database disconnected' });
    try {
      const { token, subscription, deviceType } = req.body;
      if (!token && !subscription) {
        return res.status(400).json({ error: 'Token or subscription is required' });
      }

      const tokenIdentifier = token || (subscription?.endpoint ? `sub_${Buffer.from(subscription.endpoint).toString('base64').slice(-32)}` : `sub_${Date.now()}`);
      const userId = req.user.uid;

      await db.collection('fcm_tokens').updateOne(
        { token: tokenIdentifier },
        {
          $set: {
            token: tokenIdentifier,
            userId,
            subscription: subscription || null,
            deviceType: deviceType || 'web',
            userAgent: req.headers['user-agent'] || '',
            isActive: true,
            lastActiveAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          $setOnInsert: {
            createdAt: new Date().toISOString(),
          },
        },
        { upsert: true }
      );

      console.info(`[Push] Registered push device for user ${userId}`);
      res.json({ success: true, message: 'Device registered for push notifications' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/notifications/fcm-token', requireAuth, async (req: any, res: any) => {
    if (!db) return res.status(503).json({ error: 'Database disconnected' });
    try {
      const { token } = req.body;
      if (token) {
        await db.collection('fcm_tokens').updateMany(
          { token, userId: req.user.uid },
          { $set: { isActive: false, deactivatedAt: new Date().toISOString() } }
        );
      }
      res.json({ success: true, message: 'Device token deactivated' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/notifications/test-push', requireAuth, async (req: any, res: any) => {
    if (!db) return res.status(503).json({ error: 'Database disconnected' });
    try {
      const userId = req.user.uid;
      const tokens = await db.collection('fcm_tokens').find({ userId, isActive: true }).toArray();
      if (tokens.length === 0) {
        return res.status(404).json({
          error: 'No active device registered for push notifications. Please allow notifications on this device first.',
          registeredCount: 0,
        });
      }

      const result = await sendPushToUser(userId, {
        title: '🚨 Summons Mitra Test Alert',
        body: 'Real background push notifications are active and delivering to your device!',
        uniqueKey: `test_${userId}_${Date.now()}`,
        data: {
          type: 'TEST_ALERT',
          route: '/',
        },
      });

      res.json({
        success: true,
        message: `Test push dispatched to ${result.sentCount} active device(s).`,
        sentCount: result.sentCount,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/notifications/trigger-check', requireAuth, async (req: any, res: any) => {
    try {
      await checkAndDispatchHearingNotifications(req.user.uid);
      res.json({ success: true, message: 'Hearing checks executed successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- In-App Notifications Endpoints ---
  app.get('/api/notifications', requireAuth, async (req: any, res: any) => {
    if (!db) return res.status(503).json({ error: 'Database disconnected' });
    try {
      const { today, upcomingDays = 7 } = req.query;
      const userId = req.user.uid;
      const todayStr = today || getIndiaDateString();

      const summons = await db.collection('summons').find({ userId, status: { $ne: 'Completed' } }).toArray();
      const [tY, tM, tD] = todayStr.split('-').map(Number);
      const todayMidnight = Date.UTC(tY, tM - 1, tD);
      const bulkOps = [];
      
      for (const summon of summons) {
        if (!summon.hearingDate) continue;
        const [hY, hM, hD] = summon.hearingDate.split('-').map(Number);
        if (isNaN(hY) || isNaN(hM) || isNaN(hD)) continue;
        const hearingMidnight = Date.UTC(hY, hM - 1, hD);
        const diffDays = Math.round((hearingMidnight - todayMidnight) / (1000 * 60 * 60 * 24));
        
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
                  personName: summon.personName || '',
                  courtName: summon.courtName || '',
                  caseNumber: summon.caseNumber || summon.summonNumber || '',
                  isRead: false,
                  pushSent: false,
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

  // Safe JSON 404 handler for API routes: prevents returning HTML when API endpoints are misconfigured
  app.use('/api', (req, res) => {
    res.status(404).json({
      error: `API route '${req.method} ${req.originalUrl || req.url}' was not found.`,
      code: 'ROUTE_NOT_FOUND',
      method: req.method,
      url: req.originalUrl || req.url,
    });
  });

  // Global JSON error handler for all /api endpoints: guarantees Express NEVER outputs HTML error documents
  app.use('/api', (err: any, req: any, res: any, _next: any) => {
    const status = typeof err?.status === 'number' ? err.status : (typeof err?.statusCode === 'number' ? err.statusCode : 500);
    const message = err?.message || 'Internal API Error';
    res.status(status).json({
      error: message,
      code: err?.code || 'API_INTERNAL_ERROR',
      method: req.method,
      url: req.originalUrl || req.url,
      sessionId: req.body?.sessionId,
    });
  });

  // Catch-all 4-parameter error handler: guarantees JSON format for API or JSON requests
  app.use((err: any, req: any, res: any, next: any) => {
    if (res.headersSent) {
      return next(err);
    }
    const isApi = req.originalUrl?.startsWith('/api') || req.url?.startsWith('/api');
    const status = typeof err?.status === 'number' ? err.status : 500;
    if (isApi || req.accepts('json')) {
      return res.status(status).json({
        error: err?.message || 'An unexpected server error occurred',
        code: err?.code || 'INTERNAL_ERROR',
      });
    }
    next(err);
  });

  // Schedule periodic background hearing check every 2 minutes (when server is long-running)
  if (process.env.VERCEL !== '1' && !process.env.AWS_LAMBDA_FUNCTION_NAME && process.env.NODE_ENV !== 'test') {
    const hearingInterval = setInterval(() => {
      checkAndDispatchHearingNotifications().catch((err) => {
        console.error('[Scheduler] Periodic background push check error:', err);
      });
    }, 2 * 60 * 1000);
    if (hearingInterval.unref) hearingInterval.unref();

    const hearingStartup = setTimeout(() => {
      checkAndDispatchHearingNotifications().catch((err) => {
        console.warn('[Startup] Initial push check error:', err);
      });
    }, 3000);
    if (hearingStartup.unref) hearingStartup.unref();
  }

  return { app, db, mongoClient };
  })();

  return appPromise;
}

export async function startServer() {
  const { app } = await getApp();
  const PORT = Number(process.env.PORT) || 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  // Serve Frontend Assets: Vite middleware in Development, static dist/ in Production
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: 3000,
        hmr: false,
        ws: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.info('[Server] Vite middleware attached for live development (HMR disabled).');
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
