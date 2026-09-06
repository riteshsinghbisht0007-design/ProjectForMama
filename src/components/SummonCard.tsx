import React from 'react';
import {
  MapPin,
  Calendar,
  Building2,
  Share2,
  FileImage,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { Summon } from '../types';
import { useSummons } from '../context/SummonContext';
import { shareSummonNative } from '../utils/shareService';

interface SummonCardProps {
  summon: Summon;
  onSelect: (summon: Summon) => void;
  onOpenSplitScreenshot: (summon: Summon) => void;
}

export const SummonCard: React.FC<SummonCardProps> = ({
  summon,
  onSelect,
  onOpenSplitScreenshot,
}) => {
  const { markAsServed } = useSummons();

  const today = new Date().toISOString().split('T')[0];
  const diffDays = Math.ceil(
    (new Date(summon.hearingDate).getTime() - new Date(today).getTime()) / (1000 * 3600 * 24)
  );

  const isDueSoon = summon.status !== 'Completed' && diffDays <= 2 && diffDays >= 0;
  const isOverdue = summon.status !== 'Completed' && diffDays < 0;

  const handleQuickServed = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Mark summon ${summon.summonNumber} for ${summon.personName} as Served & Closed?`)) {
      markAsServed(summon.id, 'Summon served in person. Signature obtained.');
    }
  };

  const handleQuickForward = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await shareSummonNative(summon);
  };

  const handleQuickSplit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenSplitScreenshot(summon);
  };

  return (
    <div
      onClick={() => onSelect(summon)}
      id={`summon-card-${summon.id}`}
      className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer relative overflow-hidden bg-[#131B2E] border-[#222A3D] hover:border-[#39475F] hover:bg-[#171F33] group shadow-sm ${
        isDueSoon ? 'ring-1 ring-amber-500/50' : isOverdue ? 'ring-1 ring-red-500/50' : ''
      }`}
    >
      {/* Left accent stripe based on urgency/status */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-1.5 ${
          summon.status === 'Completed'
            ? 'bg-emerald-500'
            : summon.urgency === 'Urgent' || isOverdue
            ? 'bg-red-500'
            : summon.urgency === 'High' || isDueSoon
            ? 'bg-amber-500'
            : 'bg-[#3B82F6]'
        }`}
      />

      <div className="pl-2 space-y-3">
        {/* Top line: Reference and Status */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-white tracking-wider">
              {summon.summonNumber}
            </span>
            <span className="text-[11px] font-mono text-[#8F9097]">• {summon.caseNumber}</span>
          </div>

          <div className="flex items-center gap-1.5">
            {isOverdue && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-950/80 text-red-300 border border-red-700/60 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> Overdue
              </span>
            )}
            {isDueSoon && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-700/60">
                {diffDays === 0 ? 'Due Today' : `In ${diffDays}d`}
              </span>
            )}
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                summon.status === 'Completed'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/50'
                  : summon.status === 'Upcoming'
                  ? 'bg-blue-950 text-blue-300 border border-blue-700/50'
                  : 'bg-[#2B1300] text-[#FFB77D] border border-[#FFB77D]/40'
              }`}
            >
              {summon.status}
            </span>
          </div>
        </div>

        {/* Center: Person Name & Father Name */}
        <div>
          <h3 className="text-base font-bold text-white group-hover:text-[#ADC8F5] transition-colors">
            {summon.personName}
            {summon.fatherName && (
              <span className="text-xs font-normal text-[#8F9097] ml-2">
                (S/O {summon.fatherName})
              </span>
            )}
          </h3>
        </div>

        {/* Complete Address preview */}
        <div className="flex items-start gap-2 text-xs text-[#DAE2FD] bg-[#0B1326] p-2 rounded-lg border border-[#222A3D]">
          <MapPin className="w-3.5 h-3.5 text-[#FFB77D] shrink-0 mt-0.5" />
          <p className="line-clamp-2 text-[11px] leading-relaxed">
            <span className="font-semibold text-white">Serving Address: </span>
            {summon.address}
          </p>
        </div>

        {/* Bottom Court & Hearing Info */}
        <div className="flex items-center justify-between text-xs text-[#8F9097] pt-1">
          <div className="flex items-center gap-1.5 truncate max-w-[50%]">
            <Building2 className="w-3.5 h-3.5 text-[#B9C7E4] shrink-0" />
            <span className="truncate">{summon.courtName}</span>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-[#DAE2FD]">
            <Calendar className="w-3.5 h-3.5 text-[#FFB77D]" />
            <span>{summon.hearingDate}</span>
          </div>
        </div>

        {/* Quick Action Toolbar */}
        <div className="pt-2 border-t border-[#222A3D] flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleQuickForward}
              title="Forward summon details"
              className="p-1.5 rounded-lg text-[#8F9097] hover:text-white hover:bg-[#1E293B] transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleQuickSplit}
              title="Generate side-by-side visual screenshot"
              className="p-1.5 rounded-lg text-[#8F9097] hover:text-[#ADC8F5] hover:bg-[#1E293B] transition-colors"
            >
              <FileImage className="w-3.5 h-3.5" />
            </button>

            {summon.status !== 'Completed' && (
              <button
                onClick={handleQuickServed}
                title="Mark served"
                className="px-2 py-1 rounded text-[11px] font-medium bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800/60 text-emerald-300 flex items-center gap-1 transition-colors"
              >
                <CheckCircle2 className="w-3 h-3" /> Served
              </button>
            )}
          </div>

          <span className="text-xs text-[#ADC8F5] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform font-medium">
            View Docket <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </div>
  );
};
