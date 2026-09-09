import React, { useState, useEffect } from 'react';
import { Shield, Sparkles, ArrowRight } from 'lucide-react';
import { OfficerUser } from '../types';

interface WelcomeAnimationProps {
  user: OfficerUser;
  onComplete: () => void;
}

export const WelcomeAnimation: React.FC<WelcomeAnimationProps> = ({ user, onComplete }) => {
  const [typedWord, setTypedWord] = useState('');
  const [showPersonalized, setShowPersonalized] = useState(false);
  const [showSubtitle, setShowSubtitle] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  // Derive respectful, authentic officer name
  const officerName = user.displayName?.trim() || user.email?.split('@')[0] || 'Officer';

  useEffect(() => {
    const letters = ['H', 'HE', 'HEL', 'HELL', 'HELLO'];
    let letterIndex = 0;

    // 1. Reveal "HELLO" letter-by-letter
    const letterTimer = setInterval(() => {
      if (letterIndex < letters.length) {
        setTypedWord(letters[letterIndex]);
        letterIndex++;
      } else {
        clearInterval(letterTimer);

        // 2. Transition to "Hello, [User Name]"
        setTimeout(() => {
          setShowPersonalized(true);
        }, 500);

        // 3. Reveal command subtitle
        setTimeout(() => {
          setShowSubtitle(true);
        }, 1100);

        // 4. Fade out and enter dashboard
        setTimeout(() => {
          setIsExiting(true);
          setTimeout(() => {
            onComplete();
          }, 600);
        }, 3200);
      }
    }, 180);

    return () => {
      clearInterval(letterTimer);
    };
  }, [onComplete]);

  const handleSkip = () => {
    setIsExiting(true);
    setTimeout(() => {
      onComplete();
    }, 300);
  };

  return (
    <div
      onClick={handleSkip}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0B1326] transition-opacity duration-700 cursor-pointer select-none ${
        isExiting ? 'opacity-0 scale-105' : 'opacity-100 scale-100'
      }`}
    >
      {/* Ambient background glow */}
      <div className="absolute w-96 h-96 rounded-full bg-[#1E3A5F]/20 blur-3xl pointer-events-none -top-20 -left-20 animate-pulse" />
      <div className="absolute w-[30rem] h-[30rem] rounded-full bg-[#FFB77D]/10 blur-3xl pointer-events-none -bottom-20 -right-20 animate-pulse" />

      {/* Center Container */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-xl px-6 space-y-6">
        {/* Animated Police Crest Emblem */}
        <div className="relative">
          <div className="absolute inset-0 rounded-3xl bg-[#2F4A70] blur-xl opacity-60 animate-ping" />
          <div className="relative w-20 h-20 rounded-2xl bg-[#131B2E] border-2 border-[#39475F] shadow-2xl flex items-center justify-center text-[#FFB77D]">
            <Shield className="w-10 h-10 drop-shadow-[0_0_12px_rgba(255,183,125,0.5)]" />
          </div>
        </div>

        {/* Hello Word Letter Reveal / Personalized Greeting */}
        <div className="min-h-[5rem] flex items-center justify-center">
          {!showPersonalized ? (
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white via-[#DAE2FD] to-[#ADC8F5] font-mono">
              {typedWord}
              <span className="inline-block w-1.5 h-10 ml-1 bg-[#FFB77D] animate-blink align-middle" />
            </h1>
          ) : (
            <div className="space-y-1 animate-fadeIn">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight">
                Hello,{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFB77D] to-[#FDBA74]">
                  {officerName}
                </span>
              </h1>
            </div>
          )}
        </div>

        {/* Command Details Subtitle */}
        <div
          className={`space-y-2 transition-all duration-700 ${
            showSubtitle ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          }`}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#131B2E] border border-[#222A3D] text-xs font-mono text-[#ADC8F5]">
            <Sparkles className="w-3.5 h-3.5 text-[#FFB77D]" />
            <span>SUMMONS MITRA • COMMAND TERMINAL ACTIVE</span>
          </div>

          <p className="text-xs text-[#8F9097] max-w-md mx-auto">
            {user.rank} • {user.policeStation} • {user.district}
          </p>

          {/* Micro loader progress */}
          <div className="w-48 h-1 bg-[#1E293B] rounded-full mx-auto overflow-hidden mt-4">
            <div className="h-full bg-gradient-to-r from-[#2F4A70] to-[#FFB77D] rounded-full animate-indeterminate" />
          </div>
        </div>

        {/* Skip button / prompt */}
        <div className="pt-6">
          <button
            onClick={handleSkip}
            className="text-xs text-[#8F9097] hover:text-white flex items-center gap-1 mx-auto transition-colors cursor-pointer"
          >
            <span>Click anywhere to enter dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
