import React, { useEffect, useState } from 'react';
import { OfficerUser } from '../types';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';

interface WelcomeAnimationProps {
  user: OfficerUser;
  stage: 'idle' | 'hello' | 'email' | 'hold' | 'exit' | 'dashboard';
  onStageChange: (
    stage: 'idle' | 'hello' | 'email' | 'hold' | 'exit' | 'dashboard'
  ) => void;
}

export const WelcomeAnimation: React.FC<WelcomeAnimationProps> = ({
  user,
  stage,
  onStageChange,
}) => {
  const email = user.email || 'officer@delhipolice.gov.in';
  const shouldReduceMotion = useReducedMotion();

  const [showGetStarted, setShowGetStarted] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  /*
   * Animation sequence progression:
   * 1. hello -> displays AI scanner + letter-by-letter HELLO
   * 2. email -> smoothly reveals authenticated user's email
   * 3. hold -> reveals tagline + prominent "Get Started →" button
   *
   * Note: The user MUST click "Get Started →" to proceed. There is NO auto-redirect.
   */
  useEffect(() => {
    if (stage === 'idle' || stage === 'dashboard') return;

    if (shouldReduceMotion) {
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
      const timer = setTimeout(() => {
        onStageChange('email');
      }, 1800);
      return () => clearTimeout(timer);
    }

    if (stage === 'email') {
      const timer = setTimeout(() => {
        onStageChange('hold');
      }, 1000);
      return () => clearTimeout(timer);
    }

    if (stage === 'hold') {
      const timer = setTimeout(() => {
        setShowGetStarted(true);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [stage, onStageChange, shouldReduceMotion]);

  const handleGetStarted = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (isStarting) return;

    setIsStarting(true);

    // Intentional tactile delay before exit transition
    setTimeout(() => {
      sessionStorage.setItem('summonsmitra_welcomed', 'true');
      onStageChange('exit');

      setTimeout(() => {
        onStageChange('dashboard');
      }, 650);
    }, 450);
  };

  const handleBackgroundClick = (e: React.MouseEvent) => {
    // Clicking the background must NOT skip or dismiss the welcome screen
    e.stopPropagation();
  };

  const letters = ['H', 'E', 'L', 'L', 'O'];

  const containerVariants: any = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.15,
      },
    },
  };

  const letterVariants: any = {
    hidden: {
      opacity: 0,
      filter: 'blur(12px)',
      y: 28,
      scale: 0.85,
    },
    visible: {
      opacity: 1,
      filter: 'blur(0px)',
      y: 0,
      scale: 1,
      transition: {
        duration: 0.75,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  const isVisible = stage !== 'idle' && stage !== 'dashboard';

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          key="welcome-screen"
          initial={{ opacity: 0 }}
          animate={{
            opacity: stage === 'exit' ? 0 : 1,
            scale: stage === 'exit' ? 1.04 : 1,
            filter: stage === 'exit' ? 'blur(8px)' : 'blur(0px)',
          }}
          exit={{
            opacity: 0,
            scale: 1.04,
            filter: 'blur(8px)',
          }}
          transition={{
            duration: 0.6,
            ease: 'easeInOut',
          }}
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-background selection:bg-transparent"
          onClick={handleBackgroundClick}
        >
          {/* =====================================================
              BACKGROUND AMBIENCE & PARTICLES
          ====================================================== */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Primary Ambient Glow */}
            {!shouldReduceMotion && (
              <motion.div
                animate={{
                  scale: [1, 1.15, 1],
                  opacity: [0.18, 0.28, 0.18],
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] rounded-full bg-primary/15 blur-[120px]"
              />
            )}

            {/* Subtle Floating Particles */}
            {!shouldReduceMotion &&
              [...Array(14)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 40 }}
                  animate={{
                    opacity: [0, 0.45, 0],
                    y: [40, -130],
                    x: [0, Math.sin(i * 2) * 35],
                  }}
                  transition={{
                    duration: 3.2 + (i % 3),
                    repeat: Infinity,
                    delay: i * 0.22,
                    ease: 'easeOut',
                  }}
                  className="absolute w-1 h-1 rounded-full bg-primary/70 left-1/2 top-1/2 pointer-events-none"
                  style={{
                    marginLeft: `${(i - 7) * 48}px`,
                    marginTop: `${(i % 5) * 36}px`,
                  }}
                />
              ))}
          </div>

          {/* =====================================================
              AI SUMMONS SCANNER DOCUMENT
          ====================================================== */}
          <div className="absolute left-1/2 top-[10%] sm:top-[13%] -translate-x-1/2 pointer-events-none">
            {/* Outer Rotating Dashed Ring */}
            {!shouldReduceMotion && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{
                  duration: 14,
                  repeat: Infinity,
                  ease: 'linear',
                }}
                className="absolute -inset-6 rounded-full border border-primary/15 border-dashed"
              />
            )}

            {/* Inner Counter-Rotating Ring */}
            {!shouldReduceMotion && (
              <motion.div
                animate={{ rotate: -360 }}
                transition={{
                  duration: 9,
                  repeat: Infinity,
                  ease: 'linear',
                }}
                className="absolute -inset-2.5 rounded-full border border-primary/25"
              />
            )}

            {/* Summons Document Card */}
            <motion.div
              animate={
                shouldReduceMotion
                  ? {}
                  : {
                      y: [0, -5, 0],
                    }
              }
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="relative w-20 h-24 sm:w-24 sm:h-28 rounded-xl border border-border bg-card/85 backdrop-blur-xl shadow-2xl p-3 flex flex-col justify-between overflow-hidden"
            >
              {/* Document Header Line */}
              <div className="flex items-center justify-between mb-2">
                <div className="h-1.5 w-7 rounded-full bg-primary/70" />
                <div className="h-1 w-3 rounded-full bg-muted-foreground/30" />
              </div>

              {/* Document Text Skeleton Lines */}
              <div className="space-y-1.5">
                <div className="h-1 w-full rounded-full bg-muted" />
                <div className="h-1 w-4/5 rounded-full bg-muted" />
                <div className="h-1 w-full rounded-full bg-muted" />
                <div className="h-1 w-3/5 rounded-full bg-muted" />
                <div className="h-1 w-2/3 rounded-full bg-muted/70" />
              </div>

              {/* Legal Seal Watermark */}
              <div className="mt-1 flex justify-end">
                <div className="w-3.5 h-3.5 rounded-full border border-primary/30 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                </div>
              </div>

              {/* AI Scanning Beam */}
              {!shouldReduceMotion && (
                <motion.div
                  animate={{
                    top: ['6%', '88%', '6%'],
                  }}
                  transition={{
                    duration: 2.2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className="absolute left-0 right-0 h-[2px] bg-primary shadow-[0_0_12px_hsl(var(--primary))]"
                />
              )}
            </motion.div>

            {/* AI Scan Badge */}
            <motion.div
              animate={
                shouldReduceMotion
                  ? {}
                  : {
                      scale: [1, 1.06, 1],
                    }
              }
              transition={{
                duration: 2.2,
                repeat: Infinity,
              }}
              className="absolute -right-8 -bottom-3 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/30 backdrop-blur-md text-[9px] font-bold tracking-[0.18em] text-primary flex items-center gap-1 shadow-sm"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              AI SCAN
            </motion.div>
          </div>

          {/* =====================================================
              MAIN WELCOME CONTENT
          ====================================================== */}
          <div className="relative z-20 w-full max-w-3xl px-5 flex flex-col items-center justify-center text-center mt-16 sm:mt-20">
            {/* Department Brand Sub-Header */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{
                opacity: stage !== 'hello' ? 0.8 : 0.6,
                y: 0,
              }}
              transition={{ duration: 0.8 }}
              className="mb-6 sm:mb-8 flex items-center gap-2 text-[10px] sm:text-xs font-semibold tracking-[0.28em] uppercase text-muted-foreground"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary))]" />
              SUMMONS MITRA • AI POWERED
            </motion.div>

            {/* =================================================
                HELLO - LETTER BY LETTER
            ================================================== */}
            {shouldReduceMotion ? (
              <div className="flex items-center justify-center gap-2 sm:gap-4">
                <span className="text-4xl sm:text-6xl md:text-8xl font-black tracking-[0.14em] text-foreground">
                  HELLO
                </span>
              </div>
            ) : (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="flex items-center justify-center gap-2 sm:gap-4"
              >
                {letters.map((letter, index) => (
                  <motion.span
                    key={`${letter}-${index}`}
                    variants={letterVariants}
                    className="text-4xl sm:text-6xl md:text-8xl font-black tracking-[0.12em] text-foreground drop-shadow-[0_0_25px_hsl(var(--primary)/0.15)]"
                  >
                    {letter}
                  </motion.span>
                ))}
              </motion.div>
            )}

            {/* =================================================
                AUTHENTICATED USER GMAIL ADDRESS
            ================================================== */}
            <AnimatePresence>
              {(stage === 'email' || stage === 'hold' || stage === 'exit') && (
                <motion.div
                  initial={{
                    opacity: 0,
                    y: 18,
                    filter: shouldReduceMotion ? 'none' : 'blur(8px)',
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    filter: 'blur(0px)',
                  }}
                  transition={{
                    duration: 0.8,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="mt-4 sm:mt-5 max-w-[90vw]"
                >
                  <p className="text-sm sm:text-base md:text-lg font-medium text-muted-foreground tracking-wider break-all sm:break-normal px-3 py-1 rounded-lg bg-muted/30 border border-border/50">
                    {email}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* =================================================
                TAGLINE
            ================================================== */}
            <AnimatePresence>
              {(stage === 'hold' || stage === 'exit') && (
                <motion.div
                  initial={{
                    opacity: 0,
                    y: 16,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    duration: 0.7,
                    delay: 0.15,
                  }}
                  className="mt-5 sm:mt-6"
                >
                  <p className="text-xs sm:text-sm md:text-base text-muted-foreground tracking-wide font-normal">
                    Your summons.{' '}
                    <span className="text-primary font-semibold">
                      Smarter.
                    </span>{' '}
                    Faster. Simpler.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* =================================================
                GET STARTED BUTTON
            ================================================== */}
            <AnimatePresence>
              {showGetStarted && (stage === 'hold' || stage === 'exit') && (
                <motion.div
                  initial={{
                    opacity: 0,
                    y: 22,
                    scale: 0.94,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: 1,
                  }}
                  exit={{
                    opacity: 0,
                    y: 10,
                    scale: 0.95,
                  }}
                  transition={{
                    duration: 0.65,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="mt-8 sm:mt-9 flex flex-col items-center"
                >
                  <motion.button
                    type="button"
                    id="welcome-get-started-btn"
                    onClick={handleGetStarted}
                    disabled={isStarting}
                    whileHover={
                      shouldReduceMotion
                        ? {}
                        : {
                            scale: 1.045,
                          }
                    }
                    whileTap={
                      shouldReduceMotion
                        ? {}
                        : {
                            scale: 0.96,
                          }
                    }
                    className="group relative overflow-hidden rounded-2xl px-8 sm:px-10 py-3.5 sm:py-4 bg-primary text-primary-foreground font-bold text-sm sm:text-base shadow-[0_0_35px_hsl(var(--primary)/0.25)] transition-shadow duration-300 hover:shadow-[0_0_55px_hsl(var(--primary)/0.45)] disabled:cursor-wait cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
                  >
                    {/* Moving Shine Animation Across Button */}
                    {!shouldReduceMotion && !isStarting && (
                      <motion.span
                        animate={{
                          x: ['-140%', '240%'],
                        }}
                        transition={{
                          duration: 2.4,
                          repeat: Infinity,
                          repeatDelay: 1.2,
                          ease: 'easeInOut',
                        }}
                        className="absolute inset-y-0 w-14 rotate-12 bg-white/25 blur-md pointer-events-none"
                      />
                    )}

                    {/* Button Label & Icon */}
                    <span className="relative z-10 flex items-center justify-center gap-2.5">
                      {isStarting ? (
                        <>
                          <motion.span
                            animate={{ rotate: 360 }}
                            transition={{
                              duration: 0.8,
                              repeat: Infinity,
                              ease: 'linear',
                            }}
                            className="h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent"
                          />
                          <span>Opening Summons Mitra...</span>
                        </>
                      ) : (
                        <>
                          <span>Get Started</span>
                          <motion.span
                            animate={
                              shouldReduceMotion
                                ? {}
                                : {
                                    x: [0, 4, 0],
                                  }
                            }
                            transition={{
                              duration: 1.4,
                              repeat: Infinity,
                              ease: 'easeInOut',
                            }}
                            className="text-base sm:text-lg inline-block"
                          >
                            →
                          </motion.span>
                        </>
                      )}
                    </span>
                  </motion.button>

                  {/* Operational Readiness Micro-Text */}
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.6 }}
                    transition={{
                      delay: 0.5,
                      duration: 0.5,
                    }}
                    className="mt-3 text-[10px] sm:text-xs text-muted-foreground font-medium"
                  >
                    AI-powered summons management
                  </motion.p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* =====================================================
              BOTTOM STATUS INDICATOR
          ====================================================== */}
          <AnimatePresence>
            {(stage === 'hold' || stage === 'exit') && (
              <motion.div
                initial={{
                  opacity: 0,
                  y: 12,
                }}
                animate={{
                  opacity: 0.6,
                  y: 0,
                }}
                className="absolute bottom-6 sm:bottom-7 left-1/2 -translate-x-1/2 flex items-center gap-2 text-[9px] sm:text-[10px] tracking-[0.22em] uppercase text-muted-foreground whitespace-nowrap pointer-events-none"
              >
                <motion.span
                  animate={
                    shouldReduceMotion
                      ? {}
                      : {
                          scale: [1, 1.4, 1],
                          opacity: [0.5, 1, 0.5],
                        }
                  }
                  transition={{
                    duration: 1.6,
                    repeat: Infinity,
                  }}
                  className="h-1.5 w-1.5 rounded-full bg-primary"
                />
                AI READY • SUMMONS SYSTEM ONLINE
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

