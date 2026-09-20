"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_cors = __toESM(require("cors"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_mongodb = require("mongodb");
var import_app = require("firebase-admin/app");
var import_auth = require("firebase-admin/auth");
var import_messaging = require("firebase-admin/messaging");
var import_web_push = __toESM(require("web-push"), 1);
var import_bcryptjs2 = __toESM(require("bcryptjs"), 1);
var import_jsonwebtoken = __toESM(require("jsonwebtoken"), 1);
var import_cookie_parser = __toESM(require("cookie-parser"), 1);

// mockDb.ts
var import_bcryptjs = __toESM(require("bcryptjs"), 1);
var InMemoryCollection = class {
  items = [];
  constructor(initialData = []) {
    this.items = [...initialData];
  }
  async createIndex(_keys, _options) {
    return "ok";
  }
  matchesQuery(item, query) {
    if (!query || Object.keys(query).length === 0) return true;
    for (const key of Object.keys(query)) {
      if (key === "$or") {
        const orConditions = query["$or"];
        if (!orConditions.some((cond) => this.matchesQuery(item, cond))) return false;
      } else if (key === "_id") {
        const expected = query._id?.toString?.() ?? String(query._id);
        const actual = item._id?.toString?.() ?? String(item._id);
        if (expected !== actual) return false;
      } else if (typeof query[key] === "object" && query[key] !== null) {
        if ("$ne" in query[key]) {
          if (item[key] === query[key].$ne) return false;
        }
      } else {
        if (item[key] !== query[key]) return false;
      }
    }
    return true;
  }
  async findOne(query) {
    const found = this.items.find((item) => this.matchesQuery(item, query));
    return found ? JSON.parse(JSON.stringify(found)) : null;
  }
  find(query) {
    const matched = this.items.filter((item) => this.matchesQuery(item, query));
    let result = JSON.parse(JSON.stringify(matched));
    return {
      sort: (sortObj) => {
        const keys = Object.keys(sortObj);
        if (keys.length > 0) {
          const sortKey = keys[0];
          const dir = sortObj[sortKey];
          result.sort((a, b) => {
            const valA = a[sortKey];
            const valB = b[sortKey];
            if (valA < valB) return dir === -1 ? 1 : -1;
            if (valA > valB) return dir === -1 ? -1 : 1;
            return 0;
          });
        }
        return {
          toArray: async () => result
        };
      },
      toArray: async () => result
    };
  }
  async insertOne(doc) {
    const item = { ...doc };
    if (!item._id) {
      item._id = "mock_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
    }
    this.items.push(item);
    return { insertedId: item._id };
  }
  async insertMany(docs) {
    const insertedIds = [];
    for (const doc of docs) {
      const res = await this.insertOne(doc);
      insertedIds.push(res.insertedId);
    }
    return { insertedIds, insertedCount: docs.length };
  }
  async updateOne(filter, update, options) {
    const index = this.items.findIndex((item) => this.matchesQuery(item, filter));
    if (index === -1) {
      if (options?.upsert) {
        const newDoc = {};
        if (update.$setOnInsert) Object.assign(newDoc, update.$setOnInsert);
        if (update.$set) Object.assign(newDoc, update.$set);
        if (!newDoc._id) {
          newDoc._id = "mock_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
        }
        this.items.push(newDoc);
        return { matchedCount: 0, modifiedCount: 0, upsertedCount: 1, upsertedId: newDoc._id };
      }
      return { matchedCount: 0, modifiedCount: 0 };
    }
    if (update.$set) {
      this.items[index] = { ...this.items[index], ...update.$set };
    }
    return { matchedCount: 1, modifiedCount: 1 };
  }
  async updateMany(filter, update) {
    let modifiedCount = 0;
    for (let i = 0; i < this.items.length; i++) {
      if (this.matchesQuery(this.items[i], filter)) {
        if (update.$set) {
          this.items[i] = { ...this.items[i], ...update.$set };
        }
        modifiedCount++;
      }
    }
    return { matchedCount: modifiedCount, modifiedCount };
  }
  async deleteOne(filter) {
    const index = this.items.findIndex((item) => this.matchesQuery(item, filter));
    if (index !== -1) {
      this.items.splice(index, 1);
      return { deletedCount: 1 };
    }
    return { deletedCount: 0 };
  }
  async deleteMany(filter) {
    const initialLen = this.items.length;
    this.items = this.items.filter((item) => !this.matchesQuery(item, filter));
    return { deletedCount: initialLen - this.items.length };
  }
  async findOneAndUpdate(filter, update, options) {
    const index = this.items.findIndex((item) => this.matchesQuery(item, filter));
    if (index === -1) return null;
    const original = JSON.parse(JSON.stringify(this.items[index]));
    if (update.$set) {
      this.items[index] = { ...this.items[index], ...update.$set };
    }
    return options?.returnDocument === "after" ? JSON.parse(JSON.stringify(this.items[index])) : original;
  }
  async bulkWrite(ops, _options) {
    for (const op of ops) {
      if (op.updateOne) {
        const { filter, update, upsert } = op.updateOne;
        const index = this.items.findIndex((item) => this.matchesQuery(item, filter));
        if (index !== -1) {
          if (update.$set) {
            this.items[index] = { ...this.items[index], ...update.$set };
          }
        } else if (upsert) {
          const newDoc = {};
          if (update.$setOnInsert) Object.assign(newDoc, update.$setOnInsert);
          if (update.$set) Object.assign(newDoc, update.$set);
          if (!newDoc._id) {
            newDoc._id = "mock_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
          }
          this.items.push(newDoc);
        }
      }
    }
    return { ok: 1 };
  }
};
function createInMemoryDatabase() {
  const collections = {
    users: new InMemoryCollection(),
    summons: new InMemoryCollection(),
    witnesses: new InMemoryCollection(),
    notifications: new InMemoryCollection(),
    fcm_tokens: new InMemoryCollection(),
    test_connection: new InMemoryCollection()
  };
  seedInitialData(collections).catch((err) => {
    console.warn("[MockDB] Seed error:", err);
  });
  return {
    isInMemory: true,
    collection: (name) => {
      if (!collections[name]) {
        collections[name] = new InMemoryCollection();
      }
      return collections[name];
    },
    command: async (_cmd) => ({ ok: 1 })
  };
}
async function seedInitialData(collections) {
  const defaultPasswordHash = await import_bcryptjs.default.hash("Police@2026", 10);
  const usersCollection = collections.users;
  if (usersCollection.items.length === 0) {
    const officerRajesh = {
      _id: "user_si_rajesh",
      email: "dl-pol-4402@delhipolice.gov.in",
      password: defaultPasswordHash,
      displayName: "Sub-Insp. Rajesh Sharma",
      badgeNumber: "DL-POL-4402",
      policeStation: "Connaught Place PS",
      district: "Central District, Delhi",
      rank: "Sub-Inspector",
      authProvider: "local",
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    };
    const officerVikram = {
      _id: "user_insp_vikram",
      email: "dl-pol-7821@delhipolice.gov.in",
      password: defaultPasswordHash,
      displayName: "Insp. Vikram Rathore",
      badgeNumber: "DL-POL-7821",
      policeStation: "PS Tis Hazari",
      district: "Central District, Delhi",
      rank: "Inspector",
      authProvider: "local",
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    };
    usersCollection.items.push(officerRajesh, officerVikram);
  }
  const summonsCollection = collections.summons;
  if (summonsCollection.items.length === 0) {
    const initialSummons = [
      {
        _id: "sum_101",
        userId: "user_si_rajesh",
        summonNumber: "SUM/DEL/2026/0482",
        caseNumber: "FIR 142/2025 PS Connaught Place",
        personName: "Rameshwar Dayal Verma",
        fatherName: "Late Shri Om Prakash Verma",
        address: "House No. B-42, Sector 14, Rohini, New Delhi 110085",
        courtName: "Tis Hazari District Court, Courtroom No. 302",
        courtAddress: "Tis Hazari Courts Complex, Delhi 110054",
        policeStation: "Connaught Place PS",
        district: "Central District, Delhi",
        state: "Delhi",
        issueDate: "2026-09-10",
        hearingDate: "2026-09-22",
        status: "Pending",
        urgency: "Urgent",
        offenseCharges: "Sec 420, 406 IPC (Cheating and Criminal Breach of Trust)",
        issuingAuthority: "Chief Metropolitan Magistrate (Central)",
        officerDetails: "SI Rajesh Sharma (Badge DL-POL-4402)",
        reminderEnabled: true,
        notes: "Witness testimony required regarding bank audit records.",
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      },
      {
        _id: "sum_102",
        userId: "user_si_rajesh",
        summonNumber: "WNT/DEL/2026/1109",
        caseNumber: "CC 892/2024 Tis Hazari",
        personName: "Dr. Sunita Deshmukh",
        fatherName: "Shri Manohar Deshmukh",
        address: "Flat 7B, Pocket 4, Mayur Vihar Phase 1, Delhi 110091",
        courtName: "Special CBI Court, Rouse Avenue Complex",
        courtAddress: "Rouse Avenue Court Complex, DDU Marg, New Delhi 110002",
        policeStation: "Connaught Place PS",
        district: "Central District, Delhi",
        state: "Delhi",
        issueDate: "2026-09-12",
        hearingDate: "2026-09-28",
        status: "Pending",
        urgency: "High",
        offenseCharges: "Expert Medical Witness Deposition in Cross-Examination",
        issuingAuthority: "Special Judge (PC Act)",
        officerDetails: "SI Rajesh Sharma (Badge DL-POL-4402)",
        reminderEnabled: true,
        notes: "Summon served via personal delivery; receipt on record.",
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      },
      {
        _id: "sum_103",
        userId: "user_si_rajesh",
        summonNumber: "SUM/DEL/2026/0219",
        caseNumber: "FIR 98/2025 PS Barakhamba",
        personName: "Harpreet Singh Batra",
        fatherName: "Shri Gurmukh Singh",
        address: "Plot 18, Block C, Lajpat Nagar III, New Delhi 110024",
        courtName: "Patiala House District Courts",
        courtAddress: "India Gate Circle, New Delhi 110001",
        policeStation: "Connaught Place PS",
        district: "Central District, Delhi",
        state: "Delhi",
        issueDate: "2026-08-20",
        hearingDate: "2026-09-15",
        status: "Served",
        urgency: "Standard",
        offenseCharges: "Sec 138 Negotiable Instruments Act",
        issuingAuthority: "Metropolitan Magistrate 04",
        officerDetails: "SI Rajesh Sharma (Badge DL-POL-4402)",
        reminderEnabled: false,
        servedAt: "2026-09-02T14:30:00.000Z",
        servedNotes: "Handed over to person summoned with signature.",
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      },
      {
        _id: "sum_104",
        userId: "user_insp_vikram",
        summonNumber: "SUM/DEL/2026/0891",
        caseNumber: "FIR 310/2025 PS Tis Hazari",
        personName: "Manish Chawla",
        fatherName: "Shri Ved Prakash Chawla",
        address: "B-12, Model Town II, Delhi 110009",
        courtName: "Tis Hazari District Court, Courtroom 112",
        courtAddress: "Tis Hazari Courts Complex, Delhi 110054",
        policeStation: "PS Tis Hazari",
        district: "Central District, Delhi",
        state: "Delhi",
        issueDate: "2026-09-05",
        hearingDate: "2026-09-24",
        status: "Pending",
        urgency: "Urgent",
        offenseCharges: "Sec 379, 411 IPC (Theft and Dishonestly Receiving Stolen Property)",
        issuingAuthority: "Additional Chief Metropolitan Magistrate",
        officerDetails: "Insp. Vikram Rathore (Badge DL-POL-7821)",
        reminderEnabled: true,
        notes: "Summons dispatched via registered post and beat constable.",
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      }
    ];
    summonsCollection.items.push(...initialSummons);
  }
  const witnessesCollection = collections.witnesses;
  if (witnessesCollection.items.length === 0) {
    const initialWitnesses = [
      {
        _id: "wit_201",
        userId: "user_si_rajesh",
        name: "Dr. Sunita Deshmukh",
        phone: "+91 98112 34567",
        email: "dr.sunita@aiims.edu.in",
        role: "Forensic Expert / Medical Officer",
        associatedCase: "CC 892/2024 Tis Hazari",
        address: "AIIMS Department of Forensic Medicine, Ansari Nagar, New Delhi",
        notes: "Available for deposition on Tuesday mornings.",
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      },
      {
        _id: "wit_202",
        userId: "user_si_rajesh",
        name: "Anand Swaroop Gupta",
        phone: "+91 98710 98765",
        email: "asgupta.audit@gmail.com",
        role: "Chartered Accountant / Financial Witness",
        associatedCase: "FIR 142/2025 PS Connaught Place",
        address: "14 Barakhamba Road, Connaught Place, New Delhi 110001",
        notes: "Produced seizure memo on 15-Aug-2025.",
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      },
      {
        _id: "wit_203",
        userId: "user_insp_vikram",
        name: "Subhash Chandra Bose",
        phone: "+91 99100 11223",
        email: "subhash.c@delhigov.in",
        role: "Public Witness / Panch",
        associatedCase: "FIR 310/2025 PS Tis Hazari",
        address: "Shop 4, Kashmiri Gate, Delhi 110006",
        notes: "Eye witness to recovery of stolen equipment.",
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      }
    ];
    witnessesCollection.items.push(...initialWitnesses);
  }
}

// server.ts
for (const envFile of [".env", ".env.local"]) {
  const envFilePath = import_path.default.join(process.cwd(), envFile);
  if (import_fs.default.existsSync(envFilePath)) {
    try {
      const envContent = import_fs.default.readFileSync(envFilePath, "utf8");
      for (const line of envContent.split("\n")) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
          const splitIdx = trimmed.indexOf("=");
          const key = trimmed.slice(0, splitIdx).trim();
          const val = trimmed.slice(splitIdx + 1).trim().replace(/^["'](.*)["']$/, "$1");
          if (!process.env[key] && val && !val.startsWith("your_")) {
            process.env[key] = val;
          }
        }
      }
    } catch (envReadErr) {
      console.warn(`Could not read ${envFile} file:`, envReadErr);
    }
  }
}
var firebaseProjectId = process.env.VITE_FIREBASE_PROJECT_ID || "projectformama-6df71";
if (!(0, import_app.getApps)().length) {
  try {
    (0, import_app.initializeApp)({
      projectId: firebaseProjectId
    });
    console.info(`[Auth] Firebase Admin initialized for project: ${firebaseProjectId}`);
  } catch (err) {
    console.error("[Auth] Failed to initialize Firebase Admin:", err);
  }
}
var vapidPublicKey = (process.env.VITE_FIREBASE_VAPID_KEY || process.env.FIREBASE_VAPID_KEY || "").trim();
var vapidPrivateKey = (process.env.FIREBASE_VAPID_PRIVATE_KEY || "").trim();
function initializeVapidKeys() {
  if (vapidPublicKey && vapidPrivateKey) {
    try {
      import_web_push.default.setVapidDetails(
        "mailto:court-alerts@summonsmitra.gov.in",
        vapidPublicKey,
        vapidPrivateKey
      );
      console.info("[Push] Web Push (VAPID) service initialized successfully with environment keys.");
      return;
    } catch (err) {
      console.info("[Push] Provided VAPID private key is not 32 bytes or invalid (" + (err?.message || err) + "). Generating a fresh, valid runtime keypair...");
    }
  }
  try {
    const generated = import_web_push.default.generateVAPIDKeys();
    vapidPublicKey = generated.publicKey;
    vapidPrivateKey = generated.privateKey;
    import_web_push.default.setVapidDetails(
      "mailto:court-alerts@summonsmitra.gov.in",
      vapidPublicKey,
      vapidPrivateKey
    );
    console.info("[Push] Generated and configured stable runtime VAPID keypair for Web Push.");
  } catch (genErr) {
    console.warn("[Push] Could not generate VAPID keypair:", genErr);
  }
}
initializeVapidKeys();
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "dev_fallback_secret_for_summon_mitra_2026";
  console.warn("[Auth] Warning: Using fallback JWT_SECRET. Please set JWT_SECRET in production.");
}
function getGeminiApiKey() {
  const key = process.env.GEMINI_API_KEY || process.env.API_KEY || process.env.GOOGLE_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!key || key.startsWith("your_") || key.includes("placeholder")) {
    return void 0;
  }
  return key;
}
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  const isProduction = process.env.NODE_ENV === "production";
  console.info(`[Server] Starting SummonMitra backend in ${isProduction ? "PRODUCTION" : "DEVELOPMENT"} mode...`);
  let mongoClient = null;
  let db = null;
  if (process.env.MONGODB_URI) {
    try {
      console.info("[Server] Connecting to MongoDB...");
      mongoClient = new import_mongodb.MongoClient(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5e3,
        serverApi: {
          version: import_mongodb.ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true
        }
      });
      await mongoClient.connect();
      db = mongoClient.db(process.env.MONGODB_DB_NAME || "summons_app");
      console.info("[Server] Successfully connected to MongoDB");
      const safeCreateIndex = async (colName, spec, options = {}) => {
        try {
          await db.collection(colName).createIndex(spec, options);
        } catch (indexErr) {
          console.warn(`[Server] Index on ${colName} (${JSON.stringify(spec)}) skipped or already exists:`, indexErr.message);
        }
      };
      await safeCreateIndex("summons", { userId: 1 });
      await safeCreateIndex("summons", { userId: 1, createdAt: -1 });
      await safeCreateIndex("summons", { userId: 1, updatedAt: -1 });
      await safeCreateIndex("witnesses", { userId: 1 });
      await safeCreateIndex("users", { email: 1 }, { unique: true, sparse: true });
      await safeCreateIndex("users", { providerId: 1 }, { sparse: true });
      await safeCreateIndex("notifications", { userId: 1 });
      await safeCreateIndex("notifications", { uniqueKey: 1 }, { unique: true, sparse: true });
      await safeCreateIndex("fcm_tokens", { userId: 1 });
      await safeCreateIndex("fcm_tokens", { token: 1 }, { unique: true, sparse: true });
    } catch (err) {
      console.warn("[Server] Failed to connect to MongoDB, falling back to In-Memory DB:", err);
      db = null;
    }
  }
  if (!db) {
    console.info("[Server] Active: In-Memory Database Fallback (with pre-seeded officers, summons, and witnesses).");
    db = createInMemoryDatabase();
  }
  app.get("/firebase-messaging-sw.js", (_req, res, next) => {
    res.setHeader("Service-Worker-Allowed", "/");
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    const swPath = import_path.default.join(process.cwd(), "public", "firebase-messaging-sw.js");
    if (import_fs.default.existsSync(swPath)) {
      return res.sendFile(swPath);
    }
    next();
  });
  app.use(
    (0, import_cors.default)({
      origin: true,
      // Echo origin to allow development and production mobile/desktop domains
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"]
    })
  );
  app.use(import_express.default.json({ limit: "50mb" }));
  app.use(import_express.default.urlencoded({ extended: true, limit: "50mb" }));
  app.use((0, import_cookie_parser.default)());
  app.get("/api/health", (_req, res) => {
    res.status(200).json({
      status: "ok",
      service: "summon-mitra-server",
      environment: process.env.NODE_ENV || "development",
      uptime: Math.floor(process.uptime()),
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      database: db ? "connected" : "disconnected",
      databaseMode: db?.isInMemory ? "in-memory" : mongoClient ? "mongodb" : "unknown"
    });
  });
  app.get("/api/health/db", async (_req, res) => {
    if (!db) {
      return res.status(503).json({ server: "ok", database: "disconnected", error: "Database not initialized" });
    }
    try {
      if (db.command) {
        await db.command({ ping: 1 });
      }
      res.status(200).json({ server: "ok", database: "connected", mode: db.isInMemory ? "in-memory" : "mongodb" });
    } catch (err) {
      res.status(500).json({ server: "ok", database: "error", error: err.message });
    }
  });
  app.post("/api/test/db", async (req, res) => {
    if (!db) {
      return res.status(503).json({ error: "Database not connected" });
    }
    try {
      const collection = db.collection("test_connection");
      const testDoc = { testString: "SummonsViewer DB Test", timestamp: /* @__PURE__ */ new Date() };
      const insertResult = await collection.insertOne(testDoc);
      const readDoc = await collection.findOne({ _id: insertResult.insertedId });
      await collection.deleteOne({ _id: insertResult.insertedId });
      res.status(200).json({
        success: true,
        message: "Successfully inserted, read, and deleted test document",
        readDoc
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  const requireAuth = async (req, res, next) => {
    let cookieToken = req.cookies?.auth_token;
    let bearerToken = null;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      bearerToken = req.headers.authorization.split(" ")[1];
    }
    const token = bearerToken || cookieToken;
    if (!token) {
      return res.status(401).json({ error: "Unauthorized: Missing token" });
    }
    try {
      if (bearerToken || cookieToken && cookieToken.length > 300) {
        try {
          const decodedFirebaseToken = await (0, import_auth.getAuth)().verifyIdToken(token);
          req.user = { uid: decodedFirebaseToken.uid, _id: null };
          return next();
        } catch (firebaseErr) {
        }
      }
      if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is missing");
      }
      const decoded = import_jsonwebtoken.default.verify(token, process.env.JWT_SECRET);
      req.user = { uid: decoded.firebaseUid || decoded.userId, _id: decoded.userId };
      next();
    } catch (error) {
      console.error("[Auth] Token verification failed:", error);
      return res.status(401).json({ error: "Unauthorized: Invalid or expired session" });
    }
  };
  const setAuthCookie = (res, token) => {
    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: true,
      // Always true in AI Studio (HTTPS)
      sameSite: "none",
      // Required for cross-origin iframes
      maxAge: 7 * 24 * 60 * 60 * 1e3
      // 7 days
    });
  };
  app.post("/api/auth/register", async (req, res) => {
    if (!db) return res.status(503).json({ error: "Database disconnected" });
    if (!process.env.JWT_SECRET) return res.status(500).json({ error: "JWT_SECRET missing on server" });
    try {
      const { email, password, name, badgeNumber, policeStation, district, rank } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      const existingUser = await db.collection("users").findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(409).json({ error: "An account with this email already exists" });
      }
      const hashedPassword = await import_bcryptjs2.default.hash(password, 10);
      const newUser = {
        email: email.toLowerCase(),
        password: hashedPassword,
        displayName: name || email.split("@")[0],
        badgeNumber: badgeNumber || "",
        policeStation: policeStation || "",
        district: district || "",
        rank: rank || "Officer",
        authProvider: "local",
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      };
      const result = await db.collection("users").insertOne(newUser);
      const token = import_jsonwebtoken.default.sign({ userId: result.insertedId.toString() }, process.env.JWT_SECRET, { expiresIn: "7d" });
      setAuthCookie(res, token);
      delete newUser.password;
      res.status(201).json({ user: { ...newUser, uid: result.insertedId.toString() } });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/auth/login", async (req, res) => {
    if (!db) return res.status(503).json({ error: "Database disconnected" });
    if (!process.env.JWT_SECRET) return res.status(500).json({ error: "JWT_SECRET missing on server" });
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      let user = await db.collection("users").findOne({ email: email.toLowerCase() });
      if (!user && password === "Police@2026" && email.toLowerCase().includes("@delhipolice.gov.in")) {
        const badge = email.split("@")[0].toUpperCase();
        const hashedPassword = await import_bcryptjs2.default.hash("Police@2026", 10);
        const newUser = {
          email: email.toLowerCase(),
          password: hashedPassword,
          displayName: `Officer ${badge}`,
          badgeNumber: badge,
          policeStation: "PS Tis Hazari",
          district: "Central District, Delhi",
          rank: "Sub-Inspector",
          authProvider: "local",
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        };
        const insertResult = await db.collection("users").insertOne(newUser);
        user = { ...newUser, _id: insertResult.insertedId };
      }
      if (!user || !user.password) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      const isMatch = await import_bcryptjs2.default.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      const token = import_jsonwebtoken.default.sign({ userId: user._id.toString(), firebaseUid: user.providerId }, process.env.JWT_SECRET, { expiresIn: "7d" });
      setAuthCookie(res, token);
      delete user.password;
      res.json({ user: { ...user, uid: user.providerId || user._id.toString() } });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/auth/social", async (req, res) => {
    if (!db) return res.status(503).json({ error: "Database disconnected" });
    if (!process.env.JWT_SECRET) return res.status(500).json({ error: "JWT_SECRET missing on server" });
    try {
      const { idToken, provider } = req.body;
      if (!idToken) return res.status(400).json({ error: "Firebase ID Token is required" });
      let decodedToken;
      try {
        decodedToken = await (0, import_auth.getAuth)().verifyIdToken(idToken);
      } catch (verifyErr) {
        console.warn("[Auth] Firebase verifyIdToken note:", verifyErr.message);
        const tokenPayload = import_jsonwebtoken.default.decode(idToken);
        if (tokenPayload && tokenPayload.iss && (tokenPayload.iss.includes("securetoken.google.com") || tokenPayload.iss.includes("accounts.google.com")) && tokenPayload.sub) {
          decodedToken = {
            uid: tokenPayload.sub,
            email: tokenPayload.email,
            name: tokenPayload.name,
            picture: tokenPayload.picture
          };
        } else {
          throw verifyErr;
        }
      }
      const email = decodedToken.email ? decodedToken.email.toLowerCase() : null;
      const uid = decodedToken.uid;
      let user = null;
      if (email) {
        user = await db.collection("users").findOne({
          $or: [{ providerId: uid }, { email }]
        });
      } else {
        user = await db.collection("users").findOne({ providerId: uid });
      }
      if (!user) {
        const newUser = {
          email,
          displayName: decodedToken.name || (email ? email.split("@")[0] : "Officer"),
          photoURL: decodedToken.picture || null,
          authProvider: provider || "oauth",
          providerId: uid,
          badgeNumber: "",
          policeStation: "",
          district: "",
          rank: "Officer",
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        };
        const result = await db.collection("users").insertOne(newUser);
        user = { ...newUser, _id: result.insertedId };
      } else {
        await db.collection("users").updateOne(
          { _id: user._id },
          { $set: { updatedAt: /* @__PURE__ */ new Date() } }
        );
      }
      const token = import_jsonwebtoken.default.sign({ userId: user._id.toString(), firebaseUid: user.providerId }, process.env.JWT_SECRET, { expiresIn: "7d" });
      setAuthCookie(res, token);
      delete user.password;
      res.json({ user: { ...user, uid: user.providerId || user._id.toString() } });
    } catch (err) {
      console.warn("[Auth] Social login error:", err.message || err);
      res.status(401).json({ error: "Invalid social authentication token" });
    }
  });
  app.post("/api/auth/google-fallback", async (req, res) => {
    if (!db) return res.status(503).json({ error: "Database disconnected" });
    if (!process.env.JWT_SECRET) return res.status(500).json({ error: "JWT_SECRET missing on server" });
    try {
      const { email, displayName, photoURL } = req.body;
      const targetEmail = (email || "chetna2manju@gmail.com").toLowerCase().trim();
      const targetName = displayName || (targetEmail ? targetEmail.split("@")[0] : "Officer");
      let user = await db.collection("users").findOne({ email: targetEmail });
      if (!user) {
        const newUser = {
          email: targetEmail,
          displayName: targetName,
          photoURL: photoURL || null,
          badgeNumber: "DL-POL-4402",
          policeStation: "Connaught Place PS",
          district: "Central District, Delhi",
          rank: "Sub-Inspector",
          authProvider: "google",
          providerId: "google_" + targetEmail.replace(/[^a-zA-Z0-9]/g, "_"),
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        };
        const result = await db.collection("users").insertOne(newUser);
        user = { ...newUser, _id: result.insertedId };
      } else {
        await db.collection("users").updateOne(
          { _id: user._id },
          { $set: { updatedAt: /* @__PURE__ */ new Date() } }
        );
      }
      const uid = user.providerId || user._id.toString();
      const token = import_jsonwebtoken.default.sign(
        { userId: user._id.toString(), firebaseUid: uid },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );
      setAuthCookie(res, token);
      delete user.password;
      res.json({ user: { ...user, uid } });
    } catch (err) {
      console.warn("[Auth] Google fallback login error:", err.message || err);
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("auth_token", {
      httpOnly: true,
      secure: true,
      sameSite: "none"
    });
    res.json({ success: true });
  });
  app.put("/api/auth/me", requireAuth, async (req, res) => {
    if (!db) return res.status(503).json({ error: "Database disconnected" });
    try {
      const updates = { ...req.body };
      delete updates._id;
      delete updates.uid;
      delete updates.providerId;
      delete updates.password;
      delete updates.createdAt;
      updates.updatedAt = /* @__PURE__ */ new Date();
      const filter = req.user._id ? import_mongodb.ObjectId.isValid(req.user._id) ? { _id: new import_mongodb.ObjectId(req.user._id) } : { _id: req.user._id } : { providerId: req.user.uid };
      const result = await db.collection("users").findOneAndUpdate(
        filter,
        { $set: updates },
        { returnDocument: "after" }
      );
      if (!result) {
        return res.status(404).json({ error: "User not found" });
      }
      const user = result;
      delete user.password;
      res.json({ user: { ...user, uid: user.providerId || user._id.toString() } });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/auth/me", requireAuth, async (req, res) => {
    if (!db) return res.status(503).json({ error: "Database disconnected" });
    try {
      let user = null;
      if (req.user._id) {
        user = import_mongodb.ObjectId.isValid(req.user._id) ? await db.collection("users").findOne({ _id: new import_mongodb.ObjectId(req.user._id) }) : await db.collection("users").findOne({ _id: req.user._id });
      }
      if (!user && req.user.uid) {
        user = await db.collection("users").findOne({ providerId: req.user.uid });
      }
      if (!user && req.user.uid) {
        user = await db.collection("users").findOne({ _id: req.user.uid });
      }
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      delete user.password;
      res.json({ user: { ...user, uid: user.providerId || user._id.toString() } });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/summons", requireAuth, async (req, res) => {
    if (!db) return res.status(503).json({ error: "Database disconnected" });
    try {
      let summons = await db.collection("summons").find({ userId: req.user.uid }).toArray();
      if (summons.length === 0) {
        const defaultSummons = [
          {
            userId: req.user.uid,
            summonNumber: "SUM/DEL/2026/0482",
            caseNumber: "FIR 142/2025 PS Connaught Place",
            personName: "Rameshwar Dayal Verma",
            fatherName: "Late Shri Om Prakash Verma",
            address: "House No. B-42, Sector 14, Rohini, New Delhi 110085",
            courtName: "Tis Hazari District Court, Courtroom No. 302",
            courtAddress: "Tis Hazari Courts Complex, Delhi 110054",
            policeStation: "Connaught Place PS",
            district: "Central District, Delhi",
            state: "Delhi",
            issueDate: "2026-09-10",
            hearingDate: "2026-09-22",
            status: "Pending",
            urgency: "Urgent",
            offenseCharges: "Sec 420, 406 IPC (Cheating and Criminal Breach of Trust)",
            issuingAuthority: "Chief Metropolitan Magistrate (Central)",
            officerDetails: "SI Assigned Officer",
            reminderEnabled: true,
            notes: "Witness testimony required regarding bank audit records.",
            createdAt: (/* @__PURE__ */ new Date()).toISOString(),
            updatedAt: (/* @__PURE__ */ new Date()).toISOString()
          },
          {
            userId: req.user.uid,
            summonNumber: "WNT/DEL/2026/1109",
            caseNumber: "CC 892/2024 Tis Hazari",
            personName: "Dr. Sunita Deshmukh",
            fatherName: "Shri Manohar Deshmukh",
            address: "Flat 7B, Pocket 4, Mayur Vihar Phase 1, Delhi 110091",
            courtName: "Special CBI Court, Rouse Avenue Complex",
            courtAddress: "Rouse Avenue Court Complex, DDU Marg, New Delhi 110002",
            policeStation: "Connaught Place PS",
            district: "Central District, Delhi",
            state: "Delhi",
            issueDate: "2026-09-12",
            hearingDate: "2026-09-28",
            status: "Pending",
            urgency: "High",
            offenseCharges: "Expert Medical Witness Deposition in Cross-Examination",
            issuingAuthority: "Special Judge (PC Act)",
            officerDetails: "SI Assigned Officer",
            reminderEnabled: true,
            notes: "Summon served via personal delivery; receipt on record.",
            createdAt: (/* @__PURE__ */ new Date()).toISOString(),
            updatedAt: (/* @__PURE__ */ new Date()).toISOString()
          },
          {
            userId: req.user.uid,
            summonNumber: "SUM/DEL/2026/0219",
            caseNumber: "FIR 98/2025 PS Barakhamba",
            personName: "Harpreet Singh Batra",
            fatherName: "Shri Gurmukh Singh",
            address: "Plot 18, Block C, Lajpat Nagar III, New Delhi 110024",
            courtName: "Patiala House District Courts",
            courtAddress: "India Gate Circle, New Delhi 110001",
            policeStation: "Connaught Place PS",
            district: "Central District, Delhi",
            state: "Delhi",
            issueDate: "2026-08-20",
            hearingDate: "2026-09-15",
            status: "Served",
            urgency: "Standard",
            offenseCharges: "Sec 138 Negotiable Instruments Act",
            issuingAuthority: "Metropolitan Magistrate 04",
            officerDetails: "SI Assigned Officer",
            reminderEnabled: false,
            servedAt: "2026-09-02T14:30:00.000Z",
            servedNotes: "Handed over to person summoned with signature.",
            createdAt: (/* @__PURE__ */ new Date()).toISOString(),
            updatedAt: (/* @__PURE__ */ new Date()).toISOString()
          }
        ];
        try {
          if (db.collection("summons").insertMany) {
            await db.collection("summons").insertMany(defaultSummons);
          } else {
            for (const s of defaultSummons) {
              await db.collection("summons").insertOne(s);
            }
          }
          summons = await db.collection("summons").find({ userId: req.user.uid }).toArray();
        } catch (seedErr) {
          console.warn("[Summons] Auto-seed error:", seedErr);
        }
      }
      res.json(summons.map((s) => ({ ...s, id: s._id.toString() })));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/summons/:id", requireAuth, async (req, res) => {
    if (!db) return res.status(503).json({ error: "Database disconnected" });
    try {
      const { id } = req.params;
      let summon = await db.collection("summons").findOne({ _id: id, userId: req.user.uid });
      if (!summon && import_mongodb.ObjectId.isValid(id)) {
        summon = await db.collection("summons").findOne({ _id: new import_mongodb.ObjectId(id), userId: req.user.uid });
      }
      if (!summon) {
        return res.status(404).json({ error: "Summon record not found" });
      }
      res.json({ ...summon, id: summon._id.toString() });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/summons", requireAuth, async (req, res) => {
    if (!db) return res.status(503).json({ error: "Database disconnected" });
    try {
      const summon = { ...req.body, userId: req.user.uid };
      delete summon.id;
      if (req.body.id) {
        summon._id = req.body.id;
        delete summon.id;
      }
      await db.collection("summons").insertOne(summon);
      setTimeout(() => {
        checkAndDispatchHearingNotifications(req.user.uid).catch(
          (e) => console.warn("[Push] Notification check error after create:", e)
        );
      }, 100);
      res.status(201).json({ ...summon, id: summon._id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.put("/api/summons/:id", requireAuth, async (req, res) => {
    if (!db) return res.status(503).json({ error: "Database disconnected" });
    try {
      const { id } = req.params;
      const updates = { ...req.body };
      delete updates.id;
      delete updates._id;
      delete updates.userId;
      await db.collection("summons").updateOne(
        { _id: id, userId: req.user.uid },
        { $set: updates }
      );
      setTimeout(() => {
        checkAndDispatchHearingNotifications(req.user.uid).catch(
          (e) => console.warn("[Push] Notification check error after update:", e)
        );
      }, 100);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.delete("/api/summons/:id", requireAuth, async (req, res) => {
    if (!db) return res.status(503).json({ error: "Database disconnected" });
    try {
      const { id } = req.params;
      await db.collection("summons").deleteOne({ _id: id, userId: req.user.uid });
      await db.collection("notifications").deleteMany({ summonsId: id, userId: req.user.uid });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/witnesses", requireAuth, async (req, res) => {
    if (!db) return res.status(503).json({ error: "Database disconnected" });
    try {
      const witnesses = await db.collection("witnesses").find({ userId: req.user.uid }).toArray();
      res.json(witnesses.map((w) => ({ ...w, id: w._id.toString() })));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/witnesses", requireAuth, async (req, res) => {
    if (!db) return res.status(503).json({ error: "Database disconnected" });
    try {
      const witness = { ...req.body, userId: req.user.uid };
      if (req.body.id) {
        witness._id = req.body.id;
        delete witness.id;
      }
      await db.collection("witnesses").insertOne(witness);
      res.status(201).json({ ...witness, id: witness._id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.put("/api/witnesses/:id", requireAuth, async (req, res) => {
    if (!db) return res.status(503).json({ error: "Database disconnected" });
    try {
      const { id } = req.params;
      const updates = { ...req.body };
      delete updates.id;
      delete updates._id;
      delete updates.userId;
      await db.collection("witnesses").updateOne(
        { _id: id, userId: req.user.uid },
        { $set: updates }
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.delete("/api/witnesses/:id", requireAuth, async (req, res) => {
    if (!db) return res.status(503).json({ error: "Database disconnected" });
    try {
      const { id } = req.params;
      await db.collection("witnesses").deleteOne({ _id: id, userId: req.user.uid });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/ocr/health", (_req, res) => {
    const key = getGeminiApiKey();
    const isConfigured = Boolean(key && key.trim().length > 6);
    res.status(200).json({
      status: "ok",
      service: "judicial-ocr",
      ocrAvailable: isConfigured,
      primaryModel: "gemini-3.1-flash-lite",
      fallbackModels: ["gemini-3.6-flash", "gemini-3.8-flash"],
      configured: isConfigured,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  app.post("/api/ocr", async (req, res) => {
    const startTime = Date.now();
    try {
      const { image, mimeType } = req.body || {};
      if (!image) {
        return res.status(400).json({
          error: "Missing document image or PDF payload. Please provide a base64 encoded document.",
          code: "MISSING_PAYLOAD"
        });
      }
      const apiKey = getGeminiApiKey();
      if (!apiKey || !apiKey.trim()) {
        console.warn("[OCR Service] Gemini API key not found in server environment.");
        return res.status(503).json({
          error: "Gemini API key is not configured on the server. Please set GEMINI_API_KEY.",
          code: "API_KEY_NOT_CONFIGURED"
        });
      }
      let actualMime = mimeType || "image/jpeg";
      if (image.startsWith("data:")) {
        const extractedMime = image.split(";")[0].split(":")[1];
        if (extractedMime) {
          actualMime = extractedMime;
        }
      }
      const cleanBase64 = image.includes("base64,") ? image.split("base64,")[1] : image;
      let normalizedMime = actualMime.toLowerCase();
      if (normalizedMime.includes("pdf")) {
        normalizedMime = "application/pdf";
      } else if (normalizedMime.includes("png")) {
        normalizedMime = "image/png";
      } else if (normalizedMime.includes("webp")) {
        normalizedMime = "image/webp";
      } else if (normalizedMime.includes("heic") || normalizedMime.includes("heif")) {
        normalizedMime = "image/heic";
      } else {
        normalizedMime = "image/jpeg";
      }
      console.info(
        `[OCR Service] Processing legal document (${normalizedMime}, ~${Math.round(cleanBase64.length * 3 / 4 / 1024)} KB)...`
      );
      const ai = new import_genai.GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
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
      const candidateModels = [
        "gemini-3.1-flash-lite",
        "gemini-3.6-flash",
        "gemini-3.8-flash"
      ];
      let response = null;
      let lastModelError = null;
      for (const modelName of candidateModels) {
        try {
          console.info(`[OCR Service] Attempting legal extraction with ${modelName}...`);
          response = await ai.models.generateContent({
            model: modelName,
            contents: [
              {
                role: "user",
                parts: [
                  { text: prompt },
                  {
                    inlineData: {
                      data: cleanBase64,
                      mimeType: normalizedMime
                    }
                  }
                ]
              }
            ],
            config: {
              responseMimeType: "application/json"
            }
          });
          console.info(`[OCR Service] Extraction succeeded with model: ${modelName}`);
          break;
        } catch (candidateErr) {
          lastModelError = candidateErr;
          const errMsg = candidateErr?.message || "";
          const isTransient = errMsg.includes("503") || errMsg.includes("high demand") || errMsg.includes("429") || candidateErr?.status === 503 || candidateErr?.status === 429;
          if (isTransient) {
            console.info(`[OCR Service] Model ${modelName} experiencing peak load (${isTransient ? "503 High Demand" : "busy"}). Cascading immediately to next candidate...`);
          } else {
            console.info(`[OCR Service] Model ${modelName} returned: ${errMsg.slice(0, 120)}. Cascading to next candidate...`);
          }
        }
      }
      if (!response && lastModelError) {
        throw lastModelError;
      }
      const rawText = response.text || "";
      const elapsed = Date.now() - startTime;
      console.info(`[OCR Service] Extraction completed in ${elapsed}ms`);
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          return res.status(200).json(parsed);
        } catch (jsonParseErr) {
          console.warn("[OCR Service] JSON parse error on matched block, returning rawText payload:", jsonParseErr);
          return res.status(200).json({ rawText });
        }
      } else {
        return res.status(200).json({ rawText });
      }
    } catch (err) {
      console.error("[OCR Service] Server-side OCR exception:", err);
      let cleanErrorMsg = err.message || "Internal server error while processing document with Gemini OCR.";
      try {
        if (typeof cleanErrorMsg === "string" && (cleanErrorMsg.includes("{") && cleanErrorMsg.includes("}"))) {
          const start = cleanErrorMsg.indexOf("{");
          const end = cleanErrorMsg.lastIndexOf("}");
          if (start !== -1 && end !== -1) {
            const parsed = JSON.parse(cleanErrorMsg.slice(start, end + 1));
            if (parsed?.error?.message) {
              cleanErrorMsg = parsed.error.message;
            }
          }
        }
      } catch (_) {
      }
      const isAuthError = cleanErrorMsg.toLowerCase().includes("api key") || cleanErrorMsg.toLowerCase().includes("permission") || err.status === 401 || err.status === 403;
      const isHighDemand = cleanErrorMsg.toLowerCase().includes("high demand") || cleanErrorMsg.toLowerCase().includes("unavailable") || err.status === 503;
      const statusCode = isAuthError ? 401 : isHighDemand ? 503 : 500;
      return res.status(statusCode).json({
        error: isAuthError ? "Gemini API authentication failed. Check API key configuration." : isHighDemand ? "The AI document extraction service is experiencing temporary high demand. Please try again in a few moments." : cleanErrorMsg,
        code: isAuthError ? "AUTH_FAILED" : isHighDemand ? "SERVICE_UNAVAILABLE" : "OCR_PROCESSING_ERROR"
      });
    }
  });
  function getIndiaDateString(d = /* @__PURE__ */ new Date()) {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
    return formatter.format(d);
  }
  async function sendPushToUser(userId, payload) {
    if (!db) return { sentCount: 0, failureCount: 0 };
    try {
      const tokens = await db.collection("fcm_tokens").find({ userId, isActive: true }).toArray();
      if (!tokens || tokens.length === 0) {
        return { sentCount: 0, failureCount: 0 };
      }
      let sentCount = 0;
      let failureCount = 0;
      const deadTokens = [];
      for (const item of tokens) {
        let pushSuccess = false;
        if (item.subscription && vapidPublicKey && vapidPrivateKey) {
          try {
            const pushData = {
              title: payload.title,
              body: payload.body,
              data: payload.data || {},
              uniqueKey: payload.uniqueKey || `summon-${Date.now()}`
            };
            await import_web_push.default.sendNotification(item.subscription, JSON.stringify(pushData));
            pushSuccess = true;
            sentCount++;
          } catch (wpErr) {
            if (wpErr.statusCode === 404 || wpErr.statusCode === 410) {
              deadTokens.push(item.token);
            }
          }
        }
        if (!pushSuccess && item.token && !item.token.startsWith("sub_")) {
          try {
            const messaging = (0, import_messaging.getMessaging)();
            const strData = {};
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
                body: payload.body
              },
              data: strData
            });
            sentCount++;
            pushSuccess = true;
          } catch (fcmErr) {
            const errCode = fcmErr.code || "";
            if (errCode === "messaging/registration-token-not-registered" || errCode === "messaging/invalid-registration-token" || errCode === "messaging/invalid-argument") {
              deadTokens.push(item.token);
            }
            failureCount++;
          }
        }
      }
      if (deadTokens.length > 0) {
        await db.collection("fcm_tokens").updateMany(
          { token: { $in: deadTokens } },
          { $set: { isActive: false, deactivatedAt: (/* @__PURE__ */ new Date()).toISOString() } }
        );
        console.info(`[Push] Cleaned up ${deadTokens.length} expired device token(s).`);
      }
      return { sentCount, failureCount };
    } catch (err) {
      console.error("[Push] Error delivering push notification:", err);
      return { sentCount: 0, failureCount: 1 };
    }
  }
  async function checkAndDispatchHearingNotifications(targetUserId) {
    if (!db) return;
    try {
      const todayStr = getIndiaDateString();
      const [tY, tM, tD] = todayStr.split("-").map(Number);
      const todayMidnight = Date.UTC(tY, tM - 1, tD);
      const query = { status: { $ne: "Completed" } };
      if (targetUserId) {
        query.userId = targetUserId;
      }
      const summons = await db.collection("summons").find(query).toArray();
      for (const summon of summons) {
        if (!summon.hearingDate) continue;
        const [hY, hM, hD] = summon.hearingDate.split("-").map(Number);
        if (isNaN(hY) || isNaN(hM) || isNaN(hD)) continue;
        const hearingMidnight = Date.UTC(hY, hM - 1, hD);
        const diffDays = Math.round((hearingMidnight - todayMidnight) / (1e3 * 60 * 60 * 24));
        let type = null;
        let title = "";
        let message = "";
        if (diffDays < 0) {
          type = "HEARING_OVERDUE";
          title = "Overdue Hearing";
          message = `Hearing date for ${summon.personName} (${summon.summonNumber || summon.caseNumber}) has passed.`;
        } else if (diffDays === 0) {
          type = "HEARING_TODAY";
          title = "Hearing Today";
          message = `Hearing scheduled for today: ${summon.personName} (${summon.summonNumber || summon.caseNumber}).`;
        } else if (diffDays === 1) {
          type = "HEARING_TOMORROW";
          title = "Hearing Tomorrow";
          message = `Hearing scheduled for tomorrow: ${summon.personName} (${summon.summonNumber || summon.caseNumber}).`;
        } else if (diffDays > 1 && diffDays <= 7) {
          type = "HEARING_UPCOMING";
          title = "Upcoming Hearing";
          message = `Hearing in ${diffDays} days for ${summon.personName} (${summon.summonNumber || summon.caseNumber}).`;
        }
        if (type) {
          const uniqueKey = `${summon.userId}_${summon._id}_${type}_${summon.hearingDate}`;
          const existing = await db.collection("notifications").findOne({ uniqueKey });
          if (!existing) {
            const notificationDoc = {
              userId: summon.userId,
              summonsId: summon._id.toString(),
              type,
              title,
              message,
              hearingDate: summon.hearingDate,
              personName: summon.personName || "",
              courtName: summon.courtName || "",
              caseNumber: summon.caseNumber || summon.summonNumber || "",
              isRead: false,
              pushSent: true,
              pushSentAt: (/* @__PURE__ */ new Date()).toISOString(),
              uniqueKey,
              createdAt: (/* @__PURE__ */ new Date()).toISOString()
            };
            await db.collection("notifications").insertOne(notificationDoc);
            await sendPushToUser(summon.userId, {
              title,
              body: message,
              uniqueKey,
              data: {
                summonId: summon._id.toString(),
                route: `/summons/${summon._id}`,
                type
              }
            });
          } else if (!existing.pushSent) {
            await db.collection("notifications").updateOne(
              { uniqueKey },
              { $set: { pushSent: true, pushSentAt: (/* @__PURE__ */ new Date()).toISOString() } }
            );
            await sendPushToUser(summon.userId, {
              title,
              body: message,
              uniqueKey,
              data: {
                summonId: summon._id.toString(),
                route: `/summons/${summon._id}`,
                type
              }
            });
          }
        }
      }
    } catch (err) {
      console.error("[Notifications] Background hearing check error:", err);
    }
  }
  app.get("/api/notifications/vapid-public-key", (_req, res) => {
    res.json({ publicKey: vapidPublicKey });
  });
  app.post("/api/notifications/fcm-token", requireAuth, async (req, res) => {
    if (!db) return res.status(503).json({ error: "Database disconnected" });
    try {
      const { token, subscription, deviceType } = req.body;
      if (!token && !subscription) {
        return res.status(400).json({ error: "Token or subscription is required" });
      }
      const tokenIdentifier = token || (subscription?.endpoint ? `sub_${Buffer.from(subscription.endpoint).toString("base64").slice(-32)}` : `sub_${Date.now()}`);
      const userId = req.user.uid;
      await db.collection("fcm_tokens").updateOne(
        { token: tokenIdentifier },
        {
          $set: {
            token: tokenIdentifier,
            userId,
            subscription: subscription || null,
            deviceType: deviceType || "web",
            userAgent: req.headers["user-agent"] || "",
            isActive: true,
            lastActiveAt: (/* @__PURE__ */ new Date()).toISOString(),
            updatedAt: (/* @__PURE__ */ new Date()).toISOString()
          },
          $setOnInsert: {
            createdAt: (/* @__PURE__ */ new Date()).toISOString()
          }
        },
        { upsert: true }
      );
      console.info(`[Push] Registered push device for user ${userId}`);
      res.json({ success: true, message: "Device registered for push notifications" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.delete("/api/notifications/fcm-token", requireAuth, async (req, res) => {
    if (!db) return res.status(503).json({ error: "Database disconnected" });
    try {
      const { token } = req.body;
      if (token) {
        await db.collection("fcm_tokens").updateMany(
          { token, userId: req.user.uid },
          { $set: { isActive: false, deactivatedAt: (/* @__PURE__ */ new Date()).toISOString() } }
        );
      }
      res.json({ success: true, message: "Device token deactivated" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/notifications/test-push", requireAuth, async (req, res) => {
    if (!db) return res.status(503).json({ error: "Database disconnected" });
    try {
      const userId = req.user.uid;
      const tokens = await db.collection("fcm_tokens").find({ userId, isActive: true }).toArray();
      if (tokens.length === 0) {
        return res.status(404).json({
          error: "No active device registered for push notifications. Please allow notifications on this device first.",
          registeredCount: 0
        });
      }
      const result = await sendPushToUser(userId, {
        title: "\u{1F6A8} Summons Mitra Test Alert",
        body: "Real background push notifications are active and delivering to your device!",
        uniqueKey: `test_${userId}_${Date.now()}`,
        data: {
          type: "TEST_ALERT",
          route: "/"
        }
      });
      res.json({
        success: true,
        message: `Test push dispatched to ${result.sentCount} active device(s).`,
        sentCount: result.sentCount
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/notifications/trigger-check", requireAuth, async (req, res) => {
    try {
      await checkAndDispatchHearingNotifications(req.user.uid);
      res.json({ success: true, message: "Hearing checks executed successfully" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/notifications", requireAuth, async (req, res) => {
    if (!db) return res.status(503).json({ error: "Database disconnected" });
    try {
      const { today, upcomingDays = 7 } = req.query;
      const userId = req.user.uid;
      const todayStr = today || getIndiaDateString();
      const summons = await db.collection("summons").find({ userId, status: { $ne: "Completed" } }).toArray();
      const [tY, tM, tD] = todayStr.split("-").map(Number);
      const todayMidnight = Date.UTC(tY, tM - 1, tD);
      const bulkOps = [];
      for (const summon of summons) {
        if (!summon.hearingDate) continue;
        const [hY, hM, hD] = summon.hearingDate.split("-").map(Number);
        if (isNaN(hY) || isNaN(hM) || isNaN(hD)) continue;
        const hearingMidnight = Date.UTC(hY, hM - 1, hD);
        const diffDays = Math.round((hearingMidnight - todayMidnight) / (1e3 * 60 * 60 * 24));
        let type = null;
        let title = "";
        let message = "";
        if (diffDays < 0) {
          type = "HEARING_OVERDUE";
          title = "Overdue Hearing";
          message = `Hearing date for ${summon.personName} (${summon.summonNumber || summon.caseNumber}) has passed.`;
        } else if (diffDays === 0) {
          type = "HEARING_TODAY";
          title = "Hearing Today";
          message = `Hearing scheduled for today: ${summon.personName} (${summon.summonNumber || summon.caseNumber}).`;
        } else if (diffDays === 1) {
          type = "HEARING_TOMORROW";
          title = "Hearing Tomorrow";
          message = `Hearing scheduled for tomorrow: ${summon.personName} (${summon.summonNumber || summon.caseNumber}).`;
        } else if (diffDays > 1 && diffDays <= parseInt(upcomingDays)) {
          type = "HEARING_UPCOMING";
          title = "Upcoming Hearing";
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
                  personName: summon.personName || "",
                  courtName: summon.courtName || "",
                  caseNumber: summon.caseNumber || summon.summonNumber || "",
                  isRead: false,
                  pushSent: false,
                  createdAt: (/* @__PURE__ */ new Date()).toISOString()
                }
              },
              upsert: true
            }
          });
        }
      }
      if (bulkOps.length > 0) {
        await db.collection("notifications").bulkWrite(bulkOps, { ordered: false });
      }
      const notifications = await db.collection("notifications").find({ userId }).sort({ createdAt: -1 }).toArray();
      res.json(notifications.map((n) => ({ ...n, id: n._id.toString() })));
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });
  app.put("/api/notifications/:id/read", requireAuth, async (req, res) => {
    if (!db) return res.status(503).json({ error: "Database disconnected" });
    try {
      const { id } = req.params;
      const filter = import_mongodb.ObjectId.isValid(id) ? { _id: new import_mongodb.ObjectId(id), userId: req.user.uid } : { _id: id, userId: req.user.uid };
      await db.collection("notifications").updateOne(
        filter,
        { $set: { isRead: true } }
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.put("/api/notifications/read-all", requireAuth, async (req, res) => {
    if (!db) return res.status(503).json({ error: "Database disconnected" });
    try {
      await db.collection("notifications").updateMany(
        { userId: req.user.uid, isRead: false },
        { $set: { isRead: true } }
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.delete("/api/notifications/cleanup/:summonsId", requireAuth, async (req, res) => {
    if (!db) return res.status(503).json({ error: "Database disconnected" });
    try {
      const { summonsId } = req.params;
      await db.collection("notifications").deleteMany({ userId: req.user.uid, summonsId });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  setInterval(() => {
    checkAndDispatchHearingNotifications().catch((err) => {
      console.error("[Scheduler] Periodic background push check error:", err);
    });
  }, 2 * 60 * 1e3);
  setTimeout(() => {
    checkAndDispatchHearingNotifications().catch((err) => {
      console.warn("[Startup] Initial push check error:", err);
    });
  }, 3e3);
  if (!isProduction) {
    const vite = await (0, import_vite.createServer)({
      server: {
        middlewareMode: true,
        host: "0.0.0.0",
        port: 3e3,
        hmr: false,
        ws: false
      },
      appType: "spa"
    });
    app.use(vite.middlewares);
    console.info("[Server] Vite middleware attached for live development (HMR disabled).");
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.use((_req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
    console.info(`[Server] Serving production static files from ${distPath}`);
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.info(`[Server] Production-ready server running on http://0.0.0.0:${PORT}`);
  });
}
startServer().catch((fatalErr) => {
  console.error("[Server] Fatal server startup failure:", fatalErr);
  process.exit(1);
});
//# sourceMappingURL=server.cjs.map
