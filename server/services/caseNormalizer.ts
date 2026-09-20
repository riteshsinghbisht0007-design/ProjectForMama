/**
 * Case Data Normalizer
 * Enforces the standardized official e-Courts payload schema.
 * "Only populate fields that are actually returned. NEVER guess missing values."
 */

export interface NormalizedCaseData {
  cnrNumber: string;
  caseNumber: string;
  caseType: string;
  courtName: string;
  courtNumber: string;
  state: string;
  district: string;
  filingDate: string;
  registrationDate: string;
  nextHearingDate: string;
  caseStatus: string;
  petitioner: string[];
  respondent: string[];
  advocates: string[];
  firNumber: string;
  policeStation: string;
  acts: string[];
  sections: string[];
  source: 'eCourts';
  fetchedAt: string;
}

/**
 * Normalizes raw court case data into the exact required schema.
 * Never guesses or invents missing values.
 */
export function normalizeCaseData(raw: any): NormalizedCaseData {
  const toString = (val: any): string => (typeof val === 'string' ? val.trim() : '');
  const toStringArray = (val: any): string[] => {
    if (Array.isArray(val)) {
      return val.map((v) => (typeof v === 'string' ? v.trim() : String(v).trim())).filter(Boolean);
    }
    if (typeof val === 'string' && val.trim()) {
      // Split if comma or semicolon separated
      return val.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
    }
    return [];
  };

  return {
    cnrNumber: toString(raw.cnrNumber || raw.cnr || raw.cnr_no),
    caseNumber: toString(raw.caseNumber || raw.case_no || raw.caseNo),
    caseType: toString(raw.caseType || raw.case_type || raw.type),
    courtName: toString(raw.courtName || raw.court_name || raw.court),
    courtNumber: toString(raw.courtNumber || raw.court_number || raw.courtRoom || raw.courtAddress),
    state: toString(raw.state || raw.state_name),
    district: toString(raw.district || raw.district_name),
    filingDate: toString(raw.filingDate || raw.filing_date),
    registrationDate: toString(raw.registrationDate || raw.registration_date || raw.regDate),
    nextHearingDate: toString(raw.nextHearingDate || raw.hearingDate || raw.next_date),
    caseStatus: toString(raw.caseStatus || raw.status || raw.stage),
    petitioner: toStringArray(raw.petitioner || raw.complainant || raw.appellant),
    respondent: toStringArray(raw.respondent || raw.accused || raw.oppositeParty || raw.personName),
    advocates: toStringArray(raw.advocates || raw.advocate || raw.counsel),
    firNumber: toString(raw.firNumber || raw.fir_no || raw.crimeNumber),
    policeStation: toString(raw.policeStation || raw.ps || raw.police_station),
    acts: toStringArray(raw.acts || raw.act),
    sections: toStringArray(raw.sections || raw.section || raw.offenseCharges),
    source: 'eCourts',
    fetchedAt: toString(raw.fetchedAt) || new Date().toISOString(),
  };
}
