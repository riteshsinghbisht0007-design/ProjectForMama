import React, { useState } from 'react';
import {
  X,
  Share2,
  FileImage,
  CheckCircle2,
  Trash2,
  Bell,
  Calendar,
  MapPin,
  Building2,
  User,
  Shield,
  Clock,
  Edit2,
  Save,
  Copy,
  Check,
} from 'lucide-react';
import { Summon } from '../types';
import { useSummons } from '../context/SummonContext';
import { generateFormattedForwardText, shareSummonNative } from '../utils/shareService';

interface SummonDetailModalProps {
  summon: Summon | null;
  onClose: () => void;
  onOpenSplitScreenshot: (summon: Summon) => void;
}

export const SummonDetailModal: React.FC<SummonDetailModalProps> = ({
  summon,
  onClose,
  onOpenSplitScreenshot,
}) => {
  const { updateSummon, deleteSummon, markAsServed, toggleReminder } = useSummons();

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [showMarkServedModal, setShowMarkServedModal] = useState<boolean>(false);
  const [servedNotes, setServedNotes] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Edit states
  const [editPersonName, setEditPersonName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editHearingDate, setEditHearingDate] = useState('');
  const [editCourtName, setEditCourtName] = useState('');
  const [editCourtAddress, setEditCourtAddress] = useState('');
  const [editOffense, setEditOffense] = useState('');

  if (!summon) return null;

  const handleStartEdit = () => {
    setEditPersonName(summon.personName);
    setEditAddress(summon.address);
    setEditHearingDate(summon.hearingDate);
    setEditCourtName(summon.courtName);
    setEditCourtAddress(summon.courtAddress);
    setEditOffense(summon.offenseCharges || '');
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    await updateSummon(summon.id, {
      personName: editPersonName,
      address: editAddress,
      hearingDate: editHearingDate,
      courtName: editCourtName,
      courtAddress: editCourtAddress,
      offenseCharges: editOffense,
    });
    setIsEditing(false);
  };

  const handleConfirmServed = async () => {
    await markAsServed(summon.id, servedNotes || 'Served directly to respondent with signature.');
    setShowMarkServedModal(false);
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this judicial summon record?')) {
      setIsDeleting(true);
      await deleteSummon(summon.id);
      setIsDeleting(false);
      onClose();
    }
  };

  const handleCopyText = async () => {
    const text = generateFormattedForwardText(summon);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleForwardNative = async () => {
    await shareSummonNative(summon);
  };

  // Days remaining calculation
  const today = new Date().toISOString().split('T')[0];
  const diffDays = Math.ceil(
    (new Date(summon.hearingDate).getTime() - new Date(today).getTime()) / (1000 * 3600 * 24)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#0B1326] border border-[#222A3D] rounded-2xl w-full max-w-3xl my-8 overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#0A192F] border-b border-[#222A3D] px-6 py-4 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${
                summon.status === 'Completed'
                  ? 'bg-emerald-950/80 text-emerald-400'
                  : summon.urgency === 'Urgent'
                  ? 'bg-red-950/80 text-red-400'
                  : 'bg-[#1E3A5F] text-[#ADC8F5]'
              }`}
            >
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white font-mono">{summon.summonNumber}</h2>
                <span
                  className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${
                    summon.status === 'Completed'
                      ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-500/40'
                      : summon.status === 'Upcoming'
                      ? 'bg-blue-900/60 text-blue-300 border border-blue-500/40'
                      : 'bg-amber-900/60 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  {summon.status}
                </span>
                {summon.urgency === 'Urgent' && (
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-red-900/80 text-red-200 border border-red-500">
                    Urgent
                  </span>
                )}
              </div>
              <p className="text-xs text-[#8F9097] font-mono">{summon.caseNumber}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleReminder(summon.id)}
              title="Toggle Hearing Reminder"
              className={`p-2 rounded-lg border transition-colors ${
                summon.reminderEnabled
                  ? 'bg-[#FFB77D]/20 border-[#FFB77D] text-[#FFB77D]'
                  : 'bg-[#131B2E] border-[#222A3D] text-[#8F9097] hover:text-white'
              }`}
            >
              <Bell className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#8F9097] hover:text-white hover:bg-[#1E293B] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Days Remaining / Serving Status Banner */}
          <div
            className={`p-4 rounded-xl border flex items-center justify-between ${
              summon.status === 'Completed'
                ? 'bg-emerald-950/40 border-emerald-700/50 text-emerald-300'
                : diffDays <= 2
                ? 'bg-red-950/40 border-red-800/60 text-red-300'
                : 'bg-[#131B2E] border-[#222A3D] text-[#DAE2FD]'
            }`}
          >
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 shrink-0" />
              <div>
                <span className="text-xs uppercase tracking-wider font-bold block">
                  {summon.status === 'Completed'
                    ? 'SUMMON SERVED & COMPLETED'
                    : diffDays < 0
                    ? 'HEARING DATE OVERDUE'
                    : diffDays === 0
                    ? 'COURT HEARING DUE TODAY'
                    : `${diffDays} DAYS REMAINING UNTIL COURT HEARING`}
                </span>
                <span className="text-xs opacity-80">
                  {summon.status === 'Completed'
                    ? `Served on: ${summon.servedDate || 'Recorded'}`
                    : `Appearance Date: ${summon.hearingDate}`}
                </span>
              </div>
            </div>

            {summon.status !== 'Completed' && (
              <button
                onClick={() => setShowMarkServedModal(true)}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow"
              >
                <CheckCircle2 className="w-4 h-4" /> Mark Served
              </button>
            )}
          </div>

          {/* Served Details if completed */}
          {summon.status === 'Completed' && summon.servedNotes && (
            <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-xl text-xs text-emerald-200">
              <span className="font-bold block mb-1">Serving Officer Remarks:</span>
              <p>{summon.servedNotes}</p>
            </div>
          )}

          {/* DOCUMENT ATTACHMENT PREVIEW */}
          {summon.imageUrl && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#ADC8F5] uppercase tracking-wider">
                  Original Document / Warrant Scan:
                </span>
                <span className="text-[11px] text-[#8F9097]">
                  Preserved in encrypted storage
                </span>
              </div>
              <div className="border border-[#222A3D] rounded-xl overflow-hidden bg-black/40 p-2 flex justify-center">
                <img
                  src={summon.imageUrl}
                  alt="Summon document copy"
                  className="max-h-72 object-contain rounded-lg border border-[#39475F]"
                />
              </div>
            </div>
          )}

          {/* PARTICULARS GRID */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#222A3D] pb-2">
              <span className="text-xs font-bold text-[#ADC8F5] uppercase tracking-wider">
                Judicial Docket Particulars
              </span>
              {!isEditing ? (
                <button
                  onClick={handleStartEdit}
                  className="text-xs text-[#FFB77D] hover:underline flex items-center gap-1"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit Details
                </button>
              ) : (
                <button
                  onClick={handleSaveEdit}
                  className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-bold"
                >
                  <Save className="w-3.5 h-3.5" /> Save Changes
                </button>
              )}
            </div>

            {/* Respondent & Address Box */}
            <div className="p-4 bg-[#131B2E] border border-[#222A3D] rounded-xl space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-[#1E293B] text-[#B9C7E4] shrink-0 mt-1">
                  <User className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] text-[#8F9097] uppercase">Person Summoned</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editPersonName}
                      onChange={(e) => setEditPersonName(e.target.value)}
                      className="w-full bg-[#0B1326] border border-[#39475F] rounded px-2.5 py-1 text-sm text-white mt-1"
                    />
                  ) : (
                    <h3 className="text-base font-bold text-white">
                      {summon.personName}
                      {summon.fatherName && (
                        <span className="text-xs font-normal text-[#C5C6CD] ml-2">
                          (S/O {summon.fatherName})
                        </span>
                      )}
                    </h3>
                  )}
                </div>
              </div>

              {/* Full Address Highlight */}
              <div className="flex items-start gap-3 pt-2 border-t border-[#222A3D]">
                <div className="p-2 rounded-lg bg-[#2B1300] text-[#FFB77D] shrink-0 mt-1">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] font-bold text-[#FFB77D] uppercase">
                    Full Residential / Serving Address
                  </span>
                  {isEditing ? (
                    <textarea
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      rows={2}
                      className="w-full bg-[#0B1326] border border-[#39475F] rounded px-2.5 py-1 text-sm text-white mt-1"
                    />
                  ) : (
                    <p className="text-sm font-medium text-white mt-0.5 leading-relaxed">
                      {summon.address}
                    </p>
                  )}
                  <p className="text-xs text-[#8F9097] mt-1">
                    Police Station: {summon.policeStation} • District: {summon.district}
                  </p>
                </div>
              </div>
            </div>

            {/* Court & Appearance Box */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-[#131B2E] border border-[#222A3D] rounded-xl">
                <div className="flex items-center gap-2 text-xs text-[#8F9097] mb-1">
                  <Building2 className="w-3.5 h-3.5 text-[#B9C7E4]" />
                  <span>COURT & BENCH</span>
                </div>
                {isEditing ? (
                  <div className="space-y-2 mt-1">
                    <input
                      type="text"
                      value={editCourtName}
                      onChange={(e) => setEditCourtName(e.target.value)}
                      className="w-full bg-[#0B1326] border border-[#39475F] rounded px-2 py-1 text-xs text-white"
                      placeholder="Court name"
                    />
                    <input
                      type="text"
                      value={editCourtAddress}
                      onChange={(e) => setEditCourtAddress(e.target.value)}
                      className="w-full bg-[#0B1326] border border-[#39475F] rounded px-2 py-1 text-xs text-white"
                      placeholder="Court room/complex"
                    />
                  </div>
                ) : (
                  <>
                    <h4 className="text-sm font-bold text-white">{summon.courtName}</h4>
                    <p className="text-xs text-[#8F9097]">{summon.courtAddress}</p>
                    <p className="text-[11px] text-[#C5C6CD] mt-1">
                      Authority: {summon.issuingAuthority || 'Judicial Magistrate'}
                    </p>
                  </>
                )}
              </div>

              <div className="p-4 bg-[#131B2E] border border-[#222A3D] rounded-xl">
                <div className="flex items-center gap-2 text-xs text-[#8F9097] mb-1">
                  <Calendar className="w-3.5 h-3.5 text-[#FFB77D]" />
                  <span>HEARING TIMELINE</span>
                </div>
                {isEditing ? (
                  <div className="mt-1">
                    <label className="text-[10px] text-[#8F9097] block mb-1">Hearing Date</label>
                    <input
                      type="date"
                      value={editHearingDate}
                      onChange={(e) => setEditHearingDate(e.target.value)}
                      className="w-full bg-[#0B1326] border border-[#39475F] rounded px-2 py-1 text-xs text-white font-mono"
                    />
                  </div>
                ) : (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold font-mono text-[#FFB77D]">
                        {summon.hearingDate}
                      </span>
                    </div>
                    <p className="text-xs text-[#8F9097] mt-1">Issued on: {summon.issueDate}</p>
                    {summon.offenseCharges && (
                      <p className="text-[11px] text-[#ADC8F5] mt-1">
                        Charges: {summon.offenseCharges}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Mark Served Submodal */}
          {showMarkServedModal && (
            <div className="p-4 bg-[#1E293B] border border-emerald-600 rounded-xl space-y-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Confirm Summon Service to Respondent
              </h4>
              <p className="text-xs text-[#C5C6CD]">
                Enter delivery confirmation notes, witness details, or recipient acknowledgment:
              </p>
              <textarea
                value={servedNotes}
                onChange={(e) => setServedNotes(e.target.value)}
                placeholder="e.g. Served in person at residence. Signature obtained on police copy. Handed to respondent Ramesh Kumar."
                className="w-full bg-[#0B1326] border border-[#39475F] rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                rows={2}
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowMarkServedModal(false)}
                  className="px-3 py-1.5 bg-[#131B2E] text-xs text-[#8F9097] rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmServed}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg"
                >
                  Confirm & Close Summon
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="bg-[#0A192F] border-t border-[#222A3D] px-6 py-4 flex flex-wrap items-center justify-between gap-3 sticky bottom-0 z-20">
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1.5 p-2 rounded-lg hover:bg-red-950/40 transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Delete Record
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleCopyText}
              className="px-3.5 py-2 rounded-xl border border-[#222A3D] hover:bg-[#1E293B] text-xs font-medium text-[#DAE2FD] flex items-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy Notice Text'}
            </button>

            <button
              onClick={() => onOpenSplitScreenshot(summon)}
              className="px-4 py-2 rounded-xl bg-[#1E3A5F] hover:bg-[#2F4A70] text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <FileImage className="w-4 h-4" /> Visual Split Copy
            </button>

            <button
              onClick={handleForwardNative}
              className="px-5 py-2 rounded-xl bg-[#3B82F6] hover:bg-blue-600 text-white text-xs font-bold flex items-center gap-1.5 shadow transition-colors"
            >
              <Share2 className="w-4 h-4" /> Forward Summon
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
