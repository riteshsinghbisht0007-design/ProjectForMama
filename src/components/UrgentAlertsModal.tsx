import React from 'react';
import { X, AlertTriangle, Clock, Calendar, ShieldAlert, ArrowRight } from 'lucide-react';
import { Summon } from '../types';

interface UrgentAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  summons: Summon[];
  onSelectSummon: (summon: Summon) => void;
}

export const UrgentAlertsModal: React.FC<UrgentAlertsModalProps> = ({
  isOpen,
  onClose,
  summons,
  onSelectSummon,
}) => {
  if (!isOpen) return null;

  const today = new Date().toISOString().split('T')[0];

  // Filter urgent / upcoming
  const alertSummons = summons
    .filter((s) => s.status !== 'Completed')
    .map((s) => {
      const diff = Math.ceil(
        (new Date(s.hearingDate).getTime() - new Date(today).getTime()) / (1000 * 3600 * 24)
      );
      return { summon: s, diff };
    })
    .filter((item) => item.diff <= 5 || item.summon.urgency === 'Urgent')
    .sort((a, b) => a.diff - b.diff);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#0B1326] border border-[#222A3D] rounded-2xl w-full max-w-lg my-8 overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-[#0A192F] border-b border-[#222A3D] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-950/80 text-red-400 border border-red-800">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Judicial Priority Alerts</h2>
              <p className="text-xs text-[#8F9097]">
                Overdue, today, and critical court appearances
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8F9097] hover:text-white hover:bg-[#1E293B] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-3">
          {alertSummons.length === 0 ? (
            <div className="py-12 text-center text-[#8F9097] space-y-2">
              <div className="w-10 h-10 mx-auto rounded-full bg-[#131B2E] flex items-center justify-center text-emerald-400">
                <Clock className="w-5 h-5" />
              </div>
              <p className="text-sm font-medium text-white">No Critical Hearing Alerts</p>
              <p className="text-xs">All scheduled summons are within normal judicial time limits.</p>
            </div>
          ) : (
            alertSummons.map(({ summon, diff }) => {
              const isOverdue = diff < 0;
              const isToday = diff === 0;

              return (
                <div
                  key={summon.id}
                  onClick={() => {
                    onSelectSummon(summon);
                    onClose();
                  }}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all hover:bg-[#171F33] flex items-center justify-between gap-3 ${
                    isOverdue
                      ? 'bg-red-950/30 border-red-800/60'
                      : isToday
                      ? 'bg-amber-950/30 border-amber-800/60'
                      : 'bg-[#131B2E] border-[#222A3D]'
                  }`}
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-white">
                        {summon.summonNumber}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          isOverdue
                            ? 'bg-red-900 text-red-200'
                            : isToday
                            ? 'bg-amber-900 text-amber-200'
                            : 'bg-blue-900 text-blue-200'
                        }`}
                      >
                        {isOverdue ? 'Overdue' : isToday ? 'Due Today' : `In ${diff} Days`}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-[#DAE2FD] truncate">
                      {summon.personName}
                    </h4>

                    <p className="text-xs text-[#8F9097] truncate">
                      {summon.courtName} • Hearing: {summon.hearingDate}
                    </p>
                  </div>

                  <ArrowRight className="w-4 h-4 text-[#8F9097] shrink-0" />
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
