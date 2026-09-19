import React, { useState } from 'react';
import {
  X,
  Search,
  Plus,
  Shield,
  MapPin,
  Phone,
  Edit2,
  Trash2,
  Share2,
  Copy,
  Check,
  User,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { WitnessPerson, WitnessRole } from '../types';
import { useSummons } from '../context/SummonContext';
import { useToast } from './Toast';
import { shareWitnessNative, generateWitnessForwardText } from '../utils/shareService';

interface WitnessDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WitnessDirectoryModal: React.FC<WitnessDirectoryModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { witnesses, addWitness, updateWitness, deleteWitness, isLoadingWitnesses } = useSummons();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<WitnessRole | 'All'>('All');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [role, setRole] = useState<WitnessRole>('Witness');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [policeStation, setPoliceStation] = useState('Central Precinct #4');
  const [district, setDistrict] = useState('New Delhi');
  const [idProofType, setIdProofType] = useState('Aadhaar Card');
  const [idProofNumber, setIdProofNumber] = useState('');
  const [summonCaseNo, setSummonCaseNo] = useState('');
  const [statementSummary, setStatementSummary] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Copy tracking
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Keyboard Escape listener (registered unconditionally at the top of the component)
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleOpenAdd = () => {
    setEditingId(null);
    setName('');
    setFatherName('');
    setRole('Witness');
    setPhone('');
    setAddress('');
    setPoliceStation('Central Precinct #4');
    setDistrict('New Delhi');
    setIdProofType('Aadhaar Card');
    setIdProofNumber('');
    setSummonCaseNo('');
    setStatementSummary('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (w: WitnessPerson) => {
    setEditingId(w.id);
    setName(w.name);
    setFatherName(w.fatherName || '');
    setRole(w.role);
    setPhone(w.phone || '');
    setAddress(w.address);
    setPoliceStation(w.policeStation);
    setDistrict(w.district);
    setIdProofType(w.idProofType || 'Aadhaar Card');
    setIdProofNumber(w.idProofNumber || '');
    setSummonCaseNo(w.summonCaseNo || '');
    setStatementSummary(w.statementSummary || '');
    setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Name is required', 'error');
      return;
    }
    if (!address.trim()) {
      showToast('Address is required', 'error');
      return;
    }

    setIsSaving(true);
    try {
      if (editingId) {
        await updateWitness(editingId, {
          name: name.trim(),
          fatherName: fatherName.trim() || undefined,
          role,
          phone: phone.trim() || undefined,
          address: address.trim(),
          policeStation: policeStation.trim(),
          district: district.trim(),
          idProofType: idProofType || undefined,
          idProofNumber: idProofNumber.trim() || undefined,
          summonCaseNo: summonCaseNo.trim() || undefined,
          statementSummary: statementSummary.trim() || undefined,
        });
        showToast('Person particulars updated successfully', 'success', 'Updated');
      } else {
        await addWitness({
          name: name.trim(),
          fatherName: fatherName.trim() || undefined,
          role,
          phone: phone.trim() || undefined,
          address: address.trim(),
          policeStation: policeStation.trim(),
          district: district.trim(),
          idProofType: idProofType || undefined,
          idProofNumber: idProofNumber.trim() || undefined,
          summonCaseNo: summonCaseNo.trim() || undefined,
          statementSummary: statementSummary.trim() || undefined,
        });
        showToast('Person registered to directory', 'success', 'Saved');
      }
      setIsFormOpen(false);
    } catch {
      showToast('Failed to save person. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, personName: string) => {
    try {
      await deleteWitness(id);
      showToast(`${personName} removed from directory`, 'info');
    } catch {
      showToast('Failed to delete person', 'error');
    }
  };

  const handleForward = async (w: WitnessPerson) => {
    const success = await shareWitnessNative(w);
    if (success) {
      showToast(`Witness details forwarded: ${w.name}`, 'success', 'Forwarded');
    }
  };

  const handleCopy = async (w: WitnessPerson) => {
    const text = generateWitnessForwardText(w);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(w.id);
      showToast('Witness particulars copied to clipboard', 'info');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      showToast('Could not access clipboard', 'warning');
    }
  };

  const filteredWitnesses = witnesses.filter((w) => {
    if (roleFilter !== 'All' && w.role !== roleFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      w.name.toLowerCase().includes(q) ||
      (w.fatherName || '').toLowerCase().includes(q) ||
      (w.phone || '').includes(q) ||
      w.address.toLowerCase().includes(q) ||
      w.policeStation.toLowerCase().includes(q) ||
      (w.summonCaseNo || '').toLowerCase().includes(q)
    );
  });

  return (
    <div
      id="witness-directory-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-background border border-border rounded-2xl w-full max-w-4xl overflow-hidden shadow-premium-hover animate-scaleIn flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-background-alt border-b border-border px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary-btn text-white">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Witness & People Directory</h2>
              <p className="text-xs text-muted-foreground">
                Manage witnesses, accused, sureties, and service acknowledgments
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {!isFormOpen ? (
            <>
              {/* Actions Bar */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, phone, address, case no…"
                    className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-xs text-foreground placeholder-muted-foreground focus:border-primary-text focus:outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleOpenAdd}
                  className="px-4 py-2.5 bg-primary-btn text-white hover:bg-primary-hover font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow transition-colors cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" /> Add Someone
                </button>
              </div>

              {/* Role filter tabs */}
              <div className="flex flex-wrap gap-1.5">
                {(['All', 'Witness', 'Accused', 'Complainant', 'Surety', 'Neighbor/Independent Witness'] as const).map(
                  (r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRoleFilter(r)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        roleFilter === r
                          ? 'bg-primary-btn text-white font-bold shadow-sm'
                          : 'bg-card text-muted-foreground hover:text-foreground border border-border'
                      }`}
                    >
                      {r}
                    </button>
                  )
                )}
              </div>

              {/* List of Persons */}
              {isLoadingWitnesses ? (
                <div className="py-16 text-center text-xs text-muted-foreground">
                  Loading directory records from Firestore…
                </div>
              ) : filteredWitnesses.length === 0 ? (
                <div className="py-16 text-center space-y-3 bg-card border border-border rounded-2xl p-8 shadow-sm">
                  <Shield className="w-10 h-10 text-muted-foreground mx-auto opacity-40" />
                  <h4 className="text-sm font-bold text-foreground">No Records Found</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    {witnesses.length === 0
                      ? 'No witnesses or accused persons registered yet. Click "Add Someone" to record a new person.'
                      : 'No directory records matched your search query.'}
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenAdd}
                    className="px-4 py-2 bg-primary-btn text-white hover:bg-primary-hover font-bold text-xs rounded-xl inline-flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
                  >
                    <Plus className="w-4 h-4" /> Add Someone Now
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {filteredWitnesses.map((w) => (
                    <div
                      key={w.id}
                      className="p-4 bg-card border border-border hover:border-border-strong rounded-2xl space-y-3 transition-all flex flex-col justify-between shadow-sm"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-bold text-foreground text-sm block">{w.name}</span>
                            {w.fatherName && (
                              <span className="text-xs text-muted-foreground block">s/o {w.fatherName}</span>
                            )}
                          </div>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold ${
                              w.role === 'Witness'
                                ? 'bg-muted text-foreground border border-border'
                                : w.role === 'Accused'
                                ? 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800'
                                : 'bg-muted text-foreground border border-border'
                            }`}
                          >
                            {w.role}
                          </span>
                        </div>

                        <div className="space-y-1.5 text-xs text-foreground-alt">
                          <div className="flex items-start gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{w.address}</span>
                          </div>

                          {w.phone && (
                            <div className="flex items-center gap-1.5 font-mono text-primary-text">
                              <Phone className="w-3.5 h-3.5 shrink-0" />
                              <span>{w.phone}</span>
                            </div>
                          )}

                          {w.idProofNumber && (
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              <FileText className="w-3.5 h-3.5 shrink-0" />
                              <span>
                                {w.idProofType}: <span className="font-mono text-foreground">{w.idProofNumber}</span>
                              </span>
                            </div>
                          )}

                          {w.summonCaseNo && (
                            <div className="text-[11px] text-primary-text font-medium">
                              Linked Case: <span className="font-mono">{w.summonCaseNo}</span>
                            </div>
                          )}

                          {w.statementSummary && (
                            <p className="text-[11px] italic text-muted-foreground bg-background p-2 rounded-lg border border-border">
                              "{w.statementSummary}"
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="pt-2 border-t border-border flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleCopy(w)}
                            title="Copy formatted dispatch text"
                            aria-label="Copy formatted dispatch text"
                            className="p-1.5 rounded-lg text-muted-foreground btn-premium cursor-pointer"
                          >
                            {copiedId === w.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleForward(w)}
                            title="Forward via WhatsApp / Device Share"
                            aria-label="Forward via WhatsApp or Device Share"
                            className="p-1.5 rounded-lg text-primary-text btn-premium cursor-pointer"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(w)}
                            aria-label="Edit witness particulars"
                            className="p-1.5 rounded-lg text-foreground btn-premium cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(w.id, w.name)}
                            aria-label="Delete witness record"
                            className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 text-muted-foreground dark:hover:bg-red-950/40 dark:text-red-400 dark:hover:text-red-300 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            /* Comprehensive Add / Edit Person Form */
            <form onSubmit={handleSave} className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <User className="w-4 h-4 text-warning" />
                  <span>{editingId ? 'Edit Person Particulars' : 'Register New Person / Witness'}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="text-xs text-muted-foreground hover:text-foreground underline cursor-pointer"
                >
                  Cancel & Return
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    Full Legal Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ramesh Chandra Verma"
                    className="w-full px-3.5 py-2 bg-card border border-border rounded-xl text-xs text-foreground focus:border-primary-text focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    Father's / Spouse's Name
                  </label>
                  <input
                    type="text"
                    value={fatherName}
                    onChange={(e) => setFatherName(e.target.value)}
                    placeholder="e.g. Late Shri Om Prakash"
                    className="w-full px-3.5 py-2 bg-card border border-border rounded-xl text-xs text-foreground focus:border-primary-text focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    Role in Legal Proceedings *
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as WitnessRole)}
                    className="w-full px-3.5 py-2 bg-card border border-border rounded-xl text-xs text-foreground focus:border-primary-text focus:outline-none"
                  >
                    <option value="Witness">Witness</option>
                    <option value="Accused">Accused Person</option>
                    <option value="Complainant">Complainant / Victim</option>
                    <option value="Surety">Surety / Guarantor</option>
                    <option value="Neighbor/Independent Witness">Neighbor / Spot Witness</option>
                    <option value="Respondent">Respondent</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    Contact Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3.5 py-2 bg-card border border-border rounded-xl text-xs text-foreground focus:border-primary-text focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Complete Residential / Serving Address *
                </label>
                <textarea
                  rows={2}
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Plot/Flat number, Street name, Locality, City/Town, Postal PIN Code"
                  className="w-full px-3.5 py-2 bg-card border border-border rounded-xl text-xs text-foreground focus:border-primary-text focus:outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    Police Station
                  </label>
                  <input
                    type="text"
                    value={policeStation}
                    onChange={(e) => setPoliceStation(e.target.value)}
                    className="w-full px-3.5 py-2 bg-card border border-border rounded-xl text-xs text-foreground focus:border-primary-text focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    District
                  </label>
                  <input
                    type="text"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full px-3.5 py-2 bg-card border border-border rounded-xl text-xs text-foreground focus:border-primary-text focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    Linked Case / FIR # (Optional)
                  </label>
                  <input
                    type="text"
                    value={summonCaseNo}
                    onChange={(e) => setSummonCaseNo(e.target.value)}
                    placeholder="FIR #420/2024"
                    className="w-full px-3.5 py-2 bg-card border border-border rounded-xl text-xs text-foreground focus:border-primary-text focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    ID Proof Document Type
                  </label>
                  <select
                    value={idProofType}
                    onChange={(e) => setIdProofType(e.target.value)}
                    className="w-full px-3.5 py-2 bg-card border border-border rounded-xl text-xs text-foreground focus:border-primary-text focus:outline-none"
                  >
                    <option value="Aadhaar Card">Aadhaar Card (UID)</option>
                    <option value="Voter ID (EPIC)">Voter ID (EPIC)</option>
                    <option value="Driving License">Driving License</option>
                    <option value="Passport">Passport</option>
                    <option value="PAN Card">PAN Card</option>
                    <option value="Other Govt ID">Other Government ID</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    ID Document Reference Number
                  </label>
                  <input
                    type="text"
                    value={idProofNumber}
                    onChange={(e) => setIdProofNumber(e.target.value)}
                    placeholder="e.g. XXXX-XXXX-1234"
                    className="w-full px-3.5 py-2 bg-card border border-border rounded-xl text-xs text-foreground focus:border-primary-text focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Statement Summary / Service Remarks
                </label>
                <textarea
                  rows={2}
                  value={statementSummary}
                  onChange={(e) => setStatementSummary(e.target.value)}
                  placeholder="Record summary of statement or conditions under which summons/notice was served..."
                  className="w-full px-3.5 py-2 bg-card border border-border rounded-xl text-xs text-foreground focus:border-primary-text focus:outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 border border-border hover:bg-muted text-xs font-medium text-foreground rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2 bg-primary-btn text-white hover:bg-primary-hover font-bold text-xs rounded-xl shadow transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'Saving…' : editingId ? 'Update Particulars' : 'Save to Directory'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
