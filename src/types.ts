export type SummonStatus = 'Pending' | 'Upcoming' | 'Completed';
export type SummonUrgency = 'Standard' | 'High' | 'Urgent';

export type WitnessRole =
  | 'Witness'
  | 'Accused'
  | 'Complainant'
  | 'Surety'
  | 'Neighbor/Independent Witness'
  | 'Respondent';

export interface WitnessPerson {
  id: string;
  userId: string;
  name: string;
  fatherName?: string;
  role: WitnessRole;
  phone?: string;
  email?: string;
  address: string;
  policeStation: string;
  district: string;
  state?: string;
  summonId?: string;
  summonCaseNo?: string;
  statementSummary?: string;
  idProofType?: string;
  idProofNumber?: string;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Summon {
  id: string;
  userId: string;
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
  issueDate: string; // YYYY-MM-DD
  hearingDate: string; // YYYY-MM-DD
  issuingAuthority?: string;
  officerDetails?: string;
  offenseCharges?: string;
  status: SummonStatus;
  urgency: SummonUrgency;
  imageUrl?: string;
  pdfUrl?: string;
  fileName?: string;
  servedDate?: string;
  servedNotes?: string;
  reminderEnabled?: boolean;
  witnesses?: WitnessPerson[];
  linkedWitnessIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface OfficerUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  badgeNumber: string;
  policeStation: string;
  rank: string;
  district: string;
  authProvider: 'google' | 'facebook' | 'password';
}

export interface SummonFilter {
  searchQuery: string;
  status: 'All' | SummonStatus;
  urgency: 'All' | SummonUrgency;
  dateFilter?: string; // YYYY-MM-DD
}

export interface MetricSummary {
  total: number;
  pending: number;
  upcoming: number;
  completed: number;
}
