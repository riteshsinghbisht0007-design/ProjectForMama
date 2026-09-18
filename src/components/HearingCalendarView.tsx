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
      <div className="bg-card border border-border rounded-2xl p-5 shadow-lg">
        {/* Calendar Navigation */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-muted text-primary-text">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-base">
                {monthNames[month]} {year}
              </h3>
              <p className="text-xs text-muted-foreground">Judicial Court Hearing Schedules</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={prevMonth}
              id="prev-month-btn"
              className="p-1.5 rounded-lg border border-border text-foreground btn-premium"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-2.5 py-1 text-xs rounded-lg border border-border text-primary-text btn-premium"
            >
              Today
            </button>
            <button
              onClick={nextMonth}
              id="next-month-btn"
              className="p-1.5 rounded-lg border border-border text-foreground btn-premium"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 text-center text-xs font-medium text-muted-foreground pb-2 border-b border-border">
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
                className={`h-10 sm:h-12 rounded-xl flex flex-col items-center justify-center relative transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#2563EB] text-white font-bold ring-2 ring-[#2563EB]/40 shadow-sm'
                    : isToday
                    ? 'bg-[#EFF6FF] text-[#2563EB] font-bold border border-[#60A5FA] dark:bg-muted dark:text-warning dark:border-warning/40'
                    : 'hover:bg-[#EFF6FF] dark:hover:bg-card-hover text-foreground'
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
                            ? 'bg-emerald-500 dark:bg-emerald-400'
                            : s.urgency === 'Urgent'
                            ? 'bg-red-500 dark:bg-red-400'
                            : 'bg-amber-500 dark:bg-warning'
                        }`}
                      />
                    ))}
                    {daySummons.length > 3 && (
                      <span className="text-[8px] text-primary-text leading-none font-bold">+</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Date Summary & Docket List */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-warning" />
              <h4 className="font-bold text-foreground text-sm">
                Hearings on: <span className="font-mono text-primary-text">{selectedDateStr}</span>
              </h4>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {selectedDateSummons.length} summon(s) scheduled for this court date
            </p>
          </div>

          <button
            onClick={() => onAddSummonForDate(selectedDateStr)}
            id="add-summon-for-date-btn"
            className="px-3 py-1.5 bg-primary-btn hover:bg-primary-hover text-white font-bold text-xs rounded-lg flex items-center gap-1.5 btn-premium shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" /> Add for this Date
          </button>
        </div>

        {selectedDateSummons.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-xs">
            No court appearances or summons returnable on {selectedDateStr}.
          </div>
        ) : (
          <div className="space-y-3">
            {selectedDateSummons.map((s) => (
              <div
                key={s.id}
                onClick={() => onSelectSummon(s)}
                className="p-3.5 bg-card border border-border rounded-xl cursor-pointer space-y-2 card-premium hover:border-[#60A5FA] hover:shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-foreground">{s.summonNumber}</span>
                  <span
                    className={`px-2 py-0.5 text-[10px] rounded-full uppercase font-bold ${
                      s.status === 'Completed'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-warning-muted dark:text-warning'
                    }`}
                  >
                    {s.status}
                  </span>
                </div>

                <div className="text-sm font-bold text-foreground">{s.personName}</div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1 truncate">
                    <Building2 className="w-3 h-3 text-info-text" />
                    <span className="truncate">{s.courtName}</span>
                  </div>
                  <div className="flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 text-warning" />
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
