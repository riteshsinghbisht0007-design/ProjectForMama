<div align="center">

  <img src="public/summonsmitra-logo.jpg" alt="Summons Mitra Logo" width="180" style="border-radius: 28px; box-shadow: 0 8px 32px rgba(2, 132, 199, 0.35);" />

  # Summons Mitra

  ### Judicial Summon Lifecycle & Warrant Tracking System
  **Scan &bull; Understand &bull; Stay Ahead**

  [![Live Website](https://img.shields.io/badge/Live_Website-SummonMitra.world-0284c7?style=for-the-badge&logo=google-chrome&logoColor=white)](https://SummonMitra.world)
  [![GitHub Repository](https://img.shields.io/badge/GitHub-ProjectForMama-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/riteshsinghbisht0007-design/ProjectForMama)

  <p align="center">
    <img src="https://img.shields.io/badge/Node.js-18.x%20%7C%2020.x-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js" />
    <img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React" />
    <img src="https://img.shields.io/badge/Vite-6.1-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite" />
    <img src="https://img.shields.io/badge/Express-5.2-000000?style=flat-square&logo=express&logoColor=white" alt="Express" />
    <img src="https://img.shields.io/badge/MongoDB-7.6-47A248?style=flat-square&logo=mongodb&logoColor=white" alt="MongoDB" />
    <img src="https://img.shields.io/badge/Google_Gemini-3.8_Flash-4285F4?style=flat-square&logo=google&logoColor=white" alt="Google Gemini" />
    <img src="https://img.shields.io/badge/Firebase_Auth-12.18-FFCA28?style=flat-square&logo=firebase&logoColor=black" alt="Firebase Auth" />
    <img src="https://img.shields.io/badge/Capacitor-Android_8.5-119EFF?style=flat-square&logo=capacitor&logoColor=white" alt="Capacitor Android" />
    <img src="https://img.shields.io/badge/Deployment-Vercel_Serverless-000000?style=flat-square&logo=vercel&logoColor=white" alt="Vercel" />
    <img src="https://img.shields.io/badge/Tests-87%2F87%20Passing-brightgreen?style=flat-square&logo=checkmarx&logoColor=white" alt="Tests" />
  </p>

  <p align="center">
    <b>An intelligent, mobile-first judicial summon and court notice management platform designed to automate document ingestion, extract legal particulars via multimodal AI, track hearing dockets, and ensure zero missed court appearances.</b>
  </p>

  <p align="center">
    <a href="#-project-overview">Overview</a> &bull;
    <a href="#-key-features">Key Features</a> &bull;
    <a href="#-technology-stack">Tech Stack</a> &bull;
    <a href="#-system-architecture">Architecture</a> &bull;
    <a href="#-application-preview">Screenshots</a> &bull;
    <a href="#-project-structure">Structure</a> &bull;
    <a href="#-installation--local-setup">Quick Start</a> &bull;
    <a href="#-environment-variables">Configuration</a> &bull;
    <a href="#-authentication--data-persistence">Auth & Database</a> &bull;
    <a href="#-security--privacy-architecture">Security</a> &bull;
    <a href="#-deployment-guide">Deployment</a>
  </p>
</div>

---

## 📋 Table of Contents

- [Project Overview](#-project-overview)
- [Problem Statement](#-problem-statement)
- [Key Features](#-key-features)
  - [Verified Implemented Features](#verified-implemented-features)
  - [Partially Implemented & External-Dependent Features](#partially-implemented--external-dependent-features)
  - [Planned Roadmap Features](#planned-roadmap-features)
- [Technology Stack](#-technology-stack)
- [System Architecture](#-system-architecture)
- [Application Preview](#-application-preview)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Installation & Local Setup](#-installation--local-setup)
  - [1. Clone Repository](#1-clone-repository)
  - [2. Install Dependencies](#2-install-dependencies)
  - [3. Configure Environment](#3-configure-environment)
  - [4. Launch Development Server](#4-launch-development-server)
  - [5. Run Automated Verification Tests](#5-run-automated-verification-tests)
  - [6. Build Production Bundle](#6-build-production-bundle)
  - [7. Android Capacitor Workflow](#7-android-capacitor-workflow)
- [Environment Variables](#-environment-variables)
- [Authentication & Data Persistence](#-authentication--data-persistence)
  - [Firebase vs. MongoDB Division of Responsibility](#firebase-vs-mongodb-division-of-responsibility)
  - [Multi-Tenant Data Isolation](#multi-tenant-data-isolation)
- [Security & Privacy Architecture](#-security--privacy-architecture)
- [Deployment Guide](#-deployment-guide)
  - [Vercel Serverless Architecture](#vercel-serverless-architecture)
  - [Production Domain](#production-domain)
- [Troubleshooting](#-troubleshooting)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)
- [Maintainer & Project Links](#-maintainer--project-links)

---

## 🔭 Project Overview

**Summons Mitra** is a production-oriented legal operations and summons tracking application built to modernize how law enforcement personnel, process servers, court liaison officers (CLOs), and legal administrators organize, serve, and monitor judicial court notices and warrants.

Managing court summons has historically relied on physical paper dockets, hand-delivered registers, and manual diaries. This analog process frequently suffers from missed hearing dates, lost records, illegible handwriting, and lack of real-time visibility across police stations and court jurisdictions.

Summons Mitra provides a modern web and mobile platform featuring:
- **Instant Optical Character Recognition (OCR)** powered by Google Gemini multimodal models (`gemini-3.8-flash`) to parse judicial summons directly from camera photographs or PDF uploads into structured legal entities.
- **CNR & Judicial QR Code Lookup** compatible with Indian eCourts 16-character Case Number Record (CNR) formats.
- **Docket Lifecycle Management** from *Pending* and *Upcoming* to *Served* and *Completed*, with witness directories, service notes, and evidence attachment.
- **Proactive Hearing Alerts** driven by Web Push notifications (VAPID) and background hearing date calculation to prevent warrant issuance due to officer or witness non-appearance.
- **Cross-Platform Access** via installable Progressive Web App (PWA) with offline capabilities and native Android build integration powered by Capacitor.

> **Disclaimer**: *Summons Mitra is an independent open-source software project engineered for workflow optimization. It is not an official portal of the Supreme Court of India, High Courts, Ministry of Law and Justice, or State Police Departments.*

---

## ⚠️ Problem Statement

In contemporary judicial administration:

1. **Volume & Time Constraints**: A single police station or court liaison desk receives dozens of summons, warrants, and appearance notices daily across multiple courts (District Courts, Chief Metropolitan Magistrates, Sessions Courts).
2. **Analog Data Loss**: Critical particulars—such as court room numbers, compliance return dates, specific charges (u/s), and parentage details—are often buried in low-contrast carbon copies or handwritten stamps.
3. **Severe Legal Consequences of Missed Hearings**: If an investigating officer, witness, or summoned party fails to appear on the scheduled returnable date, judicial magistrates may issue bailable warrants, departmental show-cause notices, or cost penalties.
4. **Disjointed Witness Management**: Contacting sureties, complainants, and independent witnesses linked to specific FIRs requires hunting through separate station diary entries.

Summons Mitra addresses these pain points through a unified, high-reliability digital docket that digitizes paper documents in seconds and guarantees actionable reminders.

---

## ✨ Key Features

### Verified Implemented Features

| Feature Module | Technical Implementation | Status |
| :--- | :--- | :---: |
| **Multimodal Judicial OCR** | Powered by `@google/genai` (using `gemini-3.8-flash` with automatic fallback to `gemini-flash-latest` and `gemini-3.1-flash-lite`). Zero-hallucination prompt directives extract: Summon No, FIR/Case No, Accused Name, Father's Name, Court Complex, Police Station, District, Hearing Date (normalized to ISO `YYYY-MM-DD`), and Offense Sections. Includes client-side image downscaling (<1.5MB) to ensure sub-second uploads over mobile networks. | Verified ✅ |
| **Judicial QR & CNR Parser** | Client-side QR barcode scanning using `jsqr` alongside an automated regex engine capable of decomposing raw 16-character eCourts CNR codes (e.g. `DLWT010012342024`) and URL-encoded query parameters. | Verified ✅ |
| **Comprehensive Summons Lifecycle** | Full CRUD capabilities backed by MongoDB. Supports state transitions (`Pending` &rarr; `Upcoming` &rarr; `Served` &rarr; `Completed`), urgency tagging (`Standard`, `High`, `Urgent`), custom date filters, and multi-field keyword search across FIRs, subjects, and courts. | Verified ✅ |
| **Interactive Hearing Calendar** | Monthly grid visualization highlighting active court dates, categorized hearing loads per day, color-coded urgency indicators, and direct docket drawer access. | Verified ✅ |
| **Witness & Accused Directory** | Relational document linkage associating witnesses, sureties, respondents, and complainants directly to specific summon records, complete with contact numbers and addresses. | Verified ✅ |
| **Automated Hearing Alerts & Web Push** | Server-side scheduled routine checking hearing dates every 2 minutes. Automated delivery of `HEARING_TODAY`, `HEARING_TOMORROW`, and `HEARING_OVERDUE` alerts via Web Push (RFC 8292 VAPID) and Firebase Cloud Messaging (FCM). | Verified ✅ |
| **Hybrid Authentication & Strict Isolation** | Dual authentication paths: One-tap Google Sign-In (Firebase Auth with client-side token exchange verified via `firebase-admin`) alongside native username/email credentials (passwords hashed using `bcryptjs` with salt rounds = 12, signed with JWT). Enforces user-level tenant isolation across all endpoints. | Verified ✅ |
| **Officer Command Dashboard** | Real-time metric cards computing total cases, pending services, upcoming appearances, closed summons, and active station telemetry with an interactive audit activity log. | Verified ✅ |
| **PWA & Native Android Container** | Fully compliant Progressive Web App with `manifest.json`, custom icons (`192x192`, `512x512`, maskable), dedicated background worker (`firebase-messaging-sw.js`), and pre-configured Capacitor 8 Android project wrapper (`com.summonsmitra.app`). | Verified ✅ |
| **Document Export & Evidence Capture** | Integrated camera scanner with interactive crop tool (`react-image-crop`), local image optimization, and one-click judicial docket summary export using `jspdf`. | Verified ✅ |

### Partially Implemented & External-Dependent Features

- **Live eCourts Portal Scraper**: The repository includes route definitions and payload structures in `server/services/eCourtsProvider.ts` for automated case status synchronization. Because the official government portal enforces dynamic CAPTCHAs, automated fetching functions as a simulated fallback provider unless connected to an authorized judicial API gateway.

### Planned Roadmap Features

- **Geo-Stamped Service Delivery Verification**: Capturing GPS coordinates and digital recipient signatures upon physical delivery of summons.
- **Multi-Officer Station Hierarchy**: Departmental role-based access control (Head Constable &rarr; Sub-Inspector &rarr; Station House Officer) with delegation workflows.
- **Bulk Batch Scanning**: Uploading multiple PDF warrants concurrently for queued background OCR processing.

---

## 🛠 Technology Stack

| Layer | Technology | Version | Purpose in Summons Mitra | Official Documentation |
| :--- | :--- | :---: | :--- | :--- |
| **Frontend Framework** | **React** | `18.3.1` | Component-driven UI architecture, custom hooks, and reactive state management | [react.dev](https://react.dev) |
| **Build & Tooling** | **Vite** | `6.1.0` | Ultra-fast HMR development server and optimized rollup production bundler | [vite.dev](https://vite.dev) |
| **Programming Language**| **TypeScript** | `5.7.3` | End-to-end static typing across UI components, backend routes, and database schemas | [typescriptlang.org](https://www.typescriptlang.org) |
| **Styling & Theme** | **Tailwind CSS** | `4.0.6` | Utility-first CSS engine powering the high-contrast tactical dark theme | [tailwindcss.com](https://tailwindcss.com) |
| **Icons & Animation** | **Lucide React** & **Motion** | `0.475.0` / `13.4.0` | Law-enforcement iconography and smooth modal/drawer animation choreography | [lucide.dev](https://lucide.dev) |
| **Server Engine** | **Express.js** | `5.2.1` | REST API layer handling authentication, summons CRUD, OCR proxy, and push alerts | [expressjs.com](https://expressjs.com) |
| **Serverless Pipeline** | **esbuild** | `0.28.2` | Compiles TypeScript backend files into standalone bundles (`dist/server.cjs` and `api/index.js`) | [esbuild.github.io](https://esbuild.github.io) |
| **Database** | **MongoDB Driver** | `7.6.0` | Native MongoDB client managing collections (`summons`, `users`, `witnesses`, `notifications`, `fcm_tokens`) | [mongodb.com](https://www.mongodb.com/docs/drivers/node/current/) |
| **Document AI / OCR** | **Google Gen AI SDK** | `^2.21.0` | Calls Gemini 3.8 Flash for forensic text extraction from mobile camera captures | [ai.google.dev](https://ai.google.dev/docs) |
| **Identity & Access** | **Firebase Auth & Admin** | `12.18.0` / `13.10.0` | Client-side OAuth Google sign-in and server-side cryptographic ID token verification | [firebase.google.com](https://firebase.google.com/docs/auth) |
| **Local Auth & Crypto** | **bcryptjs & jsonwebtoken**| `3.0.3` / `9.0.3` | Password hashing (cost 12) and stateless JWT cookie authentication (`auth_token`) | [npmjs.com/package/jsonwebtoken](https://www.npmjs.com/package/jsonwebtoken) |
| **Push Notifications** | **web-push** | `3.6.7` | Delivers RFC 8292 Web Push notifications directly to service workers using VAPID keys | [npmjs.com/package/web-push](https://www.npmjs.com/package/web-push) |
| **Mobile Runtime** | **Capacitor** | `8.5.2` | Bridges web assets into native Android APKs with camera and network access | [capacitorjs.com](https://capacitorjs.com) |
| **Deployment Target** | **Vercel Serverless** | `v2` | Hosts static assets on Edge CDN and runs Express via `api/index.js` serverless function | [vercel.com](https://vercel.com) |

---

## 🏛 System Architecture

The following diagram illustrates the verified end-to-end data flow and service communication:

```mermaid
flowchart TD
    subgraph Client_Platform ["Client Platform (User Interface)"]
        Browser["Modern Web Browser (PWA)"]
        AndroidApp["Android Native App (Capacitor 8)"]
        SW["Service Worker (firebase-messaging-sw.js)"]
    end

    subgraph Edge_Gateway ["Vercel Edge & Serverless Gateway"]
        CDN["Vercel Static Edge CDN (dist/)"]
        ServerlessFn["Serverless Entrypoint (api/index.js)"]
        ExpressApp["Express 5.2 Server Application"]
    end

    subgraph Authentication_Layer ["Authentication & Verification"]
        FirebaseAuth["Firebase Client Auth (Google Sign-In)"]
        AdminSDK["Firebase Admin SDK (Token Verification)"]
        BcryptJWT["Native Auth (bcryptjs 12 + JWT Cookies)"]
    end

    subgraph AI_Processing ["AI & Document Intelligence"]
        GeminiFlash["Google Gemini 3.8 Flash (Multimodal OCR)"]
        QRParser["jsQR + Regex Judicial Parser"]
    end

    subgraph Persistence_Layer ["Cloud Database & Messaging"]
        MongoCluster[("MongoDB Atlas Database")]
        WebPushService["Web Push Service (RFC 8292 VAPID)"]
        FCM["Firebase Cloud Messaging"]
    end

    %% Client Interactions
    Browser -->|Serves Static Assets| CDN
    AndroidApp -->|Loads Local WebDir| CDN
    Browser -->|API Requests & Auth Cookies| ServerlessFn
    AndroidApp -->|REST Calls with Bearer Token| ServerlessFn
    ServerlessFn --> ExpressApp

    %% Auth Flows
    Browser -.->|Sign In with Google| FirebaseAuth
    FirebaseAuth -.->|ID Token| ExpressApp
    ExpressApp -->|Verify ID Token| AdminSDK
    ExpressApp -->|Local Login/Register| BcryptJWT

    %% OCR Pipeline
    ExpressApp -->|Base64 Image Payload| GeminiFlash
    Browser -->|Local Camera & Crop| QRParser

    %% Data Storage
    ExpressApp -->|CRUD Summons & Witnesses| MongoCluster
    ExpressApp -->|Store Users & Audit Logs| MongoCluster

    %% Notification Pipeline
    ExpressApp -->|Dispatch Hearing Alerts| WebPushService
    ExpressApp -->|Dispatch Mobile Push| FCM
    WebPushService -->|Receive Push Payload| SW
    FCM -->|Receive Mobile Alerts| AndroidApp
```

---

## 📱 Application Preview

The application features a responsive, dark tactical user interface designed to maximize readability in high-glare field environments and low-light squad cars.

<div align="center">
  <img src="screen.png" alt="Summons Mitra Mobile Application Interface" width="380" style="border-radius: 20px; border: 2px solid #1e293b; box-shadow: 0 10px 30px rgba(0,0,0,0.5);" />
  <p><i>Live mobile interface showing officer telemetry, urgency status filters, active summon dockets, and instant search.</i></p>
</div>

---

## 📂 Project Structure

```text
ProjectForMama/
├── .env.example                     # Environment variable template with safe placeholders
├── .gitignore                       # Git exclusion rules (node_modules, dist, .env)
├── DESIGN.md                        # UI design tokens, color palette, and typographic specifications
├── README.md                        # Repository documentation and engineering guide
├── README_DB_FIX.md                 # Historical architecture notes on MongoDB restoration
├── android/                         # Capacitor native Android application project
│   ├── app/                         # Android application module (src, res, AndroidManifest.xml)
│   ├── build.gradle                 # Android build configuration
│   └── capacitor.settings.gradle    # Capacitor plugin bindings
├── api/                             # Serverless deployment output directory
│   └── index.js                     # Bundled Vercel serverless entrypoint (generated by esbuild)
├── capacitor.config.ts              # Capacitor CLI configuration (appId: com.summonsmitra.app)
├── firebase-applet-config.json      # Client Firebase project settings (JSON)
├── firebase-blueprint.json          # Firestore schema metadata
├── firestore.rules                  # Firebase Firestore security rule specifications
├── index.html                       # HTML5 entrypoint with PWA meta tags and SEO tags
├── metadata.json                    # Workspace project descriptor and capability flags
├── mockDb.ts                        # Development test mock helpers
├── package.json                     # NPM dependency declarations, version pins, and scripts
├── public/                          # Static web assets served at root
│   ├── apple-touch-icon.png         # iOS home screen bookmark icon
│   ├── favicon.ico                  # Browser address bar icon
│   ├── firebase-messaging-sw.js     # Background Web Push service worker
│   ├── icons/                       # PWA icons (192x192, 512x512, maskable variants)
│   ├── manifest.json                # Web App Manifest specification
│   ├── summonsmitra-logo.jpg        # High-resolution raster branding badge
│   └── summonsmitra-logo.svg        # Scalable vector logo
├── screen.png                       # High-fidelity mobile app capture
├── scripts/                         # Build, utility, and verification scripts
│   ├── generate-icons.js            # Automated icon generation utility
│   └── test-production-readiness.ts # 87-test automated production readiness suite
├── server/                          # Backend source code (Express 5.2)
│   ├── app.ts                       # Express application bootstrap, routes, and error handlers
│   ├── routes/                      # Modular API route controllers
│   │   └── caseRoutes.ts            # Case lookup and CNR QR endpoints
│   ├── serverless.ts                # Vercel serverless adapter wrapping Express
│   ├── services/                    # Domain services
│   │   ├── caseLookupService.ts     # Aggregated case queries
│   │   ├── caseNormalizer.ts        # Court date and entity sanitization
│   │   ├── eCourtsProvider.ts       # eCourts communication provider
│   │   └── judicialQrParser.ts      # CNR barcode decoding logic
│   └── validators/                  # Input validation schemas
│       └── caseValidators.ts        # Case input structural checks
├── server.ts                        # Local development and standalone Node server entrypoint
├── src/                             # Frontend source code (React 18 + Vite)
│   ├── App.tsx                      # Root component: auth state machine, tabs, modal coordinator
│   ├── main.tsx                     # React DOM initialization and root mount
│   ├── index.css                    # Tailwind CSS v4 styling rules
│   ├── types.ts                     # TypeScript domain models (Summon, OfficerUser, Witness, etc.)
│   ├── vite-env.d.ts                # Vite environment typings
│   ├── components/                  # Reusable UI components
│   │   ├── AboutSummonsMitraModal.tsx # Project info, terms, and technical specifications
│   │   ├── AddSummonModal.tsx       # Manual summons entry & OCR confirmation drawer
│   │   ├── AuthScreen.tsx           # Officer sign-in, account creation, and password reset
│   │   ├── CnrDetectedModal.tsx     # CNR scan confirmation dialog
│   │   ├── DocumentCameraScanner.tsx# Real-time camera viewfinder for document capture
│   │   ├── HearingCalendarView.tsx  # Monthly court appearance calendar grid
│   │   ├── ImageCropperModal.tsx    # Interactive crop modal for warrant photos
│   │   ├── JudicialQrScannerModal.tsx # Live QR scanner for summons barcodes
│   │   ├── MetricCardsGrid.tsx      # Dashboard compliance metric widgets
│   │   ├── NotificationCenterDropdown.tsx # Header notification tray
│   │   ├── NotificationPermissionBanner.tsx # PWA push permission request banner
│   │   ├── OfficerProfileModal.tsx  # Profile management, badge number, and station details
│   │   ├── PriorityAlertsDashboardWidget.tsx # Urgent hearing reminders feed
│   │   ├── ProfileDropdownMenu.tsx  # User account switcher and logout action
│   │   ├── SummonCard.tsx           # Individual summon card with status toggles
│   │   ├── SummonDetailModal.tsx    # Full docket inspection and witness manager
│   │   ├── SummonsMitraLogo.tsx     # Dynamic vector logo renderer
│   │   ├── TopNavBar.tsx            # Header bar with live clock and search controls
│   │   └── WitnessDirectoryModal.tsx# Station witness and surety registry
│   ├── context/                     # Global state providers
│   │   ├── AuthContext.tsx          # Authentication state machine, token refresh, and retry logic
│   │   └── SummonContext.tsx        # Summons state management, caching, and optimistic updates
│   ├── services/                    # Client API communication
│   │   ├── apiClient.ts             # Authenticated fetch wrapper with 10s bounded timeout
│   │   ├── fcmService.ts            # Client-side FCM token registration
│   │   ├── firebase.ts              # Firebase client SDK initialization
│   │   ├── notificationService.ts   # Browser notification permission management
│   │   └── reviewService.ts         # User feedback submission client
│   └── utils/                       # Frontend helper utilities
│       ├── documentDownloadService.ts # Filename sanitization and asset downloads
│       ├── judicialQrClient.ts      # Client QR parsing wrapper
│       ├── ocrService.ts            # Image pre-processing, downscaling, and OCR client
│       ├── pdfService.ts            # PDF document generation via jsPDF
│       ├── qrDecoder.ts             # Image canvas QR extraction
│       └── shareService.ts          # Web Share API integration
├── tsconfig.json                    # TypeScript compiler options
├── vercel.json                      # Vercel deployment routes, headers, and function specs
└── vite.config.ts                   # Vite bundler configuration
```

---

## ⚙️ Prerequisites

Before running Summons Mitra locally, ensure your system has the following installed:

1. **Node.js**: `v18.18.0` or `v20.x` (LTS recommended). Check with `node -v`.
2. **npm**: `v9.x` or `v10.x`. Check with `npm -v`.
3. **MongoDB Database**: A running MongoDB instance (MongoDB Atlas connection URI or local `mongodb://localhost:27017`).
4. **Google Gemini API Key**: An active API key from [Google AI Studio](https://aistudio.google.com/) for document OCR.
5. **Firebase Project**: A Firebase web project with **Google Authentication** enabled.
6. *(Optional for Android)*: **Android Studio** with Android SDK platform tools (`API 34+`) to build the native APK.

---

## 🚀 Installation & Local Setup

### 1. Clone Repository

```bash
git clone https://github.com/riteshsinghbisht0007-design/ProjectForMama.git
cd ProjectForMama
```

### 2. Install Dependencies

Install all production and development dependencies declared in `package.json`:

```bash
npm install
```

### 3. Configure Environment

Copy the example environment template and configure your secrets:

```bash
cp .env.example .env
```

Open `.env` in your preferred editor and provide your MongoDB, Firebase, and Gemini credentials (see [Environment Variables](#-environment-variables)).

### 4. Launch Development Server

Start the full-stack development environment (launches Express with mounted Vite middleware on port `3000`):

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Run Automated Verification Tests

Execute the comprehensive 87-test automated verification suite covering PWA assets, Vercel routes, judicial QR decoders, date normalizers, MongoDB operations, Gemini OCR endpoints, and multi-tenant authentication isolation:

```bash
npm test
```

### 6. Build Production Bundle

To compile the optimized frontend assets and bundle the standalone server distributions:

```bash
npm run build
```

This script performs three actions:
1. `vite build`: Emits client assets into `dist/`.
2. `esbuild server/serverless.ts`: Generates the Vercel serverless function at `api/index.js`.
3. `esbuild server.ts`: Generates the standalone production Node bundle at `dist/server.cjs`.

To preview the production build locally:

```bash
npm run preview
```

### 7. Android Capacitor Workflow

To build and synchronize the native Android project:

```bash
# 1. Build the web distribution
npm run build

# 2. Sync web assets and plugins to the native Android project
npm run cap:sync

# 3. Launch Android Studio to build or run on an emulator/physical device
npm run cap:open
```

---

## 🔐 Environment Variables

The application requires both backend runtime secrets and client-side Vite configuration variables:

| Variable Name | Required By | Description | Safe Example Value |
| :--- | :---: | :--- | :--- |
| `MONGODB_URI` | Backend | Connection string to MongoDB cluster | `mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority` |
| `MONGODB_DB_NAME` | Backend | Target MongoDB database name | `summons_app` |
| `JWT_SECRET` | Backend | Cryptographic secret for signing auth session tokens | `your_high_entropy_jwt_secret_key_32_bytes_min` |
| `GEMINI_API_KEY` | Backend | Google Gemini API key for Judicial OCR | `AIzaSy...` |
| `FIREBASE_VAPID_PRIVATE_KEY` | Backend | Base64-encoded 32-byte VAPID private key for Web Push | *(Auto-generated if left blank in development)* |
| `VITE_FIREBASE_API_KEY` | Frontend | Firebase Web App API key | `AIzaSy...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Frontend | Firebase Auth domain | `your-app.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Frontend | Firebase Project ID | `your-project-id` |
| `VITE_FIREBASE_STORAGE_BUCKET`| Frontend | Firebase Storage bucket URI | `your-project-id.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID`| Frontend| Firebase Cloud Messaging sender identifier | `123456789012` |
| `VITE_FIREBASE_APP_ID` | Frontend | Firebase Web Application ID | `1:123456789012:web:abcdef` |
| `VITE_FIREBASE_VAPID_KEY` | Frontend | Public VAPID key for browser Web Push subscription | `BF...` |

> 🔒 **Security Notice**: *Never commit `.env` to version control. The `.gitignore` file is pre-configured to exclude all `.env*` files with the exception of `.env.example`.*

---

## 🗄 Authentication & Data Persistence

### Firebase vs. MongoDB Division of Responsibility

Summons Mitra uses a hybrid architecture that separates identity verification from domain data persistence:

1. **Firebase Authentication (Identity Layer)**:
   - Used strictly on the client for OAuth Google Sign-In (`signInWithPopup`).
   - The resulting Firebase ID token is transmitted to the backend via `Authorization: Bearer <idToken>` or `/api/auth/google`.
   - The backend validates the cryptographic signature using `firebase-admin`. No judicial summons or case records are stored in Firestore, eliminating cloud database sync anomalies.

2. **MongoDB (Application Data Layer)**:
   - The primary database for all operational legal data.
   - Collections:
     - `users`: Officer accounts, department ranks, badge numbers, police stations, and password hashes.
     - `summons`: Full legal summons, case numbers, accused details, court hearing dates, compliance statuses, and image paths.
     - `witnesses`: Directory of linked witnesses, sureties, and respondents.
     - `notifications`: Generated hearing alerts and dispatch notices.
     - `fcm_tokens`: Browser Web Push subscriptions and FCM registration tokens.
     - `activities`: Audit log recording officer logins, status modifications, and document creations.

### Multi-Tenant Data Isolation

To comply with data privacy standards, all database queries strictly filter by the authenticated officer's unique identifier:

```typescript
// Enforced on every database read, update, and delete
const query = { _id: new ObjectId(summonId), userId: req.user.uid };
const result = await db.collection('summons').findOne(query);
```

An officer authenticated under UID `usr_A` cannot query, view, update, or delete records belonging to UID `usr_B`. This multi-tenant boundary is validated by automated integration tests.

---

## 🛡 Security & Privacy Architecture

- **Stateless Session Tokens**: Authentication tokens are transmitted in `HttpOnly`, `SameSite=Lax`, and `Secure` (in production) cookies or Bearer headers.
- **Password Protection**: Passwords submitted via the native credential path are hashed using `bcryptjs` with 12 salt rounds before database insertion.
- **Zero-Hallucination AI Directive**: The prompt delivered to Google Gemini mandates that unreadable or omitted fields must return `null` with `0.0` confidence rather than extrapolating or guessing legal particulars.
- **Client-Side Image Optimization**: High-resolution mobile photos (10–25MB) are downsampled to a maximum dimension of 1600px and converted to compressed JPEG (`<1.5MB`) in the client's browser before upload.
- **Bounded Request Timeouts**: The client API utility (`src/services/apiClient.ts`) wraps all HTTP requests with an `AbortController` bounded to 10 seconds, preventing loading spinners from hanging if network connectivity degrades.
- **Sanitized Error Responses**: API error middleware ensures that internal stack traces and database connection credentials are never leaked in HTTP response bodies.

---

## 🌐 Deployment Guide

### Vercel Serverless Architecture

The live production application at **[SummonMitra.world](https://SummonMitra.world)** is hosted on **Vercel** utilizing a serverless architecture:

1. **Vercel Build Configuration**:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Serverless Function**: `api/index.js` (compiled from `server/serverless.ts` with 30s timeout and 1024MB RAM)
2. **Rewrites & Routing (`vercel.json`)**:
   - All `/api/*` traffic is routed to `/api/index.js`.
   - All other routes fall back to `/index.html` for client-side React routing.
   - Dedicated cache-control headers ensure `index.html` and `manifest.json` are always revalidated (`max-age=0, must-revalidate`), preventing stale service worker caches.
3. **Vercel Environment Setup**:
   - Add all variables listed in `.env.example` under **Project Settings > Environment Variables** on Vercel.

### Production Domain

- **Primary URL**: `https://SummonMitra.world`
- Ensure that `SummonMitra.world` is added to **Authorized Domains** in the Firebase Authentication console under **Authentication > Settings > Authorized domains** so Google Sign-In completes without origin errors.

---

## 🔧 Troubleshooting

| Issue / Symptom | Probable Cause | Recommended Resolution |
| :--- | :--- | :--- |
| `sh: 1: tsx: not found` | `node_modules` unpopulated or dependencies missing | Run `npm install` in the project root to install the TypeScript runtime. |
| Stuck on *"Restoring your data..."* | Firebase listener or API endpoint unresolving | The application includes a 10s fallback and explicit error state. Verify your network connection and click **Retry Connection**. |
| `MongoDB connection timeout (503)` | IP address not allowlisted on MongoDB Atlas | Log into MongoDB Atlas, navigate to **Network Access**, and add `0.0.0.0/0` (or your deployment host IP). |
| `Gemini API key not configured (503)` | `GEMINI_API_KEY` missing from `.env` or Vercel | Add `GEMINI_API_KEY` from Google AI Studio to your local `.env` or Vercel Environment Variables. |
| Firebase Google Sign-In Popup Blocked | Browser blocking popups or domain not whitelisted | Ensure popups are allowed for `SummonMitra.world` and add the domain to Firebase Console &rarr; Auth &rarr; Settings &rarr; Authorized Domains. |
| Web Push VAPID Key Error | Provided private key is not a 32-byte key | Clear `FIREBASE_VAPID_PRIVATE_KEY` to let the server generate a valid runtime pair, or generate one using `npx web-push generate-vapid-keys`. |

---

## 🗺 Roadmap

- [x] Full-stack Express + MongoDB transition with multi-tenant session isolation.
- [x] Google Gemini 3.8 Flash multimodal judicial OCR document parser.
- [x] CNR 16-character regex and eCourts QR code scanner.
- [x] Automated background hearing notification scheduler.
- [x] Dual-channel Web Push (VAPID) and FCM alert delivery.
- [x] Capacitor 8 Android configuration with camera integration.
- [ ] **Geotagged Service Tracking**: Physical summon delivery confirmation with GPS coordinates and digital signature pad.
- [ ] **Police Station Hierarchies**: Multi-tier permission levels (Constable, IO, Inspector, SHO).
- [ ] **Batch PDF Import**: Bulk warrant upload queue with parallel OCR extraction.
- [ ] **Offline IndexedDB Sync**: Full bi-directional local offline storage with automatic cloud reconciliation upon reconnection.

---

## 🤝 Contributing

Contributions to Summons Mitra are welcome! Please adhere to the following workflow:

1. **Fork the Repository**: Click "Fork" on GitHub to create your personal copy.
2. **Create a Feature Branch**:
   ```bash
   git checkout -b feature/judicial-docket-enhancement
   ```
3. **Commit Your Changes**: Follow clear, conventional commit messages:
   ```bash
   git commit -m "feat(ocr): add support for high-court notice stamps"
   ```
4. **Run Verification Tests**: Ensure all automated tests pass before opening a PR:
   ```bash
   npm test
   npm run lint
   ```
5. **Open a Pull Request**: Submit your pull request to the `main` branch with a clear description of changes and test results.

---

## 📄 License

This repository does not currently include a formal open-source license file (`LICENSE`). All rights are reserved by the repository owner by default.

If you wish to use, distribute, or adapt this software for institutional or academic purposes, please contact the maintainer or open a GitHub issue requesting licensing clarification (e.g. MIT or Apache 2.0).

---

## 👤 Maintainer & Project Links

- **Project Name**: Summons Mitra
- **Live Production Application**: [https://SummonMitra.world](https://SummonMitra.world)
- **GitHub Repository**: [https://github.com/riteshsinghbisht0007-design/ProjectForMama](https://github.com/riteshsinghbisht0007-design/ProjectForMama)
- **Repository Clone URL**: `https://github.com/riteshsinghbisht0007-design/ProjectForMama.git`
- **GitHub Owner**: [@riteshsinghbisht0007-design](https://github.com/riteshsinghbisht0007-design)
