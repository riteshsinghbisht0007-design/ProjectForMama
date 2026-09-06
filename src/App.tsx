import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Filter,
  Calendar,
  ListFilter,
  FileText,
  AlertTriangle,
  ArrowUpDown,
  Sparkles,
  Shield,
} from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { useSummons } from './context/SummonContext';
import { Summon, SummonStatus } from './types';
import { TopNavBar } from './components/TopNavBar';
import { MetricCardsGrid } from './components/MetricCardsGrid';
import { SummonCard } from './components/SummonCard';
import { AddSummonModal } from './components/AddSummonModal';
import { SummonDetailModal } from './components/SummonDetailModal';
import { SplitScreenshotModal } from './components/SplitScreenshotModal';
import { HearingCalendarView } from './components/HearingCalendarView';
import { OfficerProfileModal } from './components/OfficerProfileModal';
import { UrgentAlertsModal } from './components/UrgentAlertsModal';
import { AuthScreen } from './components/AuthScreen';

export function App() {
  const { currentUser } = useAuth();
  const { summons, metrics } = useSummons();

  // Navigation tab: 'docket' or 'calendar'
  const [activeTab, setActiveTab] = useState<'docket' | 'calendar'>('docket');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | SummonStatus>('All');
  const [sortBy, setSortBy] = useState<'hearingDate' | 'createdAt'>('hearingDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [defaultHearingDate, setDefaultHearingDate] = useState<string | undefined>(undefined);
  const [selectedSummon, setSelectedSummon] = useState<Summon | null>(null);
  const [splitSummon, setSplitSummon] = useState<Summon | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);

  // Filtered & Sorted Summons
  const filteredSummons = useMemo(() => {
    return summons
      .filter((s) => {
        // Status filter
        if (statusFilter !== 'All' && s.status !== statusFilter) return false;

        // Search query (case, summon, person, address, court, station)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const match =
            s.summonNumber.toLowerCase().includes(q) ||
            s.caseNumber.toLowerCase().includes(q) ||
            s.personName.toLowerCase().includes(q) ||
            s.address.toLowerCase().includes(q) ||
            s.courtName.toLowerCase().includes(q) ||
            s.policeStation.toLowerCase().includes(q);
          if (!match) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'hearingDate') {
          const timeA = new Date(a.hearingDate).getTime();
          const timeB = new Date(b.hearingDate).getTime();
          return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
        } else {
          const timeA = new Date(a.createdAt).getTime();
          const timeB = new Date(b.createdAt).getTime();
          return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
        }
      });
  }, [summons, statusFilter, searchQuery, sortBy, sortOrder]);

  // Urgent hearings count
  const today = new Date().toISOString().split('T')[0];
  const urgentCount = summons.filter((s) => {
    if (s.status === 'Completed') return false;
    const diff = Math.ceil(
      (new Date(s.hearingDate).getTime() - new Date(today).getTime()) / (1000 * 3600 * 24)
    );
    return diff <= 2;
  }).length;

  // If not logged in, render the AuthScreen
  if (!currentUser) {
    return <AuthScreen />;
  }

  const handleOpenAddForDate = (dateStr: string) => {
    setDefaultHearingDate(dateStr);
    setIsAddModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#0B1326] text-[#DAE2FD] flex flex-col selection:bg-[#2F4A70] selection:text-white">
      {/* Top Police Navigation Bar */}
      <TopNavBar
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenAlerts={() => setIsAlertsOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Welcome & Command Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#131B2E] border border-[#222A3D] rounded-2xl p-5 shadow-lg">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-[#FFB77D]">
                [COMMAND TERMINAL • {currentUser.rank.toUpperCase()}]
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Welcome, {currentUser.displayName}
            </h1>
            <p className="text-xs text-[#8F9097]">
              Jurisdiction: <span className="text-[#DAE2FD] font-medium">{currentUser.policeStation}</span> •{' '}
              {currentUser.district}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {urgentCount > 0 && (
              <button
                onClick={() => setIsAlertsOpen(true)}
                className="px-3.5 py-2.5 rounded-xl bg-red-950/70 border border-red-800 text-red-300 hover:bg-red-900/80 text-xs font-bold flex items-center gap-2 transition-colors animate-pulse"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>{urgentCount} Court Hearing Alert(s)</span>
              </button>
            )}

            <button
              onClick={() => {
                setDefaultHearingDate(undefined);
                setIsAddModalOpen(true);
              }}
              id="btn-add-summon-header"
              className="px-5 py-2.5 rounded-xl bg-[#2F4A70] hover:bg-[#3B82F6] text-white font-bold text-xs flex items-center gap-2 shadow-lg hover:shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Summon</span>
            </button>
          </div>
        </div>

        {/* Dynamic Metric Statistics Grid */}
        <MetricCardsGrid
          activeFilter={statusFilter}
          onSelectFilter={(f) => {
            setStatusFilter(f);
            if (activeTab === 'calendar') setActiveTab('docket');
          }}
        />

        {/* Primary View Switcher Tabs */}
        <div className="flex items-center justify-between border-b border-[#222A3D] pb-3 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('docket')}
              id="tab-docket-list"
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeTab === 'docket'
                  ? 'bg-[#1E3A5F] text-white border border-[#ADC8F5]'
                  : 'bg-[#131B2E] text-[#8F9097] hover:text-white border border-[#222A3D]'
              }`}
            >
              <ListFilter className="w-4 h-4" />
              <span>Judicial Docket List ({filteredSummons.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('calendar')}
              id="tab-hearing-calendar"
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeTab === 'calendar'
                  ? 'bg-[#1E3A5F] text-white border border-[#ADC8F5]'
                  : 'bg-[#131B2E] text-[#8F9097] hover:text-white border border-[#222A3D]'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Court Calendar</span>
            </button>
          </div>

          {activeTab === 'docket' && (
            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-2 rounded-lg bg-[#131B2E] border border-[#222A3D] hover:bg-[#171F33] text-[#DAE2FD] flex items-center gap-1"
                title={`Sort order: ${sortOrder.toUpperCase()}`}
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span className="text-[11px] font-mono">{sortOrder.toUpperCase()}</span>
              </button>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-[#131B2E] border border-[#222A3D] text-[#DAE2FD] text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#ADC8F5]"
              >
                <option value="hearingDate">Sort by Hearing Date</option>
                <option value="createdAt">Sort by Registered Date</option>
              </select>
            </div>
          )}
        </div>

        {/* TAB 1: DOCKET LIST VIEW */}
        {activeTab === 'docket' && (
          <div className="space-y-4">
            {/* Search and Status Filter Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#8F9097] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  id="search-summons-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Summon #, FIR, Person name, Address, Court or PS..."
                  className="w-full bg-[#131B2E] border border-[#222A3D] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-[#8F9097] focus:outline-none focus:border-[#ADC8F5]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8F9097] hover:text-white"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Status Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {(['All', 'Pending', 'Upcoming', 'Completed'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                      statusFilter === status
                        ? 'bg-[#2F4A70] text-white font-bold'
                        : 'bg-[#131B2E] border border-[#222A3D] text-[#8F9097] hover:text-white'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Summons List */}
            {filteredSummons.length === 0 ? (
              <div className="bg-[#131B2E] border border-[#222A3D] rounded-2xl p-10 sm:p-14 text-center space-y-4 shadow-inner">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-[#0B1326] border border-[#222A3D] flex items-center justify-center text-[#8F9097]">
                  <FileText className="w-7 h-7" />
                </div>
                <div className="max-w-md mx-auto space-y-1.5">
                  <h3 className="text-base font-bold text-white">
                    {searchQuery || statusFilter !== 'All'
                      ? 'No Summons Match Your Filters'
                      : 'No Judicial Summons Registered'}
                  </h3>
                  <p className="text-xs text-[#8F9097] leading-relaxed">
                    {searchQuery || statusFilter !== 'All'
                      ? 'Try adjusting your search terms or resetting the status filter.'
                      : 'Capture a court document with the camera, upload an image or PDF, and let AI OCR automatically extract the particulars.'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setDefaultHearingDate(undefined);
                    setIsAddModalOpen(true);
                  }}
                  id="btn-add-first-summon"
                  className="px-5 py-2.5 rounded-xl bg-[#2F4A70] hover:bg-[#3B82F6] text-white font-bold text-xs inline-flex items-center gap-2 shadow-lg transition-colors"
                >
                  <Sparkles className="w-4 h-4 text-[#FFB77D]" />
                  <span>Scan or Add New Summon</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredSummons.map((summon) => (
                  <SummonCard
                    key={summon.id}
                    summon={summon}
                    onSelect={(s) => setSelectedSummon(s)}
                    onOpenSplitScreenshot={(s) => setSplitSummon(s)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: COURT CALENDAR VIEW */}
        {activeTab === 'calendar' && (
          <HearingCalendarView
            summons={summons}
            onSelectSummon={(s) => setSelectedSummon(s)}
            onAddSummonForDate={handleOpenAddForDate}
          />
        )}
      </main>

      {/* MODALS */}
      {/* 1. Add Summon Modal (Camera, Gallery, PDF, AI OCR, QR) */}
      <AddSummonModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        defaultHearingDate={defaultHearingDate}
      />

      {/* 2. Summon Detail Modal (Inspect, Edit, Mark Served, Forward) */}
      <SummonDetailModal
        summon={selectedSummon}
        onClose={() => setSelectedSummon(null)}
        onOpenSplitScreenshot={(s) => {
          setSelectedSummon(null);
          setSplitSummon(s);
        }}
      />

      {/* 3. Side-by-Side Visual Split Screenshot Modal */}
      <SplitScreenshotModal summon={splitSummon} onClose={() => setSplitSummon(null)} />

      {/* 4. Officer Profile & Telemetry Modal */}
      <OfficerProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />

      {/* 5. Urgent Hearing Alerts Drawer / Modal */}
      <UrgentAlertsModal
        isOpen={isAlertsOpen}
        onClose={() => setIsAlertsOpen(false)}
        summons={summons}
        onSelectSummon={(s) => setSelectedSummon(s)}
      />
    </div>
  );
}
