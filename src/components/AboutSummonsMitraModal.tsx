import React, { useEffect } from 'react';
import {
  X,
  FileText,
  Scan,
  Scale,
  QrCode,
  Brain,
  Save,
  ShieldCheck,
  AlertTriangle,
  Heart,
  CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SummonsMitraLogo } from './SummonsMitraLogo';

interface AboutSummonsMitraModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutSummonsMitraModal: React.FC<AboutSummonsMitraModalProps> = ({
  isOpen,
  onClose,
}) => {
  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const extractedFields = [
    'CNR',
    'Case Number',
    'Court',
    'District',
    'State',
    'FIR Number',
    'Police Station',
    'Hearing Date',
    'Parties',
    'Sections',
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="about-summonsmitra-title"
        >
          {/* Backdrop with smooth blur and click-outside dismissal */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
            aria-hidden="true"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl bg-card border border-border text-foreground rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10"
          >
            {/* Header with gradient badge and close button */}
            <div className="relative px-5 sm:px-7 pt-6 pb-4 border-b border-border bg-gradient-to-b from-primary-muted/20 to-transparent flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <SummonsMitraLogo className="w-12 h-12 sm:w-14 sm:h-14" />
                <div>
                  <div className="flex items-center gap-2">
                    <h2
                      id="about-summonsmitra-title"
                      className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-mono"
                    >
                      SummonsMitra
                    </h2>
                    <span className="px-2 py-0.5 text-[10px] font-mono uppercase bg-sky-100 dark:bg-sky-950/70 border border-sky-300 dark:border-sky-800 text-sky-800 dark:text-sky-300 rounded font-semibold">
                      v1.0.0
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-primary-text mt-0.5">
                    Your Smart Legal Document Companion
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                id="close-about-modal-btn"
                aria-label="Close About SummonsMitra dialog"
                className="p-2 rounded-xl bg-background/80 hover:bg-muted border border-border text-muted-foreground hover:text-foreground transition-all duration-150 cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="px-5 sm:px-7 py-5 overflow-y-auto space-y-6 text-sm leading-relaxed">
              {/* Core Description */}
              <div className="p-4 rounded-xl bg-background border border-border text-muted-foreground leading-relaxed">
                <p className="text-foreground font-medium text-xs sm:text-sm">
                  SummonsMitra is a legal-tech application designed to help users scan, understand, organize and manage information from legal documents and court summons.
                </p>
              </div>

              {/* Key Features Section */}
              <div className="space-y-3">
                <h3 className="text-xs font-mono uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-2">
                  <span>Core Capabilities & Features</span>
                  <span className="h-px flex-1 bg-border" />
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* 1. Smart Document Scanning */}
                  <div className="p-3.5 rounded-xl bg-background border border-border space-y-1 hover:border-primary-text/40 transition-colors">
                    <div className="flex items-center gap-2 text-foreground font-semibold text-xs sm:text-sm">
                      <div className="p-1.5 rounded-lg bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
                        <FileText className="w-4 h-4" />
                      </div>
                      <span>📄 Smart Document Scanning</span>
                    </div>
                    <p className="text-xs text-muted-foreground pl-8">
                      Scan court summons and documents using camera or uploaded files.
                    </p>
                  </div>

                  {/* 2. AI-Powered OCR */}
                  <div className="p-3.5 rounded-xl bg-background border border-border space-y-1 hover:border-primary-text/40 transition-colors">
                    <div className="flex items-center gap-2 text-foreground font-semibold text-xs sm:text-sm">
                      <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                        <Scan className="w-4 h-4" />
                      </div>
                      <span>🔍 AI-Powered OCR</span>
                    </div>
                    <p className="text-xs text-muted-foreground pl-8">
                      Extract readable information from scanned legal documents.
                    </p>
                  </div>

                  {/* 3. e-Courts Assistance */}
                  <div className="p-3.5 rounded-xl bg-background border border-border space-y-1 hover:border-primary-text/40 transition-colors">
                    <div className="flex items-center gap-2 text-foreground font-semibold text-xs sm:text-sm">
                      <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                        <Scale className="w-4 h-4" />
                      </div>
                      <span>⚖️ e-Courts Assistance</span>
                    </div>
                    <p className="text-xs text-muted-foreground pl-8">
                      Use available case identifiers such as CNR and case numbers to assist with finding official case information.
                    </p>
                  </div>

                  {/* 4. Judicial QR Scanner */}
                  <div className="p-3.5 rounded-xl bg-background border border-border space-y-1 hover:border-primary-text/40 transition-colors">
                    <div className="flex items-center gap-2 text-foreground font-semibold text-xs sm:text-sm">
                      <div className="p-1.5 rounded-lg bg-cyan-100 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400">
                        <QrCode className="w-4 h-4" />
                      </div>
                      <span>📱 Judicial QR Scanner</span>
                    </div>
                    <p className="text-xs text-muted-foreground pl-8">
                      Scan Judicial/e-Courts QR codes and extract available case references.
                    </p>
                  </div>

                  {/* 5. Review & Save */}
                  <div className="p-3.5 rounded-xl bg-background border border-border space-y-1 hover:border-primary-text/40 transition-colors">
                    <div className="flex items-center gap-2 text-foreground font-semibold text-xs sm:text-sm">
                      <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                        <Save className="w-4 h-4" />
                      </div>
                      <span>💾 Review & Save</span>
                    </div>
                    <p className="text-xs text-muted-foreground pl-8">
                      Always allow the user to review extracted information before saving it.
                    </p>
                  </div>

                  {/* 6. Secure & Private */}
                  <div className="p-3.5 rounded-xl bg-background border border-border space-y-1 hover:border-primary-text/40 transition-colors">
                    <div className="flex items-center gap-2 text-foreground font-semibold text-xs sm:text-sm">
                      <div className="p-1.5 rounded-lg bg-teal-100 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <span>🔐 Secure & Private</span>
                    </div>
                    <p className="text-xs text-muted-foreground pl-8">
                      Keep authentication, database access and backend credentials secure.
                    </p>
                  </div>
                </div>

                {/* Intelligent Information Extraction */}
                <div className="p-4 rounded-xl bg-background border border-border space-y-2.5">
                  <div className="flex items-center gap-2 text-foreground font-semibold text-xs sm:text-sm">
                    <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
                      <Brain className="w-4 h-4" />
                    </div>
                    <span>🧠 Intelligent Information Extraction</span>
                  </div>
                  <p className="text-xs text-muted-foreground pl-8 mb-2">
                    Extracts relevant fields directly from warrants, notices, and summons:
                  </p>
                  <div className="pl-8 flex flex-wrap gap-1.5">
                    {extractedFields.map((field) => (
                      <span
                        key={field}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium bg-card border border-border text-foreground shadow-2xs"
                      >
                        <CheckCircle2 className="w-3 h-3 text-primary-text shrink-0" />
                        <span>{field}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Disclaimer Notice */}
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>DISCLAIMER</span>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  SummonsMitra is an informational and document-management tool. Information obtained from external or official sources should be independently verified. SummonsMitra does not provide legal advice and does not replace official court records or a qualified legal professional.
                </p>
              </div>
            </div>

            {/* Footer with App Version & Heart Credit */}
            <div className="px-5 sm:px-7 py-3.5 border-t border-border bg-card flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span>Version:</span>
                <span className="font-mono font-semibold text-foreground">1.0.0</span>
              </div>
              <div className="flex items-center gap-1 text-foreground font-medium">
                <span>Built with</span>
                <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
                <span>for simpler legal information.</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
