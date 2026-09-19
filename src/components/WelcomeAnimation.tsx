import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { OfficerUser } from '../types';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';

export interface WelcomeAnimationProps {
  user: OfficerUser;
  stage: 'idle' | 'hello' | 'email' | 'hold' | 'exit' | 'dashboard';
  onStageChange: (
    stage: 'idle' | 'hello' | 'email' | 'hold' | 'exit' | 'dashboard'
  ) => void;
  scanState?: 'idle' | 'sending' | 'scanning' | 'stored';
  storedCount?: number;
}

// Calculate dynamic time-of-day local greeting for the officer
const getTimeGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return 'Good morning, Officer';
  } else if (hour >= 12 && hour < 17) {
    return 'Good afternoon, Officer';
  } else if (hour >= 17 && hour < 21) {
    return 'Good evening, Officer';
  } else {
    return 'Good night, Officer';
  }
};

export const WelcomeAnimation: React.FC<WelcomeAnimationProps> = ({
  user,
  stage,
  onStageChange,
}) => {
  // Existing email fallback logic preserved strictly
  const email = user.email || 'officer@delhipolice.gov.in';
  const shouldReduceMotion = useReducedMotion();

  // State behavior preserved
  const [showGetStarted, setShowGetStarted] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  // Progressive presentation sub-states during 'hello' stage
  const [showWelcomeBrand, setShowWelcomeBrand] = useState(false);
  const [showIllustration, setShowIllustration] = useState(false);
  const [illustrationPlaying, setIllustrationPlaying] = useState(false);

  // Replay count key to re-trigger summons animation on tap
  const [replayKey, setReplayKey] = useState(0);

  // CTA button hover state for coordinated fill wipe and plane flight
  const [isCtaHovered, setIsCtaHovered] = useState(false);

  // Timers tracking ref for comprehensive cleanup on unmount
  const timersRef = useRef<NodeJS.Timeout[]>([]);

  const addTimeout = useCallback((cb: () => void, ms: number) => {
    const id = setTimeout(cb, ms);
    timersRef.current.push(id);
    return id;
  }, []);

  const clearAllTimeouts = useCallback(() => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  }, []);

  // Time-based officer greeting computed once on mount
  const greeting = useMemo(() => getTimeGreeting(), []);

  /*
   * Progressive reveal sequence:
   * STEP 1: Greeting fades in (0ms)
   * STEP 2: "Welcome to Summons Mitra" fades in (+320ms)
   * STEP 3: Illustration enters (+800ms)
   * STEP 4: Summons animation plays (Court -> Paper -> Airplane -> Phone -> AI Scan) (+1100ms to 4100ms)
   * STEP 5 to 8: Stage moves to 'hold' -> Headline -> Subtext -> Signed-in pill -> CTA button
   */
  useEffect(() => {
    if (stage === 'idle' || stage === 'dashboard') return;

    if (shouldReduceMotion) {
      setShowWelcomeBrand(true);
      setShowIllustration(true);
      setIllustrationPlaying(true);
      if (stage === 'hello') {
        onStageChange('hold');
        return;
      }
      if (stage === 'hold') {
        setShowGetStarted(true);
      }
      return;
    }

    if (stage === 'hello') {
      // Step 2: reveal brand welcome shortly after greeting
      addTimeout(() => {
        setShowWelcomeBrand(true);
      }, 320);

      // Step 3: reveal summons illustration after both greeting lines
      addTimeout(() => {
        setShowIllustration(true);
      }, 820);

      // Step 4: start summons animation story
      addTimeout(() => {
        setIllustrationPlaying(true);
      }, 1100);

      // Transition to email/hold stage once summons animation finishes
      addTimeout(() => {
        onStageChange('email');
      }, 4300);
    }

    if (stage === 'email') {
      addTimeout(() => {
        onStageChange('hold');
      }, 600);
    }

    if (stage === 'hold') {
      // Reveal CTA button last after headline, subtext, and signed-in pill
      addTimeout(() => {
        setShowGetStarted(true);
      }, 700);
    }
  }, [stage, onStageChange, shouldReduceMotion, addTimeout]);

  // Clean up all pending timers on unmount
  useEffect(() => {
    return () => {
      clearAllTimeouts();
    };
  }, [clearAllTimeouts]);

  // Replay summons animation without navigation
  const handleReplay = useCallback(() => {
    setIllustrationPlaying(false);
    setReplayKey((k) => k + 1);
    addTimeout(() => {
      setIllustrationPlaying(true);
    }, 60);
  }, [addTimeout]);

  const handleIllustrationKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleReplay();
    }
  };

  // Get Started CTA Click: Exact existing duration (450ms launch delay + 650ms transition)
  const handleGetStarted = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (isStarting) return;

    setIsStarting(true);

    addTimeout(() => {
      sessionStorage.setItem('summonsmitra_welcomed', 'true');
      onStageChange('exit');

      addTimeout(() => {
        onStageChange('dashboard');
      }, 650);
    }, 450);
  };

  const isVisible = stage !== 'idle' && stage !== 'dashboard';
  const isHoldOrBeyond = stage === 'hold' || stage === 'exit';
  const isExiting = stage === 'exit';

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          key="welcome-screen"
          initial={{ opacity: 0 }}
          animate={{
            opacity: isExiting ? 0 : 1,
            y: isExiting ? 24 : 0,
          }}
          exit={{
            opacity: 0,
            y: 24,
          }}
          transition={{
            duration: 0.65,
            ease: 'easeInOut',
          }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-start overflow-y-auto overflow-x-hidden bg-[#0A1330] text-[#EAF0FB] selection:bg-transparent px-4 py-8 sm:py-12"
          style={{
            fontFamily: "'Manrope', Inter, system-ui, sans-serif",
          }}
        >
          {/* Constrained Mobile-First Container (max-w 420px) */}
          <div className="w-full max-w-[420px] flex flex-col items-start text-left">
            {/* =====================================================
                STEP 1 & STEP 2: SEQUENTIAL TIME-BASED GREETING & BRAND
            ====================================================== */}
            <div className="w-full mb-4">
              {/* STEP 1: Time-based greeting appears first */}
              <motion.p
                initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: shouldReduceMotion ? 0.2 : 0.6,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="text-xs sm:text-sm font-medium text-[#6FA8FF] tracking-wide"
              >
                {greeting}
              </motion.p>

              {/* STEP 2: After greeting settles, reveal Welcome to Summons Mitra */}
              <AnimatePresence>
                {(shouldReduceMotion || showWelcomeBrand) && (
                  <motion.h2
                    initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: shouldReduceMotion ? 0.2 : 0.65,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="text-base sm:text-lg font-semibold text-[#B9C6E0] mt-0.5"
                  >
                    Welcome to Summons Mitra
                  </motion.h2>
                )}
              </AnimatePresence>
            </div>

            {/* =====================================================
                STEP 3 & STEP 4: SUMMONS STORY ILLUSTRATION
                (COURT → PAPER FOLDS → AIRPLANE → PHONE → AI SCAN)
            ====================================================== */}
            <AnimatePresence>
              {(shouldReduceMotion || showIllustration) && (
                <motion.div
                  initial={{
                    opacity: 0,
                    scale: shouldReduceMotion ? 1 : 0.97,
                    y: shouldReduceMotion ? 0 : 12,
                  }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    y: 0,
                  }}
                  transition={{
                    duration: shouldReduceMotion ? 0.2 : 0.65,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  whileHover={
                    shouldReduceMotion
                      ? {}
                      : {
                          y: -2,
                          boxShadow: '0 8px 30px rgba(111, 168, 255, 0.12)',
                        }
                  }
                  role="button"
                  tabIndex={0}
                  aria-label="Replay summons animation"
                  onClick={handleReplay}
                  onKeyDown={handleIllustrationKeyDown}
                  className="group relative w-full rounded-2xl bg-[#131F45] border border-[#22367A] hover:border-[#6FA8FF]/60 focus:border-[#6FA8FF] p-3 sm:p-4 my-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#6FA8FF] focus:ring-offset-2 focus:ring-offset-[#0A1330] transition-colors"
                >
                  <svg
                    key={`summons-svg-${replayKey}`}
                    viewBox="0 0 380 200"
                    className="w-full h-auto overflow-visible select-none"
                  >
                    <defs>
                      {/* Sky-Blue Flight Trail Gradient */}
                      <linearGradient id="flight-trail-grad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#6FA8FF" stopOpacity="0.1" />
                        <stop offset="100%" stopColor="#6FA8FF" stopOpacity="0.9" />
                      </linearGradient>

                      {/* AI Scan Precision Beam Gradient */}
                      <linearGradient id="scan-line-grad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#6FA8FF" stopOpacity="0" />
                        <stop offset="25%" stopColor="#6FA8FF" stopOpacity="0.6" />
                        <stop offset="50%" stopColor="#FFFFFF" stopOpacity="1" />
                        <stop offset="75%" stopColor="#6FA8FF" stopOpacity="0.6" />
                        <stop offset="100%" stopColor="#6FA8FF" stopOpacity="0" />
                      </linearGradient>
                    </defs>

                    {/* -------------------------------------------------
                        1. COURT OUTLINE (Architectural Line Art)
                    -------------------------------------------------- */}
                    <g opacity="0.85">
                      {/* Pediment Roof */}
                      <path
                        d="M 22 76 L 68 48 L 114 76 Z"
                        fill="none"
                        stroke="#6FA8FF"
                        strokeWidth="1.6"
                        strokeLinejoin="round"
                      />
                      {/* Scales Emblem */}
                      <circle cx="68" cy="65" r="3.5" fill="none" stroke="#6FA8FF" strokeWidth="1.2" />
                      <line x1="68" y1="61.5" x2="68" y2="71" stroke="#6FA8FF" strokeWidth="1.2" />
                      <line x1="62" y1="66" x2="74" y2="66" stroke="#6FA8FF" strokeWidth="1.2" />

                      {/* Architrave */}
                      <line x1="18" y1="78" x2="118" y2="78" stroke="#6FA8FF" strokeWidth="1.8" />

                      {/* 4 Classical Pillars */}
                      <rect x="29" y="80" width="8.5" height="48" rx="1.5" fill="none" stroke="#6FA8FF" strokeWidth="1.3" />
                      <rect x="50" y="80" width="8.5" height="48" rx="1.5" fill="none" stroke="#6FA8FF" strokeWidth="1.3" />
                      <rect x="71" y="80" width="8.5" height="48" rx="1.5" fill="none" stroke="#6FA8FF" strokeWidth="1.3" />
                      <rect x="92" y="80" width="8.5" height="48" rx="1.5" fill="none" stroke="#6FA8FF" strokeWidth="1.3" />

                      {/* Plinth Steps */}
                      <rect x="20" y="130" width="96" height="6" rx="1.5" fill="none" stroke="#6FA8FF" strokeWidth="1.5" />
                      <rect x="14" y="138" width="108" height="7" rx="2" fill="none" stroke="#6FA8FF" strokeWidth="1.5" />

                      {/* Court Tag */}
                      <text
                        x="68"
                        y="158"
                        fill="#B9C6E0"
                        fontSize="8.5"
                        fontWeight="600"
                        textAnchor="middle"
                        letterSpacing="0.6"
                      >
                        COURT
                      </text>
                    </g>

                    {/* -------------------------------------------------
                        2. FLIGHT TRAIL (Smooth Bezier Curved Arc)
                    -------------------------------------------------- */}
                    <motion.path
                      d="M 68 80 C 125 12, 195 18, 276 88"
                      fill="none"
                      stroke="url(#flight-trail-grad)"
                      strokeWidth="1.4"
                      strokeDasharray="3 3"
                      initial={{ pathLength: shouldReduceMotion ? 1 : 0, opacity: shouldReduceMotion ? 0.7 : 0 }}
                      animate={
                        shouldReduceMotion
                          ? { pathLength: 1, opacity: 0.7 }
                          : illustrationPlaying
                          ? { pathLength: 1, opacity: 0.85 }
                          : { pathLength: 0, opacity: 0 }
                      }
                      transition={{ duration: 1.1, delay: 0.4, ease: 'easeOut' }}
                    />

                    {/* -------------------------------------------------
                        3. SUMMONS PAPER RISING & FOLDING INTO AIRPLANE
                    -------------------------------------------------- */}
                    {!shouldReduceMotion && (
                      <>
                        {/* Summons Sheet rising from Court Area */}
                        <motion.g
                          initial={{ opacity: 0, y: 20, scale: 0.7 }}
                          animate={
                            illustrationPlaying
                              ? {
                                  opacity: [0, 1, 1, 0],
                                  y: [20, -6, -14, -22],
                                  scale: [0.7, 1, 0.85, 0.4],
                                }
                              : { opacity: 0 }
                          }
                          transition={{
                            duration: 0.7,
                            times: [0, 0.35, 0.75, 1],
                            ease: 'easeInOut',
                          }}
                          style={{ transformOrigin: '68px 80px' }}
                        >
                          <rect
                            x="48"
                            y="56"
                            width="40"
                            height="30"
                            rx="3"
                            fill="#EAF0FB"
                            stroke="#B9C6E0"
                            strokeWidth="1.2"
                          />
                          <line x1="54" y1="64" x2="82" y2="64" stroke="#2F6FE0" strokeWidth="1.5" />
                          <line x1="54" y1="70" x2="76" y2="70" stroke="#B9C6E0" strokeWidth="1.2" />
                          <line x1="54" y1="76" x2="72" y2="76" stroke="#B9C6E0" strokeWidth="1.2" />
                        </motion.g>

                        {/* Paper Airplane Flying on Bezier Path */}
                        <motion.g
                          initial={{ opacity: 0 }}
                          animate={
                            illustrationPlaying
                              ? {
                                  x: [68, 125, 195, 276],
                                  y: [80, 18, 24, 88],
                                  rotate: [-28, -8, 14, 6],
                                  opacity: [0, 1, 1, 0],
                                }
                              : { opacity: 0 }
                          }
                          transition={{
                            duration: 1.15,
                            delay: 0.45,
                            times: [0, 0.3, 0.75, 1],
                            ease: 'easeInOut',
                          }}
                        >
                          <polygon
                            points="0,0 -16,-5.5 -10,0 -16,5.5"
                            fill="#EAF0FB"
                            stroke="#6FA8FF"
                            strokeWidth="1.1"
                            className="drop-shadow-md"
                          />
                          <line x1="-16" y1="0" x2="0" y2="0" stroke="#6FA8FF" strokeWidth="0.8" />
                        </motion.g>
                      </>
                    )}

                    {/* -------------------------------------------------
                        4. OFFICER PHONE & UNFOLDED DOCUMENT (Right Side)
                    -------------------------------------------------- */}
                    <g>
                      {/* Phone Body */}
                      <rect
                        x="236"
                        y="28"
                        width="106"
                        height="150"
                        rx="18"
                        fill="#131F45"
                        stroke="#22367A"
                        strokeWidth="1.8"
                        className="drop-shadow-lg"
                      />

                      {/* Speaker Bar */}
                      <rect x="274" y="36" width="30" height="3" rx="1.5" fill="#22367A" />

                      {/* Screen Area */}
                      <rect x="242" y="44" width="94" height="122" rx="10" fill="#0A1330" />

                      {/* Officer Label */}
                      <text
                        x="289"
                        y="190"
                        fill="#B9C6E0"
                        fontSize="8.5"
                        fontWeight="600"
                        textAnchor="middle"
                        letterSpacing="0.6"
                      >
                        OFFICER
                      </text>

                      {/* Document Card inside Phone */}
                      <motion.g
                        initial={{
                          opacity: shouldReduceMotion ? 1 : 0,
                          scale: shouldReduceMotion ? 1 : 0.65,
                        }}
                        animate={
                          shouldReduceMotion || isHoldOrBeyond || illustrationPlaying
                            ? {
                                opacity: 1,
                                scale: 1,
                              }
                            : { opacity: 0, scale: 0.65 }
                        }
                        transition={{
                          duration: 0.5,
                          delay: shouldReduceMotion ? 0 : 1.4,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        style={{ transformOrigin: '289px 105px' }}
                      >
                        {/* Clean Document Card Paper */}
                        <rect
                          x="248"
                          y="52"
                          width="82"
                          height="104"
                          rx="6"
                          fill="#EAF0FB"
                          stroke="#B9C6E0"
                          strokeWidth="1"
                        />

                        {/* Document Header */}
                        <text
                          x="254"
                          y="64"
                          fill="#0A1330"
                          fontSize="7"
                          fontWeight="800"
                          letterSpacing="0.8"
                        >
                          SUMMONS
                        </text>

                        {/* Clean Document Case Lines */}
                        <line x1="254" y1="71" x2="318" y2="71" stroke="#2F6FE0" strokeWidth="1.5" />
                        <line x1="254" y1="77" x2="310" y2="77" stroke="#B9C6E0" strokeWidth="1.2" />
                        <line x1="254" y1="83" x2="300" y2="83" stroke="#B9C6E0" strokeWidth="1.2" />
                        <line x1="254" y1="89" x2="314" y2="89" stroke="#B9C6E0" strokeWidth="1.2" />

                        {/* Structured Notice Lines */}
                        <rect x="254" y="96" width="70" height="24" rx="4" fill="#D7E5FF" />
                        <line x1="259" y1="104" x2="313" y2="104" stroke="#2F6FE0" strokeWidth="1.5" />
                        <line x1="259" y1="111" x2="298" y2="111" stroke="#2F6FE0" strokeWidth="1.2" />

                        {/* Lower Case Details */}
                        <line x1="254" y1="128" x2="304" y2="128" stroke="#B9C6E0" strokeWidth="1.2" />
                        <line x1="254" y1="134" x2="292" y2="134" stroke="#B9C6E0" strokeWidth="1.2" />
                        <line x1="254" y1="140" x2="312" y2="140" stroke="#B9C6E0" strokeWidth="1.2" />

                        {/* Verified Check Badge */}
                        <circle cx="314" cy="142" r="5" fill="#6FA8FF" />
                        <path
                          d="M 312 142 L 313.5 143.5 L 316.5 140.5"
                          fill="none"
                          stroke="#0A1330"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />

                        {/* ---------------------------------------------
                            AI SCAN LINE (Precision Sweeping Beam)
                        ---------------------------------------------- */}
                        {!shouldReduceMotion && (
                          <motion.line
                            x1="248"
                            y1="54"
                            x2="330"
                            y2="54"
                            stroke="url(#scan-line-grad)"
                            strokeWidth="2.5"
                            initial={{ opacity: 0 }}
                            animate={
                              illustrationPlaying
                                ? {
                                    y1: [54, 150],
                                    y2: [54, 150],
                                    opacity: [0, 1, 1, 0],
                                  }
                                : { opacity: 0 }
                            }
                            transition={{
                              duration: 0.8,
                              delay: 1.55,
                              ease: 'easeInOut',
                            }}
                          />
                        )}
                      </motion.g>
                    </g>
                  </svg>

                  {/* Replay Micro-Prompt */}
                  <div className="w-full text-right mt-0.5">
                    <span className="text-[10px] text-[#B9C6E0]/60 group-hover:text-[#6FA8FF] transition-colors">
                      Tap to replay animation
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* =====================================================
                STEP 5 TO STEP 8: HEADLINE, SUBTEXT, PILL, CTA
            ====================================================== */}
            <div className="w-full mt-3 flex flex-col items-start text-left">
              {/* STEP 5: Headline (Only reveals after summons animation finishes) */}
              <AnimatePresence>
                {(shouldReduceMotion || isHoldOrBeyond) && (
                  <motion.h1
                    initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: shouldReduceMotion ? 0.2 : 0.6,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="text-2xl sm:text-3xl font-bold tracking-tight text-[#EAF0FB]"
                    style={{ fontFamily: "'Fraunces', Georgia, serif" }}
                  >
                    Your summons, sorted.
                  </motion.h1>
                )}
              </AnimatePresence>

              {/* STEP 6: Subtext (Reveals after headline) */}
              <AnimatePresence>
                {(shouldReduceMotion || isHoldOrBeyond) && (
                  <motion.p
                    initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: shouldReduceMotion ? 0.2 : 0.55,
                      delay: shouldReduceMotion ? 0 : 0.14,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="mt-2 text-xs sm:text-sm text-[#B9C6E0] leading-relaxed max-w-sm"
                  >
                    Scan any court notice. Mitra reads the dates, sets your reminders and keeps every case in one place.
                  </motion.p>
                )}
              </AnimatePresence>

              {/* STEP 7: Signed-in User Pill (Reveals after subtext) */}
              <AnimatePresence>
                {(shouldReduceMotion || isHoldOrBeyond) && (
                  <motion.div
                    initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: shouldReduceMotion ? 0.2 : 0.5,
                      delay: shouldReduceMotion ? 0 : 0.26,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="group mt-3.5 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#131F45] border border-[#22367A] hover:border-[#6FA8FF] focus-within:border-[#6FA8FF] transition-all duration-300 text-xs text-[#B9C6E0] max-w-full hover:shadow-[0_0_16px_rgba(111,168,255,0.18)]"
                  >
                    {/* Status Dot */}
                    <span
                      className={`w-1.5 h-1.5 rounded-full bg-[#6FA8FF] transition-transform duration-300 group-hover:scale-125 ${
                        shouldReduceMotion ? '' : 'animate-pulse'
                      }`}
                    />
                    <span className="text-[#EAF0FB] font-medium">Signed in as</span>
                    <span className="text-[#6FA8FF] font-semibold truncate max-w-[210px]">
                      {email}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* STEP 8: Get Started CTA Button (Enters last) */}
              <AnimatePresence>
                {(shouldReduceMotion || showGetStarted || isHoldOrBeyond) && (
                  <motion.div
                    initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: shouldReduceMotion ? 0.2 : 0.55,
                      delay: shouldReduceMotion ? 0 : 0.38,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="mt-6 w-full"
                  >
                    <motion.button
                      type="button"
                      id="welcome-get-started-cta"
                      onClick={handleGetStarted}
                      disabled={isStarting}
                      onMouseEnter={() => setIsCtaHovered(true)}
                      onMouseLeave={() => setIsCtaHovered(false)}
                      whileHover={
                        shouldReduceMotion
                          ? {}
                          : {
                              y: -2,
                            }
                      }
                      whileTap={
                        shouldReduceMotion
                          ? {}
                          : {
                              scale: 0.98,
                            }
                          }
                      className="group relative overflow-hidden rounded-[14px] w-full min-h-[52px] px-6 py-3.5 bg-[#EAF0FB] text-[#0A1330] font-semibold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-sm transition-all duration-300 hover:shadow-[0_6px_24px_rgba(111,168,255,0.35)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#6FA8FF] focus-visible:outline-offset-4 disabled:cursor-wait cursor-pointer"
                    >
                      {/* Sky-Blue Fill Wipe from LEFT → RIGHT */}
                      {!shouldReduceMotion && (
                        <motion.span
                          className="absolute inset-0 bg-[#6FA8FF] pointer-events-none rounded-[14px]"
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: isCtaHovered && !isStarting ? 1 : 0 }}
                          transition={{
                            duration: 0.38,
                            ease: [0.2, 0.8, 0.2, 1],
                          }}
                          style={{ transformOrigin: 'left' }}
                        />
                      )}

                      {/* Button Label & Animated Paper Plane SVG */}
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        {isStarting ? (
                          <>
                            <motion.span
                              animate={{ rotate: 360 }}
                              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                              className="h-4 w-4 rounded-full border-2 border-[#0A1330] border-t-transparent inline-block"
                            />
                            <span>Opening Summons Mitra...</span>
                          </>
                        ) : (
                          <>
                            <span>Get Started</span>
                            {/* Inline Paper Plane SVG Icon */}
                            <motion.span
                              animate={
                                isStarting
                                  ? {
                                      x: 34,
                                      y: -16,
                                      opacity: 0,
                                    }
                                  : isCtaHovered && !shouldReduceMotion
                                  ? {
                                      x: 5,
                                      y: -3,
                                      rotate: -12,
                                    }
                                  : {
                                      x: 0,
                                      y: 0,
                                      rotate: 0,
                                    }
                              }
                              transition={{
                                duration: isStarting ? 0.4 : 0.3,
                                ease: 'easeOut',
                              }}
                              className="inline-flex items-center"
                            >
                              <svg
                                width="17"
                                height="17"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="inline-block"
                              >
                                <path d="M22 2L11 13" />
                                <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                              </svg>
                            </motion.span>
                          </>
                        )}
                      </span>
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
