/**
 * Judicial QR Code Parser
 * Safely categorizes and parses e-Courts QR payloads.
 * Never invents or modifies the identifier.
 */

export type JudicialQrType = 'CNR' | 'URL' | 'STRUCTURED' | 'CASE_IDENTIFIER' | 'UNKNOWN';

export interface ParsedJudicialQr {
  type: JudicialQrType;
  value?: string;
  rawValue: string;
  cnrNumber?: string;
  caseNumber?: string;
  courtName?: string;
  metadata?: Record<string, string>;
}

// 16-character alphanumeric Indian National Case Record (CNR) code
// e.g., DLCT010044022026 (State: DL, Court: CT, Establishment: 01, Case: 004402, Year: 2026)
const CNR_REGEX = /\b([A-Za-z]{2}[A-Za-z0-9]{2}\d{12})\b/;
const STRICT_CNR_EXACT = /^[A-Za-z]{2}[A-Za-z0-9]{2}\d{12}$/;

// Standard case numbers: e.g. "FIR 142/2025", "CC 892/2024", "CR/142/2025", "W.P.(C) 112/2026"
const CASE_NUMBER_REGEX = /(?:FIR|CASE|CR|CC|SC|CS|WP|MA|BAIL|W\.P\.)\s*(?:NO\.?|NUMBER)?\s*[:.\s-]*([A-Za-z0-9\/-]+(?:\s*(?:OF|\/)\s*\d{4})?)/i;

/**
 * Parses judicial QR payload according to official e-Courts standards
 */
export function parseJudicialQR(payload: string): ParsedJudicialQr {
  const rawValue = (payload || '').trim();

  if (!rawValue) {
    return {
      type: 'UNKNOWN',
      rawValue,
    };
  }

  // 1. Direct 16-character CNR identifier
  if (STRICT_CNR_EXACT.test(rawValue)) {
    const cnrUpper = rawValue.toUpperCase();
    return {
      type: 'CNR',
      value: cnrUpper,
      cnrNumber: cnrUpper,
      rawValue,
    };
  }

  // 1b. Prefixed CNR identifier (e.g. "CNR: DLCT010044022026", "CNR NO: DLCT010044022026")
  const prefixedCnrMatch = rawValue.match(/^CNR(?:\s*NO\.?|\s*NUMBER)?\s*[:=-]\s*([A-Za-z]{2}[A-Za-z0-9]{2}\d{12})$/i);
  if (prefixedCnrMatch) {
    const cnrUpper = prefixedCnrMatch[1].toUpperCase();
    return {
      type: 'CNR',
      value: cnrUpper,
      cnrNumber: cnrUpper,
      rawValue,
    };
  }

  // 2. URL Payload (e.g. https://services.ecourts.gov.in/ecourtindia_v6/...)
  if (/^https?:\/\//i.test(rawValue)) {
    let extractedCnr: string | undefined;
    let extractedCase: string | undefined;

    try {
      const parsedUrl = new URL(rawValue);
      // Check query parameters for CNR
      const cnrParam =
        parsedUrl.searchParams.get('cnr') ||
        parsedUrl.searchParams.get('cnr_no') ||
        parsedUrl.searchParams.get('cnrNumber') ||
        parsedUrl.searchParams.get('c_no');

      if (cnrParam && STRICT_CNR_EXACT.test(cnrParam.trim())) {
        extractedCnr = cnrParam.trim().toUpperCase();
      } else {
        // Search full URL string for CNR pattern
        const match = rawValue.match(CNR_REGEX);
        if (match) {
          extractedCnr = match[1].toUpperCase();
        }
      }

      // Check for case number in query params
      const caseParam = parsedUrl.searchParams.get('case_no') || parsedUrl.searchParams.get('caseno');
      if (caseParam) {
        extractedCase = caseParam.trim();
      }
    } catch (_) {
      // If URL parsing fails, extract via regex
      const match = rawValue.match(CNR_REGEX);
      if (match) {
        extractedCnr = match[1].toUpperCase();
      }
    }

    return {
      type: 'URL',
      value: rawValue,
      rawValue,
      cnrNumber: extractedCnr,
      caseNumber: extractedCase,
    };
  }

  // 3. Structured JSON payload
  if ((rawValue.startsWith('{') && rawValue.endsWith('}')) || (rawValue.startsWith('[') && rawValue.endsWith(']'))) {
    try {
      const parsedJson = JSON.parse(rawValue);
      const data = Array.isArray(parsedJson) ? parsedJson[0] : parsedJson;

      if (data && typeof data === 'object') {
        const metadata: Record<string, string> = {};
        for (const [k, v] of Object.entries(data)) {
          if (typeof v === 'string' || typeof v === 'number') {
            metadata[k] = String(v);
          }
        }

        const rawCnr = data.cnr || data.cnrNumber || data.cnr_no || data.CNR;
        const cnr = typeof rawCnr === 'string' && STRICT_CNR_EXACT.test(rawCnr.trim()) ? rawCnr.trim().toUpperCase() : undefined;
        const caseNumber = data.caseNumber || data.case_no || data.firNumber;
        const courtName = data.courtName || data.court;

        return {
          type: 'STRUCTURED',
          value: cnr || rawValue,
          rawValue,
          cnrNumber: cnr,
          caseNumber: typeof caseNumber === 'string' ? caseNumber.trim() : undefined,
          courtName: typeof courtName === 'string' ? courtName.trim() : undefined,
          metadata,
        };
      }
    } catch (_) {
      // Fall through
    }
  }

  // 4. Key-Value Structured (e.g. "CNR: DLCT010044022026 | CASE: 142/2025 | COURT: Tis Hazari")
  if (rawValue.includes('|') || rawValue.includes(';') || rawValue.includes('\n')) {
    const lines = rawValue.split(/[|;\n]+/);
    const metadata: Record<string, string> = {};
    let foundCnr: string | undefined;
    let foundCase: string | undefined;
    let foundCourt: string | undefined;

    for (const line of lines) {
      const parts = line.split(/[:=]/);
      if (parts.length >= 2) {
        const key = parts[0].trim().toLowerCase();
        const val = parts.slice(1).join(':').trim();
        metadata[key] = val;

        if ((key === 'cnr' || key === 'cnr no' || key === 'cnr_no') && STRICT_CNR_EXACT.test(val)) {
          foundCnr = val.toUpperCase();
        } else if (key === 'case' || key === 'case no' || key === 'fir') {
          foundCase = val;
        } else if (key === 'court' || key === 'bench') {
          foundCourt = val;
        }
      }
    }

    if (foundCnr || foundCase || Object.keys(metadata).length >= 2) {
      return {
        type: 'STRUCTURED',
        value: foundCnr || rawValue,
        rawValue,
        cnrNumber: foundCnr,
        caseNumber: foundCase,
        courtName: foundCourt,
        metadata,
      };
    }
  }

  // 5. Embedded CNR anywhere in text payload
  const cnrInTextMatch = rawValue.match(CNR_REGEX);
  if (cnrInTextMatch) {
    const cnr = cnrInTextMatch[1].toUpperCase();
    return {
      type: 'CNR',
      value: cnr,
      cnrNumber: cnr,
      rawValue,
    };
  }

  // 6. Case Identifier (e.g. "FIR 142/2025 PS Connaught Place")
  const caseMatch = rawValue.match(CASE_NUMBER_REGEX);
  if (caseMatch) {
    return {
      type: 'CASE_IDENTIFIER',
      value: caseMatch[0].trim(),
      caseNumber: caseMatch[0].trim(),
      rawValue,
    };
  }

  // 7. Unknown Format
  return {
    type: 'UNKNOWN',
    rawValue,
  };
}
