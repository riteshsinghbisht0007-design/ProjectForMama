import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  Clock,
  MapPin,
  Building2,
} from 'lucide-react';
import { Summon } from '../types';

interface HearingCalendarViewProps {
  summons: Summon[];
  onSelectSummon: (summon: Summon) => void;
  onAddSummonForDate: (dateStr: string) => void;
}

export const HearingCalendarView: React.FC<HearingCalendarViewProps> = ({
  summons,
  onSelectSummon,
  onAddSummonForDate,
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  // First day and total days in month
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Map summons by hearing date
  const summonsByDate: Record<string, Summon[]> = {};
  for (const s of summons) {
    if (!summonsByDate[s.hearingDate]) summonsByDate[s.hearingDate] = [];
    summonsByDate[s.hearingDate].push(s);
  }

  const daysArray = [];
  for (let i = 0; i < firstDay; i++) {
    daysArray.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    daysArray.push(d);
  }

  const selectedDateSummons = summonsByDate[selectedDateStr] || [];

  return (
    <div className="space-y-6">
      <div className="bg-[#131B2E] border border-[#222A3D] rounded-2xl p-5 shadow-lg">
        {/* Calendar Navigation */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[#1E293B] text-[#ADC8F5]">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">
                {monthNames[month]} {year}
              </h3>
              <p className="text-xs text-[#8F9097]">Judicial Court Hearing Schedules</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={prevMonth}
              id="prev-month-btn"
              className="p-1.5 rounded-lg border border-[#222A3D] hover:bg-[#1E293B] text-[#DAE2FD]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-2.5 py-1 text-xs rounded-lg border border-[#222A3D] hover:bg-[#1E293B] text-[#ADC8F5]"
            >
              Today
            </button>
            <button
              onClick={nextMonth}
              id="next-month-btn"
              className="p-1.5 rounded-lg border border-[#222A3D] hover:bg-[#1E293B] text-[#DAE2FD]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 text-center text-xs font-medium text-[#8F9097] pb-2 border-b border-[#222A3D]">
          <span>Sun</span>
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1 pt-2">
          {daysArray.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="h-10 sm:h-12" />;
            }

            const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(
              2,
              '0'
            )}`;
            const isSelected = selectedDateStr === dayStr;
            const isToday = new Date().toISOString().split('T')[0] === dayStr;
            const daySummons = summonsByDate[dayStr] || [];

            return (
              <button
                key={dayStr}
                onClick={() => setSelectedDateStr(dayStr)}
                className={`h-10 sm:h-12 rounded-xl flex flex-col items-center justify-center relative transition-all ${
                  isSelected
                    ? 'bg-[#2F4A70] text-white font-bold ring-2 ring-[#ADC8F5]'
                    : isToday
                    ? 'bg-[#1E293B] text-[#FFB77D] font-bold border border-[#FFB77D]/40'
                    : 'hover:bg-[#171F33] text-[#DAE2FD]'
                }`}
              >
                <span className="text-xs sm:text-sm font-mono">{day}</span>
                {daySummons.length > 0 && (
                  <div className="flex gap-0.5 mt-1">
                    {daySummons.slice(0, 3).map((s, sIdx) => (
                      <span
                        key={sIdx}
                        className={`w-1.5 h-1.5 rounded-full ${
                          s.status === 'Completed'
                            ? 'bg-emerald-400'
                            : s.urgency === 'Urgent'
                            ? 'bg-red-400'
                            : 'bg-[#FFB77D]'
                        }`}
                      />
                    ))}
                    {daySummons.length > 3 && (
                      <span className="text-[8px] text-[#ADC8F5] leading-none">+</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Date Summary & Docket List */}
      <div className="bg-[#131B2E] border border-[#222A3D] rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#222A3D] pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#FFB77D]" />
              <h4 className="font-bold text-white text-sm">
                Hearings on: <span className="font-mono text-[#ADC8F5]">{selectedDateStr}</span>
              </h4>
            </div>
            <p className="text-xs text-[#8F9097] mt-0.5">
              {selectedDateSummons.length} summon(s) scheduled for this court date
            </p>
          </div>

          <button
            onClick={() => onAddSummonForDate(selectedDateStr)}
            id="add-summon-for-date-btn"
            className="px-3 py-1.5 bg-[#2F4A70] hover:bg-[#3B82F6] text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add for this Date
          </button>
        </div>

        {selectedDateSummons.length === 0 ? (
          <div className="py-8 text-center text-[#8F9097] text-xs">
            No court appearances or summons returnable on {selectedDateStr}.
          </div>
        ) : (
          <div className="space-y-3">
            {selectedDateSummons.map((s) => (
              <div
                key={s.id}
                onClick={() => onSelectSummon(s)}
                className="p-3.5 bg-[#0B1326] border border-[#222A3D] hover:border-[#39475F] rounded-xl cursor-pointer transition-colors space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-white">{s.summonNumber}</span>
                  <span
                    className={`px-2 py-0.5 text-[10px] rounded-full uppercase font-bold ${
                      s.status === 'Completed'
                        ? 'bg-emerald-950 text-emerald-300'
                        : 'bg-[#2B1300] text-[#FFB77D]'
                    }`}
                  >
                    {s.status}
                  </span>
                </div>

                <div className="text-sm font-bold text-[#DAE2FD]">{s.personName}</div>

                <div className="flex items-center gap-4 text-xs text-[#8F9097]">
                  <div className="flex items-center gap-1 truncate">
                    <Building2 className="w-3 h-3 text-[#B9C7E4]" />
                    <span className="truncate">{s.courtName}</span>
                  </div>
                  <div className="flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 text-[#FFB77D]" />
                    <span className="truncate">{s.policeStation}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
