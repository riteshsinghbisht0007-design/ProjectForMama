import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Calendar as CalendarIcon,
  Plus,
  Clock,
  MapPin,
  Building2,
  Grid,
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
  const [showYearGrid, setShowYearGrid] = useState<boolean>(false);
  const [decadeStart, setDecadeStart] = useState<number>(() => Math.floor(new Date().getFullYear() / 10) * 10);

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary-text border border-primary/20">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                {/* Interactive Month Selector */}
                <select
                  value={month}
                  onChange={(e) => setCurrentDate(new Date(year, Number(e.target.value), 1))}
                  aria-label="Select calendar month"
                  className="font-bold text-foreground text-sm sm:text-base bg-background border border-border rounded-lg px-2 py-1 focus:outline-none focus:border-primary-text cursor-pointer hover:border-border-strong transition-colors"
                >
                  {monthNames.map((m, idx) => (
                    <option key={m} value={idx}>
                      {m}
                    </option>
                  ))}
                </select>

                {/* Interactive Year Selector */}
                <div className="relative">
                  <select
                    value={year}
                    onChange={(e) => {
                      const newY = Number(e.target.value);
                      setCurrentDate(new Date(newY, month, 1));
                      setDecadeStart(Math.floor(newY / 10) * 10);
                    }}
                    aria-label="Select calendar year"
                    className="font-bold text-foreground text-sm sm:text-base bg-background border border-border rounded-lg px-2 py-1 focus:outline-none focus:border-primary-text cursor-pointer hover:border-border-strong transition-colors font-mono"
                  >
                    {Array.from({ length: 34 }, (_, i) => 2012 + i).map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quick Year Grid / Decade Picker Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    setDecadeStart(Math.floor(year / 10) * 10);
                    setShowYearGrid((prev) => !prev);
                  }}
                  title="Open Quick Year Grid Selector"
                  aria-label="Open year grid selector"
                  className={`p-1.5 rounded-lg border text-xs font-mono font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                    showYearGrid
                      ? 'bg-primary-btn text-white border-primary-btn shadow-sm'
                      : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <Grid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Years</span>
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">Judicial Court Hearing Schedules</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            {/* Quick Year Jump Backward */}
            <button
              type="button"
              onClick={() => setCurrentDate(new Date(year - 1, month, 1))}
              aria-label="Previous year"
              title="Previous Year"
              className="px-2 py-1 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground btn-premium cursor-pointer font-mono font-medium"
            >
              -1Y
            </button>

            <button
              type="button"
              onClick={prevMonth}
              id="prev-month-btn"
              aria-label="Previous month"
              title="Previous Month"
              className="p-1.5 rounded-lg border border-border text-foreground btn-premium cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setCurrentDate(new Date())}
              id="today-month-btn"
              title="Return to Today"
              className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-border text-primary-text hover:bg-primary/10 transition-colors cursor-pointer"
            >
              Today
            </button>

            <button
              type="button"
              onClick={nextMonth}
              id="next-month-btn"
              aria-label="Next month"
              title="Next Month"
              className="p-1.5 rounded-lg border border-border text-foreground btn-premium cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Quick Year Jump Forward */}
            <button
              type="button"
              onClick={() => setCurrentDate(new Date(year + 1, month, 1))}
              aria-label="Next year"
              title="Next Year"
              className="px-2 py-1 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground btn-premium cursor-pointer font-mono font-medium"
            >
              +1Y
            </button>
          </div>
        </div>

        {/* Quick Year Picker Decade Popover Modal */}
        {showYearGrid && (
          <div className="mb-4 p-4 rounded-xl bg-card border border-primary/30 shadow-xl animate-scaleIn">
            <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold font-mono text-primary-text uppercase">
                  Select Year ({decadeStart} – {decadeStart + 9})
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setDecadeStart((d) => d - 10)}
                  className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Previous Decade"
                  aria-label="Previous decade"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const currentY = new Date().getFullYear();
                    setDecadeStart(Math.floor(currentY / 10) * 10);
                    setCurrentDate(new Date(currentY, month, 1));
                    setShowYearGrid(false);
                  }}
                  className="px-2 py-0.5 text-[11px] font-semibold rounded bg-muted hover:bg-muted/80 text-foreground cursor-pointer"
                >
                  Current Year
                </button>
                <button
                  type="button"
                  onClick={() => setDecadeStart((d) => d + 10)}
                  className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Next Decade"
                  aria-label="Next decade"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowYearGrid(false)}
                  className="text-xs px-2 py-0.5 ml-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                >
                  ✕ Close
                </button>
              </div>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {Array.from({ length: 12 }, (_, i) => decadeStart - 1 + i).map((y) => {
                const isSelected = y === year;
                const isCurrentYear = y === new Date().getFullYear();
                const isOutOfDecade = y < decadeStart || y > decadeStart + 9;

                return (
                  <button
                    key={y}
                    type="button"
                    onClick={() => {
                      setCurrentDate(new Date(y, month, 1));
                      setShowYearGrid(false);
                    }}
                    className={`py-2 px-1 text-xs rounded-lg font-mono font-semibold transition-all cursor-pointer text-center ${
                      isSelected
                        ? 'bg-primary-btn text-white shadow-sm ring-2 ring-primary/40'
                        : isCurrentYear
                        ? 'bg-primary/10 text-primary-text border border-primary/30 hover:bg-primary/20'
                        : isOutOfDecade
                        ? 'text-muted-foreground/50 hover:text-foreground hover:bg-muted'
                        : 'text-foreground hover:bg-muted border border-transparent hover:border-border'
                    }`}
                  >
                    {y}
                  </button>
                );
              })}
            </div>
          </div>
        )}

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
                type="button"
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
            type="button"
            onClick={() => onAddSummonForDate(selectedDateStr)}
            id="add-summon-for-date-btn"
            className="px-3 py-1.5 bg-primary-btn hover:bg-primary-hover text-white font-bold text-xs rounded-lg flex items-center gap-1.5 btn-premium shadow-sm cursor-pointer"
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
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectSummon(s);
                  }
                }}
                onClick={() => onSelectSummon(s)}
                className="p-3.5 bg-card border border-border rounded-xl cursor-pointer space-y-2 card-premium hover:border-[#60A5FA] hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-btn"
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
