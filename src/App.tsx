import React, { useState, useMemo } from 'react';
import {
  Plus,
  Loader2,
  Search,
  Filter,
  Calendar,
  ListFilter,
  FileText,
  ArrowUpDown,
  Sparkles,
  Shield,
  Users,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from './context/AuthContext';
import { useSummons } from './context/SummonContext';
import { useNotifications } from './context/NotificationContext';
import { Summon, SummonStatus } from './types';
import { TopNavBar } from './components/TopNavBar';
import { MetricCardsGrid } from './components/MetricCardsGrid';
import { SummonCard } from './components/SummonCard';
import { AddSummonModal } from './components/AddSummonModal';
import { SummonDetailModal } from './components/SummonDetailModal';
import { SplitScreenshotModal } from './components/SplitScreenshotModal';
import { HearingCalendarView } from './components/HearingCalendarView';
import { OfficerProfileModal } from './components/OfficerProfileModal';
import { AuthScreen } from './components/AuthScreen';
import { WelcomeAnimation } from './components/WelcomeAnimation';
import { WitnessDirectoryModal } from './components/WitnessDirectoryModal';
import { registerPushServiceWorker } from './services/fcmService';
import { auth } from './services/firebase';

export function App() {
  const { currentUser, isLoading: authLoading } = useAuth();
  const { summons, metrics, isLoading: summonsLoading } = useSummons();

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
  const [isWitnessDirOpen, setIsWitnessDirOpen] = useState(false);

  // Special Mac-inspired Welcome animation state
  const [postLoginStage, setPostLoginStage] = useState<'idle' | 'hello' | 'email' | 'hold' | 'exit' | 'dashboard'>(() => {
    return sessionStorage.getItem('summonsmitra_welcomed') ? 'dashboard' : 'idle';
  });

  // 1. Check and persist deep-link summon ID early if user accesses URL directly
  React.useEffect(() => {
    const pathMatch = window.location.pathname.match(/^\/summons\/([^/?#]+)/);
    const queryParamId = new URLSearchParams(window.location.search).get('summonId');
    const targetId = pathMatch ? pathMatch[1] : queryParamId;
    if (targetId) {
      sessionStorage.setItem('summonsmitra_pending_summon_id', targetId);
    }
  }, []);

  // 2. Register FCM & Web Push Service Worker on startup
  React.useEffect(() => {
    registerPushServiceWorker().catch(() => {});
  }, []);

  // 3. Resolve deep-linked summon after authentication (only once on initial mount/auth)
  const hasResolvedDeepLinkRef = React.useRef(false);

  React.useEffect(() => {
    if (!currentUser || summonsLoading || hasResolvedDeepLinkRef.current) return;

    const pendingId = sessionStorage.getItem('summonsmitra_pending_summon_id');
    const pathMatch = window.location.pathname.match(/^\/summons\/([^/?#]+)/);
    const queryParamId = new URLSearchParams(window.location.search).get('summonId');
    const targetId = pendingId || (pathMatch ? pathMatch[1] : queryParamId);

    if (targetId && !selectedSummon) {
      hasResolvedDeepLinkRef.current = true;
      sessionStorage.removeItem('summonsmitra_pending_summon_id');
      const match = summons.find((s) => s.id === targetId || (s as any)._id === targetId);
      if (match) {
        setSelectedSummon(match);
        setPostLoginStage('dashboard');
      } else {
        (async () => {
          try {
            const headers: Record<string, string> = {};
            if (auth.currentUser) {
              try {
                const token = await auth.currentUser.getIdToken();
                headers['Authorization'] = `Bearer ${token}`;
              } catch (_) {}
            }
            const res = await fetch(`/api/summons/${targetId}`, {
              credentials: 'include',
              headers,
            });
            if (res.ok) {
              const data = await res.json();
              setSelectedSummon(data);
              setPostLoginStage('dashboard');
            }
          } catch (err) {
            console.warn('[DeepLink] Error fetching summon by ID:', err);
          }
        })();
      }
    } else if (!targetId) {
      hasResolvedDeepLinkRef.current = true;
    }
  }, [currentUser, summonsLoading, summons]);

  // 4. Synchronize URL state when summon modal is opened or closed
  React.useEffect(() => {
    if (selectedSummon) {
      const targetPath = `/summons/${selectedSummon.id}`;
      if (window.location.pathname !== targetPath) {
        window.history.replaceState(null, '', targetPath);
      }
    } else {
      if (window.location.pathname.startsWith('/summons/')) {
        window.history.replaceState(null, '', '/');
      }
    }
  }, [selectedSummon]);

  const handleCloseSummonModal = () => {
    if (window.location.pathname.startsWith('/summons/')) {
      window.history.replaceState(null, '', '/');
    }
    setSelectedSummon(null);
  };

  // 5. Listen for service worker notification click events when browser window is already open
  React.useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleSwMessage = async (event: MessageEvent) => {
      if (event.data && event.data.type === 'FCM_NOTIFICATION_CLICK') {
        const sid = event.data.summonId;
        if (sid) {
          const match = summons.find((s) => s.id === sid || (s as any)._id === sid);
          if (match) {
            setSelectedSummon(match);
          } else if (currentUser) {
            try {
              const headers: Record<string, string> = {};
              if (auth.currentUser) {
                try {
                  const token = await auth.currentUser.getIdToken();
                  headers['Authorization'] = `Bearer ${token}`;
                } catch (_) {}
              }
              const res = await fetch(`/api/summons/${sid}`, {
                credentials: 'include',
                headers,
              });
              if (res.ok) {
                const data = await res.json();
                setSelectedSummon(data);
              }
            } catch (err) {
              console.warn('[SW Notification Click] Failed to retrieve summon:', err);
            }
          }
        }
      }
    };

    navigator.serviceWorker.addEventListener('message', handleSwMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleSwMessage);
    };
  }, [summons, currentUser]);

  React.useEffect(() => {
    if (currentUser && postLoginStage === 'idle') {
      setPostLoginStage('hello');
    }
  }, [currentUser, postLoginStage]);

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
            (s.summonNumber || '').toLowerCase().includes(q) ||
            (s.caseNumber || '').toLowerCase().includes(q) ||
            (s.personName || '').toLowerCase().includes(q) ||
            (s.address || '').toLowerCase().includes(q) ||
            (s.courtName || '').toLowerCase().includes(q) ||
            (s.policeStation || '').toLowerCase().includes(q);
          if (!match) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'hearingDate') {
          const timeA = a.hearingDate ? new Date(a.hearingDate).getTime() : 0;
          const timeB = b.hearingDate ? new Date(b.hearingDate).getTime() : 0;
          return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
        } else {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
        }
      });
  }, [summons, statusFilter, searchQuery, sortBy, sortOrder]);

  const { unreadCount } = useNotifications();

  // If not logged in, render the AuthScreen
  
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground text-sm font-medium tracking-wide">Restoring your data...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthScreen />;
  }

  if (summonsLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground text-sm font-medium tracking-wide">Loading your summons...</p>
      </div>
    );
  }


  const handleOpenAddForDate = (dateStr: string) => {
    setDefaultHearingDate(dateStr);
    setIsAddModalOpen(true);
  };


  const dashboardVariants: any = {
    hidden: { opacity: 0, y: 100 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { 
        duration: 0.8, 
        ease: [0.22, 1, 0.36, 1],
        when: "beforeChildren",
        staggerChildren: 0.08
      } 
    }
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
  };

  return (
    <>
      {postLoginStage !== 'dashboard' && currentUser && (
        <WelcomeAnimation 
          user={currentUser} 
          stage={postLoginStage}
          onStageChange={setPostLoginStage}
        />
      )}
      {postLoginStage === 'dashboard' && (
        <motion.div 
          initial="hidden" 
          animate="visible" 
          variants={dashboardVariants}
          className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary selection:text-white"
        >

      {/* Top Police Navigation Bar */}
      <motion.div variants={itemVariants} className="w-full relative z-30">
        <TopNavBar
          onOpenProfile={() => setIsProfileOpen(true)}
          onOpenWitnessDirectory={() => setIsWitnessDirOpen(true)}
          onSelectSummon={(sid) => {
            const s = summons.find(x => x.id === sid || (x as any)._id === sid);
            if (s) setSelectedSummon(s);
          }}
        />
      </motion.div>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Welcome & Command Header */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border rounded-2xl p-5 shadow-lg">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-warning">
                [COMMAND TERMINAL • {currentUser.rank.toUpperCase()}]
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              Welcome, {currentUser.displayName}
            </h1>
            <p className="text-xs text-muted-foreground">
              Jurisdiction: <span className="text-foreground font-medium">{currentUser.policeStation}</span> •{' '}
              {currentUser.district}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsWitnessDirOpen(true)}
              id="btn-witness-directory-header"
              title="Open Registered Witnesses and Contacts Directory"
              className="px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-card-hover text-foreground font-bold text-xs flex items-center gap-2 btn-premium shadow-sm cursor-pointer"
            >
              <Users className="w-4 h-4 text-primary-text" />
              <span>Witness Directory</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setDefaultHearingDate(undefined);
                setIsAddModalOpen(true);
              }}
              id="btn-add-summon-header"
              className="px-5 py-2.5 rounded-xl bg-primary-btn hover:bg-primary-hover text-white font-bold text-xs flex items-center gap-2 btn-premium shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Summon</span>
            </button>
          </div>
        </motion.div>

        {/* Dynamic Metric Statistics Grid */}
        <motion.div variants={itemVariants}>
          <MetricCardsGrid
            activeFilter={statusFilter}
            onSelectFilter={(f) => {
              setStatusFilter(f);
              if (activeTab === 'calendar') setActiveTab('docket');
            }}
          />
        </motion.div>

        {/* Primary View Switcher Tabs */}
        <motion.div variants={itemVariants} className="flex items-center justify-between border-b border-border pb-3 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('docket')}
              id="tab-docket-list"
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 btn-premium transition-all ${
                activeTab === 'docket'
                  ? 'bg-primary-btn text-white shadow-sm ring-2 ring-primary-btn/20'
                  : 'bg-card text-muted-foreground hover:text-foreground hover:bg-card-hover border border-border'
              }`}
            >
              <ListFilter className="w-4 h-4" />
              <span>Judicial Docket List ({filteredSummons.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('calendar')}
              id="tab-hearing-calendar"
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 btn-premium transition-all ${
                activeTab === 'calendar'
                  ? 'bg-primary-btn text-white shadow-sm ring-2 ring-primary-btn/20'
                  : 'bg-card text-muted-foreground hover:text-foreground hover:bg-card-hover border border-border'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Court Calendar</span>
            </button>
          </div>

          {activeTab === 'docket' && (
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-2 rounded-lg bg-card border border-border hover:bg-card-hover text-foreground flex items-center gap-1 shadow-sm cursor-pointer"
                title={`Sort order: ${sortOrder.toUpperCase()}`}
                aria-label={`Toggle sort order, currently ${sortOrder.toUpperCase()}`}
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-primary-text" />
                <span className="text-[11px] font-mono">{sortOrder.toUpperCase()}</span>
              </button>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                aria-label="Sort summons by"
                className="bg-card border border-border text-foreground text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-primary-btn focus:ring-2 focus:ring-primary-btn/20 shadow-sm transition-all"
              >
                <option value="hearingDate">Sort by Hearing Date</option>
                <option value="createdAt">Sort by Registered Date</option>
              </select>
            </div>
          )}
        </motion.div>

        {/* TAB 1: DOCKET LIST VIEW */}
        {activeTab === 'docket' && (
          <motion.div variants={itemVariants} className="space-y-4">
            {/* Search and Status Filter Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  id="search-summons-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Summon #, FIR, Person name, Address, Court or PS..."
                  className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary-btn focus:ring-2 focus:ring-primary-btn/20 shadow-sm transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search input"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Status Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {(['All', 'Pending', 'Upcoming', 'Completed'] as const).map((status) => (
                  <button
                    type="button"
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                      statusFilter === status
                        ? 'bg-primary-btn text-white font-bold shadow-sm'
                        : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-card-hover'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Summons List */}
            {filteredSummons.length === 0 ? (
              <div className="bg-card border border-border rounded-2xl p-10 sm:p-14 text-center space-y-4 shadow-inner">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-background border border-border flex items-center justify-center text-muted-foreground">
                  <FileText className="w-7 h-7" />
                </div>
                <div className="max-w-md mx-auto space-y-1.5">
                  <h3 className="text-base font-bold text-foreground">
                    {searchQuery || statusFilter !== 'All'
                      ? 'No Summons Match Your Filters'
                      : 'No Judicial Summons Registered'}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {searchQuery || statusFilter !== 'All'
                      ? 'Try adjusting your search terms or resetting the status filter.'
                      : 'Capture a court document with the camera, upload an image or PDF, and let AI OCR automatically extract the particulars.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDefaultHearingDate(undefined);
                    setIsAddModalOpen(true);
                  }}
                  id="btn-add-first-summon"
                  className="px-5 py-2.5 rounded-xl bg-primary-btn text-white hover:bg-primary-hover font-bold text-xs inline-flex items-center gap-2 shadow-lg transition-colors cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-warning" />
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
          </motion.div>
        )}

        {/* TAB 2: COURT CALENDAR VIEW */}
        {activeTab === 'calendar' && (
          <motion.div variants={itemVariants}><HearingCalendarView
            summons={summons}
            onSelectSummon={(s) => setSelectedSummon(s)}
            onAddSummonForDate={handleOpenAddForDate}
          /></motion.div>
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
        onClose={handleCloseSummonModal}
        onOpenSplitScreenshot={(s) => {
          handleCloseSummonModal();
          setSplitSummon(s);
        }}
      />

      {/* 3. Side-by-Side Visual Split Screenshot Modal */}
      <SplitScreenshotModal summon={splitSummon} onClose={() => setSplitSummon(null)} />

      {/* 4. Officer Profile & Telemetry Modal */}
      <OfficerProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />

      {/* 5. Witness & People Police Directory Modal */}
      <WitnessDirectoryModal
        isOpen={isWitnessDirOpen}
        onClose={() => setIsWitnessDirOpen(false)}
      />
                </motion.div>
      )}
    </>
  );
}
