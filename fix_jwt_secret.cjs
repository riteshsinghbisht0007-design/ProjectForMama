const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

// Replace any existing hardcoded missing JWT_SECRET errors with a fallback assignment
code = code.replace(
  "// Helper to retrieve Gemini API key across environment variables",
  "// Fallback for development environments if JWT_SECRET is not set\nif (!process.env.JWT_SECRET) {\n  process.env.JWT_SECRET = 'dev_fallback_secret_for_summon_mitra_2026';\n  console.warn('[Auth] Warning: Using fallback JWT_SECRET. Please set JWT_SECRET in production.');\n}\n\n// Helper to retrieve Gemini API key across environment variables"
);

fs.writeFileSync('server.ts', code);
