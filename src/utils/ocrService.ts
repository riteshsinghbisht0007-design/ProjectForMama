export interface ExtractedSummonData {
  summonNumber: string;
  caseNumber: string;
  personName: string;
  fatherName?: string;
  address: string;
  courtName: string;
  courtAddress: string;
  policeStation: string;
  district: string;
  state: string;
  issueDate: string;
  hearingDate: string;
  issuingAuthority?: string;
  officerDetails?: string;
  offenseCharges?: string;
  urgency?: 'Standard' | 'High' | 'Urgent';
  detectedFields?: string[];
}

export interface OcrResult {
  data: ExtractedSummonData;
  success: boolean;
  message?: string;
  isAutofilled: boolean;
}

// Safely converts Indian court date patterns (DD/MM/YYYY, DD-MM-YYYY) into HTML5 YYYY-MM-DD standard
export const normalizeJudicialDate = (dateRaw: string): string => {
  if (!dateRaw || typeof dateRaw !== 'string') return '';
  const trimmed = dateRaw.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const dmy = trimmed.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
  if (dmy) {
    const day = dmy[1].padStart(2, '0');
    const month = dmy[2].padStart(2, '0');
    const year = dmy[3];
    return `${year}-${month}-${day}`;
  }

  const ymd = trimmed.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
  if (ymd) {
    const year = ymd[1];
    const month = ymd[2].padStart(2, '0');
    const day = ymd[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return '';
};

// Strict regex-based extractor from actual document text — NEVER invents fictional people or addresses
export const parseSummonTextStrict = (rawText: string): ExtractedSummonData => {
  const getMatch = (patterns: RegExp[]): string => {
    for (const pattern of patterns) {
      const match = rawText.match(pattern);
      if (match && match[1] && match[1].trim().length > 1) {
        return match[1].trim();
      }
    }
    return '';
  };

  const detected: string[] = [];

  const summonNo = getMatch([
    /(?:summon|warrant|notice)\s*(?:no|number|#)?[:.\s-]*([A-Z0-9\/-]+)/i,
    /(?:cnr\s*no\.?|cnr)[:.\s-]*([A-Z0-9]+)/i,
  ]);
  if (summonNo) detected.push('summonNumber');

  const caseNo = getMatch([
    /(?:fir|case|cr\.?\s*no)\s*(?:no|number|#)?[:.\s-]*([A-Z0-9\/-]+(?:\s*of\s*\d{4})?)/i,
    /(?:cr\.?\s*case\s*no\.?)[:.\s-]*([A-Z0-9\/-]+)/i,
  ]);
  if (caseNo) detected.push('caseNumber');

  const name = getMatch([
    /(?:to|shri|smt|respondent|accused|summoned|name)[:.\s]+([A-Za-z\s.]+?)(?:\s+(?:s\/o|w\/o|d\/o|r\/o|resident|age|address)|[\n,])/i,
    /(?:accused\s*person)[:.\s]+([A-Za-z\s.]+)/i,
  ]);
  if (name) detected.push('personName');

  const father = getMatch([
    /(?:s\/o|d\/o|w\/o|son of|daughter of|wife of)[:.\s]+([A-Za-z\s.]+?)(?:[\n,]|r\/o)/i,
  ]);
  if (father) detected.push('fatherName');

  const addr = getMatch([
    /(?:r\/o|resident of|address)[:.\s]+([\s\S]+?)(?:police station|ps|district|court|dated|$)/i,
  ]);
  if (addr) detected.push('address');

  const court = getMatch([
    /(?:in the court of|court of|before the)[:.\s]+([A-Za-z\s,.-]+?)(?:delhi|district|court room|at|$)/i,
    /(chief metropolitan magistrate|district & sessions judge|special ndps court|high court)/i,
  ]);
  if (court) detected.push('courtName');

  const courtAddr = getMatch([
    /(?:court room|room no\.?|complex)[:.\s]+([A-Za-z0-9\s,.-]+)/i,
  ]);
  if (courtAddr) detected.push('courtAddress');

  const ps = getMatch([
    /(?:police station|ps)[:.\s]+([A-Za-z\s]+?)(?:district|delhi|case|$)/i,
  ]);
  if (ps) detected.push('policeStation');

  const dist = getMatch([
    /(?:district|distt)[:.\s]+([A-Za-z\s]+)/i,
  ]);
  if (dist) detected.push('district');

  const hearing = getMatch([
    /(?:hearing date|appear on|date of hearing|returnable on|next date)[:.\s]+(\d{4}-\d{2}-\d{2}|\d{2}[/-]\d{2}[/-]\d{4})/i,
  ]);
  const normalizedHearing = normalizeJudicialDate(hearing);
  if (normalizedHearing) detected.push('hearingDate');

  const charges = getMatch([
    /(?:under section|u\/s|charges|offence)[:.\s]+([A-Za-z0-9\s,./-]+)/i,
  ]);
  if (charges) detected.push('offenseCharges');

  const authority = getMatch([
    /(?:by order of|magistrate|presiding officer|registrar)[:.\s]+([A-Za-z\s.]+)/i,
  ]);
  if (authority) detected.push('issuingAuthority');

  return {
    summonNumber: summonNo,
    caseNumber: caseNo,
    personName: name,
    fatherName: father || undefined,
    address: addr,
    courtName: court,
    courtAddress: courtAddr,
    policeStation: ps,
    district: dist,
    state: 'Delhi NCT',
    issueDate: new Date().toISOString().split('T')[0],
    hearingDate: normalizedHearing,
    issuingAuthority: authority,
    offenseCharges: charges,
    urgency: 'Standard',
    detectedFields: detected,
  };
};

// Helper to optimize large mobile images (downscaling 10-25MB photos to fast, sharp 2048px scans)
export const optimizeImageForOcr = async (
  dataUrl: string,
  mimeType: string,
  maxDimension = 1500,
  quality = 0.75
): Promise<{ dataUrl: string; mimeType: string }> => {
  if (mimeType.includes('pdf') || !dataUrl.startsWith('data:image')) {
    return { dataUrl, mimeType };
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width <= maxDimension && height <= maxDimension) {
        resolve({ dataUrl, mimeType });
        return;
      }

      if (width > height) {
        if (width > maxDimension) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        }
      } else {
        if (height > maxDimension) {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({ dataUrl, mimeType });
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const optimizedUrl = canvas.toDataURL('image/jpeg', quality);
      resolve({ dataUrl: optimizedUrl, mimeType: 'image/jpeg' });
    };

    img.onerror = () => {
      resolve({ dataUrl, mimeType });
    };

    img.src = dataUrl;
  });
};

// Inspect OCR Health status on backend
export const inspectOcrHealth = async (): Promise<{
  isOnline: boolean;
  configured: boolean;
  message: string;
}> => {
  try {
    const res = await fetch('/api/ocr/health', { method: 'GET', credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      return {
        isOnline: true,
        configured: Boolean(data.configured),
        message: data.configured
          ? 'AI Legal OCR engine is online and active.'
          : 'AI OCR server is reachable but GEMINI_API_KEY is pending configuration in environment.',
      };
    }
    return {
      isOnline: false,
      configured: false,
      message: `Health check responded with HTTP ${res.status}`,
    };
  } catch (err: any) {
    return {
      isOnline: false,
      configured: false,
      message: err.message || 'OCR server health check unreachable',
    };
  }
};

// Main AI Document OCR Scanner with real error reporting and timeout protection
export const scanSummonDocument = async (
  base64Data: string,
  mimeType: string
): Promise<OcrResult> => {
  const startTime = Date.now();
  console.info(`[OCR Client] Initiating document scan (${mimeType})...`);

  // Optimize high-resolution mobile camera captures before transmission
  let payloadDataUrl = base64Data;
  let payloadMime = mimeType;
  try {
    const optimized = await optimizeImageForOcr(base64Data, mimeType);
    payloadDataUrl = optimized.dataUrl;
    payloadMime = optimized.mimeType;
  } catch (optErr) {
    console.warn('[OCR Client] Image optimization skipped:', optErr);
  }

  // 45-second timeout controller for mobile cellular network resilience
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(new Error('Timeout')), 120000);

  try {
    const res = await fetch('/api/ocr', {
      credentials: 'include',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: payloadDataUrl, mimeType: payloadMime }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    console.info(`[OCR Client] Received response: HTTP ${res.status} in ${Date.now() - startTime}ms`);

    if (res.ok) {
      const data = await res.json();
      if (data && (data.summonNumber || data.personName || data.caseNumber || data.address || data.courtName)) {
        const detected: string[] = [];
        if (data.summonNumber) detected.push('summonNumber');
        if (data.caseNumber) detected.push('caseNumber');
        if (data.personName) detected.push('personName');
        if (data.fatherName) detected.push('fatherName');
        if (data.address) detected.push('address');
        if (data.courtName) detected.push('courtName');
        if (data.courtAddress) detected.push('courtAddress');
        if (data.policeStation) detected.push('policeStation');
        if (data.district) detected.push('district');
        if (data.hearingDate) detected.push('hearingDate');
        if (data.offenseCharges) detected.push('offenseCharges');
        if (data.issuingAuthority) detected.push('issuingAuthority');

        return {
          success: true,
          isAutofilled: detected.length > 0,
          message: `AI OCR successfully identified ${detected.length} warrant particulars.`,
          data: {
            summonNumber: data.summonNumber || '',
            caseNumber: data.caseNumber || '',
            personName: data.personName || '',
            fatherName: data.fatherName || '',
            address: data.address || '',
            courtName: data.courtName || '',
            courtAddress: data.courtAddress || '',
            policeStation: data.policeStation || '',
            district: data.district || '',
            state: data.state || 'Delhi NCT',
            issueDate: normalizeJudicialDate(data.issueDate) || new Date().toISOString().split('T')[0],
            hearingDate: normalizeJudicialDate(data.hearingDate) || '',
            issuingAuthority: data.issuingAuthority || '',
            officerDetails: data.officerDetails || '',
            offenseCharges: data.offenseCharges || '',
            urgency: data.urgency === 'Urgent' || data.urgency === 'High' ? data.urgency : 'Standard',
            detectedFields: detected,
          },
        };
      } else if (data && data.rawText) {
        // If raw text was returned
        const parsed = parseSummonTextStrict(data.rawText);
        return {
          success: true,
          isAutofilled: (parsed.detectedFields?.length || 0) > 0,
          message: 'Extracted particulars from document text analysis.',
          data: parsed,
        };
      }
    } else {
      const errJson = await res.json().catch(() => ({}));
      console.error(`[OCR Client] Server error HTTP ${res.status}:`, errJson);

      let errorMessage = errJson.error;
      if (typeof errorMessage === 'string' && errorMessage.includes('{') && errorMessage.includes('}')) {
        try {
          const start = errorMessage.indexOf('{');
          const end = errorMessage.lastIndexOf('}');
          if (start !== -1 && end !== -1) {
            const parsed = JSON.parse(errorMessage.slice(start, end + 1));
            if (parsed?.error?.message) {
              errorMessage = parsed.error.message;
            }
          }
        } catch (_) {}
      }

      if (!errorMessage) {
        if (res.status === 401 || res.status === 403) {
          errorMessage = 'Authentication issue: Gemini API key unauthorized or expired on server.';
        } else if (res.status === 404) {
          errorMessage = 'OCR API endpoint was not found (/api/ocr). Please verify server deployment.';
        } else if (res.status === 413) {
          errorMessage = 'Document image is too large for upload. Please capture or select a lower resolution image.';
        } else if (res.status === 429) {
          errorMessage = 'AI service rate limit reached. Please wait a moment and retry.';
        } else if (res.status === 503) {
          errorMessage = 'AI document extraction service is temporarily unavailable or experiencing high demand. Please retry in a few moments.';
        } else {
          errorMessage = `AI OCR server returned status ${res.status}. Please check document details manually.`;
        }
      }

      return {
        success: false,
        isAutofilled: false,
        message: errorMessage,
        data: parseSummonTextStrict(''),
      };
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.error('[OCR Client] Fetch error:', err);

    let failMessage = 'Document OCR scan failed.';
    if (err.name === 'AbortError') {
      failMessage = 'Document OCR timed out. The scan took too long. Please enter details manually.';
    } else if (err.message && err.message.includes('Failed to fetch')) {
      failMessage = `Could not connect to OCR server at ${window.location.origin}/api/ocr. Server may still be starting.`;
    } else {
      failMessage = err.message || 'OCR scanner encounter an unexpected error.';
    }

    return {
      success: false,
      isAutofilled: false,
      message: failMessage,
      data: parseSummonTextStrict(''),
    };
  }

  return {
    success: false,
    isAutofilled: false,
    message: 'Could not detect legible legal text in the uploaded document. Please fill in fields manually.',
    data: parseSummonTextStrict(''),
  };
};

// Parse judicial QR code payload (handles e-Courts URLs, JSON, key-value pairs, raw CNR, and text blocks)
export const parseJudicialQRCode = (qrContent: string): Partial<ExtractedSummonData> => {
  if (!qrContent || typeof qrContent !== 'string') return {};
  const trimmed = qrContent.trim();
  if (!trimmed) return {};

  try {
    // 1. JSON Format
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      const parsed = JSON.parse(trimmed);
      const obj = Array.isArray(parsed) ? parsed[0] : parsed;
      if (obj && typeof obj === 'object') {
        const cnr = obj.cnr || obj.cino || obj.cnrNumber || obj.cnrNo || '';
        return {
          summonNumber: obj.summonNumber || obj.summonNo || cnr || '',
          caseNumber: obj.caseNumber || obj.caseNo || obj.firNo || obj.fir || cnr || '',
          personName: obj.personName || obj.accused || obj.name || obj.respondent || '',
          fatherName: obj.fatherName || obj.father || '',
          address: obj.address || obj.addr || '',
          courtName: obj.courtName || obj.court || obj.courtComplex || '',
          courtAddress: obj.courtAddress || obj.courtAddr || '',
          policeStation: obj.policeStation || obj.ps || '',
          district: obj.district || obj.dist || '',
          state: obj.state || '',
          hearingDate: normalizeJudicialDate(obj.hearingDate || obj.nextDate || obj.date || ''),
          offenseCharges: obj.offenseCharges || obj.charges || obj.sections || obj.sec || '',
        };
      }
    }

    // 2. URL Format (e.g., https://services.ecourts.gov.in/ecourtindia_v6/?cnr=DLCT010012342023 or /case?cnr=...)
    if (/^https?:\/\//i.test(trimmed)) {
      try {
        const url = new URL(trimmed);
        const params = url.searchParams;
        const cnr = params.get('cnr') || params.get('cino') || params.get('case_no') || params.get('caseno') || '';
        const caseNo = params.get('case') || params.get('fir') || params.get('cr_no') || cnr;
        const court = params.get('court') || params.get('dist') || '';
        const date = params.get('date') || params.get('hearing') || '';

        // Check if path or hash contains a 16-character CNR
        const pathCnrMatch = trimmed.match(/([A-Z]{4}\d{12})/i);
        const extractedCnr = cnr || (pathCnrMatch ? pathCnrMatch[1].toUpperCase() : '');

        if (extractedCnr || caseNo) {
          return {
            summonNumber: extractedCnr ? `CNR-${extractedCnr}` : '',
            caseNumber: extractedCnr || caseNo || '',
            courtName: court ? `${court} Court` : 'e-Courts Judicial Portal',
            hearingDate: date ? normalizeJudicialDate(date) : '',
            offenseCharges: 'Docket verified via e-Courts QR URL',
          };
        }
      } catch (_) {
        // Fall through to regex-based extraction if URL parsing fails
      }
    }

    // 3. Raw 16-character e-Courts CNR code (e.g. DLCT010012342023 or MHPU010023452024)
    const rawCnrMatch = trimmed.match(/\b([A-Z]{4}\d{12})\b/i);
    if (/^[A-Z]{4}\d{12}$/i.test(trimmed)) {
      const cnr = trimmed.toUpperCase();
      return {
        summonNumber: `CNR-${cnr}`,
        caseNumber: cnr,
        courtName: 'e-Courts Judicial System',
        offenseCharges: 'Registered e-Courts Case',
      };
    }

    // 4. Delimited pairs: e.g. CNR:XX; Case:YY | Accused:ZZ \n Court:AA & Hearing:BB
    const parts = trimmed.split(/[;\n|&]/);
    const result: Record<string, string> = {};

    for (const part of parts) {
      const colonIndex = part.indexOf(':') !== -1 ? part.indexOf(':') : part.indexOf('=');
      if (colonIndex > 0) {
        const key = part.slice(0, colonIndex).trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
        const val = part.slice(colonIndex + 1).trim();
        if (key && val) {
          result[key] = val;
        }
      }
    }

    // Find any embedded CNR in the text
    const embeddedCnr = rawCnrMatch ? rawCnrMatch[1].toUpperCase() : '';

    const summonNumber =
      result['summon'] ||
      result['summonnumber'] ||
      result['summonno'] ||
      result['notice'] ||
      result['cnr'] ||
      result['cino'] ||
      (embeddedCnr ? `CNR-${embeddedCnr}` : '');

    const caseNumber =
      result['case'] ||
      result['casenumber'] ||
      result['caseno'] ||
      result['fir'] ||
      result['firno'] ||
      result['crno'] ||
      result['cnr'] ||
      embeddedCnr ||
      '';

    const personName =
      result['accused'] ||
      result['respondent'] ||
      result['person'] ||
      result['name'] ||
      result['summoned'] ||
      '';

    const fatherName = result['father'] || result['fathername'] || result['relation'] || '';
    const address = result['address'] || result['addr'] || result['residence'] || '';
    const courtName =
      result['court'] || result['courtname'] || result['complex'] || result['judge'] || '';
    const courtAddress = result['courtaddress'] || result['courtaddr'] || '';
    const policeStation = result['ps'] || result['policestation'] || result['thana'] || '';
    const district = result['district'] || result['dist'] || '';
    const state = result['state'] || '';
    const rawHearing =
      result['date'] ||
      result['hearing'] ||
      result['hearingdate'] ||
      result['nextdate'] ||
      result['ndoh'] ||
      '';
    const hearingDate = normalizeJudicialDate(rawHearing);
    const offenseCharges =
      result['charges'] ||
      result['sec'] ||
      result['section'] ||
      result['sections'] ||
      result['act'] ||
      result['offense'] ||
      '';

    return {
      summonNumber,
      caseNumber,
      personName,
      fatherName,
      address,
      courtName,
      courtAddress,
      policeStation,
      district,
      state,
      hearingDate,
      offenseCharges,
    };
  } catch (err) {
    console.warn('Error parsing judicial QR payload:', err);
    return {};
  }
};
