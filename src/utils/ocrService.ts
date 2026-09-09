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

// Main AI Document OCR Scanner
export const scanSummonDocument = async (
  base64Data: string,
  mimeType: string
): Promise<OcrResult> => {
  try {
    const res = await fetch('/api/ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64Data, mimeType }),
    });

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
        // If raw OCR text was returned without JSON formatting
        const parsed = parseSummonTextStrict(data.rawText);
        return {
          success: true,
          isAutofilled: (parsed.detectedFields?.length || 0) > 0,
          message: 'Extracted particulars from raw OCR document text.',
          data: parsed,
        };
      }
    } else {
      const errJson = await res.json().catch(() => ({}));
      return {
        success: false,
        isAutofilled: false,
        message: errJson.error || 'AI OCR service response was not valid. Please review document details manually.',
        data: parseSummonTextStrict(''),
      };
    }
  } catch (err: any) {
    console.warn('Backend OCR call failed:', err);
    return {
      success: false,
      isAutofilled: false,
      message: 'Document OCR scanner is unreachable or offline. Please enter summon details manually.',
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

// Parse judicial QR code payload
export const parseJudicialQRCode = (qrContent: string): Partial<ExtractedSummonData> => {
  try {
    if (qrContent.startsWith('{') && qrContent.endsWith('}')) {
      const parsed = JSON.parse(qrContent);
      return {
        summonNumber: parsed.summonNumber || parsed.summonNo || '',
        caseNumber: parsed.caseNumber || parsed.firNo || parsed.fir || '',
        personName: parsed.personName || parsed.accused || parsed.name || '',
        fatherName: parsed.fatherName || '',
        address: parsed.address || parsed.addr || '',
        courtName: parsed.courtName || parsed.court || '',
        hearingDate: normalizeJudicialDate(parsed.hearingDate || parsed.date || ''),
        offenseCharges: parsed.offenseCharges || parsed.sections || '',
      };
    }

    // e-Courts format: CNR:XX; FIR:YY; Court:ZZ; Accused:AA; Date:BB
    const parts = qrContent.split(/[;\n]/);
    const result: Record<string, string> = {};

    for (const part of parts) {
      const [key, ...vals] = part.split(/[:=]/);
      if (key && vals.length > 0) {
        result[key.trim().toLowerCase()] = vals.join(':').trim();
      }
    }

    return {
      summonNumber: result['summon'] || result['notice'] || result['cnr'] || '',
      caseNumber: result['fir'] || result['case'] || result['cnr'] || '',
      personName: result['accused'] || result['respondent'] || result['name'] || '',
      address: result['address'] || result['addr'] || '',
      courtName: result['court'] || '',
      hearingDate: normalizeJudicialDate(result['date'] || result['hearing'] || ''),
      offenseCharges: result['charges'] || result['sec'] || result['section'] || '',
    };
  } catch {
    return {};
  }
};
