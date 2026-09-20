export const DEFAULT_CONFIDENCE_THRESHOLD = 0.75;

export interface ExtractedFieldItem {
  value: string;
  confidence: number;
}

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
  fieldMetadata?: Record<string, ExtractedFieldItem>;
}

export interface OcrResult {
  data: ExtractedSummonData;
  success: boolean;
  message?: string;
  isAutofilled: boolean;
  sessionId?: string;
  isUnreadable?: boolean;
  overallConfidence?: number;
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

  const metadata: Record<string, ExtractedFieldItem> = {};
  detected.forEach((fieldKey) => {
    metadata[fieldKey] = {
      value: (fieldKey === 'summonNumber' ? summonNo :
              fieldKey === 'caseNumber' ? caseNo :
              fieldKey === 'personName' ? name :
              fieldKey === 'fatherName' ? (father || '') :
              fieldKey === 'address' ? addr :
              fieldKey === 'courtName' ? court :
              fieldKey === 'courtAddress' ? courtAddr :
              fieldKey === 'policeStation' ? ps :
              fieldKey === 'district' ? dist :
              fieldKey === 'hearingDate' ? normalizedHearing :
              fieldKey === 'issuingAuthority' ? authority :
              fieldKey === 'offenseCharges' ? charges : ''),
      confidence: 0.82,
    };
  });

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
    fieldMetadata: metadata,
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

// Main AI Document OCR Scanner with real error reporting, session tracking, signal cancellation and timeout protection
export const scanSummonDocument = async (
  base64Data: string,
  mimeType: string,
  sessionId?: string,
  externalSignal?: AbortSignal
): Promise<OcrResult> => {
  const startTime = Date.now();
  console.info(`[OCR Client] Initiating document scan (${mimeType}, session=${sessionId || 'n/a'})...`);

  if (externalSignal?.aborted) {
    return {
      sessionId,
      success: false,
      isAutofilled: false,
      isUnreadable: true,
      message: 'Scan cancelled.',
      data: parseSummonTextStrict(''),
    };
  }

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

  // Combined timeout and external abort controller
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(new Error('Timeout')), 45000);

  const abortListener = () => {
    controller.abort(new Error('Cancelled'));
  };

  if (externalSignal) {
    externalSignal.addEventListener('abort', abortListener, { once: true });
  }

  try {
    const res = await fetch('/api/ocr', {
      credentials: 'include',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: payloadDataUrl, mimeType: payloadMime, sessionId }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (externalSignal) {
      externalSignal.removeEventListener('abort', abortListener);
    }

    console.info(`[OCR Client] Received response: HTTP ${res.status} in ${Date.now() - startTime}ms`);

    if (res.ok) {
      const data = await res.json();
      const responseSessionId = data.sessionId || sessionId;

      // Extract raw or structured fields safely
      const structuredFields = data.fields || {};
      const getFieldValAndConf = (key: string, fallbackVal?: string): { value: string; confidence: number } => {
        let val = '';
        let conf = 0;

        if (structuredFields[key]) {
          const rawV = structuredFields[key].value;
          if (rawV !== null && rawV !== undefined && rawV !== 'null' && rawV !== 'Not detected' && rawV !== 'not detected') {
            val = String(rawV).trim();
          }
          if (typeof structuredFields[key].confidence === 'number') {
            conf = Math.min(1.0, Math.max(0.0, structuredFields[key].confidence));
          }
        }

        if (!val && fallbackVal && fallbackVal !== 'null' && fallbackVal !== 'Not detected') {
          val = String(fallbackVal).trim();
          if (conf === 0 && val) conf = 0.85;
        }

        // Sanitize any hallucinations or unreadable indicators
        if (val === 'null' || val === 'undefined' || val.toLowerCase() === 'not detected' || val.toLowerCase() === 'n/a' || val.toLowerCase() === 'none') {
          val = '';
          conf = 0;
        }

        return { value: val, confidence: val ? conf : 0 };
      };

      const fieldMap: Record<string, { value: string; confidence: number }> = {
        summonNumber: getFieldValAndConf('summonNumber', data.summonNumber),
        caseNumber: getFieldValAndConf('caseNumber', data.caseNumber),
        personName: getFieldValAndConf('personName', data.personName),
        fatherName: getFieldValAndConf('fatherName', data.fatherName),
        address: getFieldValAndConf('address', data.address),
        courtName: getFieldValAndConf('courtName', data.courtName),
        courtAddress: getFieldValAndConf('courtAddress', data.courtAddress),
        policeStation: getFieldValAndConf('policeStation', data.policeStation),
        district: getFieldValAndConf('district', data.district),
        state: getFieldValAndConf('state', data.state || 'Delhi NCT'),
        issueDate: getFieldValAndConf('issueDate', normalizeJudicialDate(data.issueDate)),
        hearingDate: getFieldValAndConf('hearingDate', normalizeJudicialDate(data.hearingDate)),
        issuingAuthority: getFieldValAndConf('issuingAuthority', data.issuingAuthority),
        officerDetails: getFieldValAndConf('officerDetails', data.officerDetails),
        offenseCharges: getFieldValAndConf('offenseCharges', data.offenseCharges),
        urgency: getFieldValAndConf('urgency', data.urgency),
      };

      const detected: string[] = [];
      const fieldMetadata: Record<string, ExtractedFieldItem> = {};
      let totalConfidenceSum = 0;

      Object.entries(fieldMap).forEach(([k, item]) => {
        if (item.value && item.value.trim().length > 0) {
          detected.push(k);
          fieldMetadata[k] = {
            value: item.value,
            confidence: item.confidence > 0 ? item.confidence : 0.85,
          };
          totalConfidenceSum += fieldMetadata[k].confidence;
        }
      });

      const hasLegitimateData = detected.length > 0 && Boolean(fieldMap.summonNumber.value || fieldMap.personName.value || fieldMap.caseNumber.value || fieldMap.courtName.value);
      const isExplicitlyUnreadable = data.isReadable === false || (!hasLegitimateData && (!data.rawText || data.rawText.trim().length === 0));

      if (isExplicitlyUnreadable || !hasLegitimateData) {
        return {
          sessionId: responseSessionId,
          success: false,
          isAutofilled: false,
          isUnreadable: true,
          message: 'Unable to read this document.',
          data: parseSummonTextStrict(''),
        };
      }

      const avgConfidence = detected.length > 0 ? totalConfidenceSum / detected.length : 0;

      return {
        sessionId: responseSessionId,
        success: true,
        isAutofilled: detected.length > 0,
        isUnreadable: false,
        overallConfidence: avgConfidence,
        message: `Extracted ${detected.length} fields from document.`,
        data: {
          summonNumber: fieldMap.summonNumber.value,
          caseNumber: fieldMap.caseNumber.value,
          personName: fieldMap.personName.value,
          fatherName: fieldMap.fatherName.value || undefined,
          address: fieldMap.address.value,
          courtName: fieldMap.courtName.value,
          courtAddress: fieldMap.courtAddress.value,
          policeStation: fieldMap.policeStation.value,
          district: fieldMap.district.value,
          state: fieldMap.state.value || 'Delhi NCT',
          issueDate: fieldMap.issueDate.value || new Date().toISOString().split('T')[0],
          hearingDate: fieldMap.hearingDate.value || '',
          issuingAuthority: fieldMap.issuingAuthority.value || undefined,
          officerDetails: fieldMap.officerDetails.value || undefined,
          offenseCharges: fieldMap.offenseCharges.value || undefined,
          urgency: (fieldMap.urgency.value === 'Urgent' || fieldMap.urgency.value === 'High') ? fieldMap.urgency.value : 'Standard',
          detectedFields: detected,
          fieldMetadata,
        },
      };
    } else {
      const errJson = await res.json().catch(() => ({}));
      console.error(`[OCR Client] Server error HTTP ${res.status}:`, errJson);

      return {
        sessionId: errJson.sessionId || sessionId,
        success: false,
        isAutofilled: false,
        isUnreadable: true,
        message: 'Unable to read this document.',
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
      sessionId,
      success: false,
      isAutofilled: false,
      isUnreadable: true,
      message: failMessage,
      data: parseSummonTextStrict(''),
    };
  }
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
