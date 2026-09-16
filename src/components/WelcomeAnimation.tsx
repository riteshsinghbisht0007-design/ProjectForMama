import React, { useEffect } from 'react';
import { OfficerUser } from '../types';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';

interface WelcomeAnimationProps {
  user: OfficerUser;
  stage: 'idle' | 'hello' | 'email' | 'hold' | 'exit' | 'dashboard';
  onStageChange: (stage: 'idle' | 'hello' | 'email' | 'hold' | 'exit' | 'dashboard') => void;
}

export const WelcomeAnimation: React.FC<WelcomeAnimationProps> = ({ user, stage, onStageChange }) => {
  const email = user.email || 'user@example.com';
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (stage === 'idle' || stage === 'dashboard') return;

    if (shouldReduceMotion) {
      if (stage === 'hello') {
        onStageChange('hold'); // skip directly to hold with both visible
        return;
      }
      if (stage === 'hold') {
        const t = setTimeout(() => onStageChange('exit'), 1500);
        return () => clearTimeout(t);
      }
      if (stage === 'exit') {
        const t = setTimeout(() => {
          sessionStorage.setItem('summonsmitra_welcomed', 'true');
          onStageChange('dashboard');
        }, 600);
        return () => clearTimeout(t);
      }
      return;
    }

    // Normal animation sequence
    if (stage === 'hello') {
      // H E L L O takes about 0.18 * 5 + 0.9 = 1.8s
      const t = setTimeout(() => onStageChange('email'), 1800);
      return () => clearTimeout(t);
    }
    
    if (stage === 'email') {
      // Email fades in over 0.9s
      const t = setTimeout(() => onStageChange('hold'), 900);
      return () => clearTimeout(t);
    }

    if (stage === 'hold') {
      // Hold for 1.2s to let user read
      const t = setTimeout(() => onStageChange('exit'), 1200);
      return () => clearTimeout(t);
    }

    if (stage === 'exit') {
      // Exit takes 0.6s
      const t = setTimeout(() => {
        sessionStorage.setItem('summonsmitra_welcomed', 'true');
        onStageChange('dashboard');
      }, 600);
      return () => clearTimeout(t);
    }

  }, [stage, onStageChange, shouldReduceMotion]);

  const handleSkip = () => {
    if (stage !== 'exit' && stage !== 'dashboard') {
      onStageChange('exit');
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.1,
      }
    }
  };

  const letterVariants = {
    hidden: { opacity: 0, filter: 'blur(6px)', y: 12, scale: 0.96 },
    visible: { 
      opacity: 1, 
      filter: 'blur(0px)', 
      y: 0, 
      scale: 1,
      transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } 
    }
  };

  const letters = ['H', 'E', 'L', 'L', 'O'];

  return (
    <AnimatePresence>
      {stage !== 'dashboard' && (
        <motion.div
          key="welcome-screen"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02, filter: 'blur(4px)' }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background overflow-hidden cursor-pointer selection:bg-transparent"
          onClick={handleSkip}
        >
          {/* Very Subtle Background Elements */}
          <div className="absolute inset-0 bg-background pointer-events-none"></div>

          <div className="relative z-10 w-full h-full flex flex-col items-center justify-center px-4">
            
            {/* HELLO Animation */}
            {shouldReduceMotion ? (
               <div className="flex space-x-2 sm:space-x-4 mb-2 sm:mb-4">
                  <span className="text-3xl sm:text-5xl md:text-7xl font-extrabold text-foreground tracking-[0.2em]">HELLO</span>
               </div>
            ) : (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate={(stage === 'hello' || stage === 'email' || stage === 'hold' || stage === 'exit') ? "visible" : "hidden"}
                className="flex space-x-2 sm:space-x-4 mb-2 sm:mb-4"
              >
                {letters.map((letter, i) => (
                  <motion.span
                    key={i}
                    variants={letterVariants}
                    className="text-3xl sm:text-5xl md:text-7xl font-extrabold text-foreground tracking-[0.2em]"
                  >
                    {letter}
                  </motion.span>
                ))}
              </motion.div>
            )}

            {/* Email Animation */}
            <AnimatePresence>
              {(stage === 'email' || stage === 'hold' || stage === 'exit' || (shouldReduceMotion && stage === 'hold')) && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                >
                  <h2 className="text-sm sm:text-base md:text-lg font-medium text-muted-foreground tracking-widest mt-4">
                    {email}
                  </h2>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
