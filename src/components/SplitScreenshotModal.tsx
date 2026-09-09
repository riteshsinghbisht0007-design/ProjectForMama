import React, { useState, useEffect } from 'react';
import { X, Download, Share2, Copy, Check, Loader2, FileImage, FileText } from 'lucide-react';
import { Summon } from '../types';
import {
  generateSplitSummonCanvas,
  shareSummonNative,
  generateFormattedForwardText,
} from '../utils/shareService';
import { downloadSummonNoticePDF } from '../utils/pdfService';
import { useToast } from './Toast';

interface SplitScreenshotModalProps {
  summon: Summon | null;
  onClose: () => void;
}

export const SplitScreenshotModal: React.FC<SplitScreenshotModalProps> = ({
  summon,
  onClose,
}) => {
  const { addToast } = useToast();
  const [splitImageUrl, setSplitImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [sharing, setSharing] = useState<boolean>(false);

  useEffect(() => {
    if (!summon) {
      setSplitImageUrl(null);
      return;
    }

    let isMounted = true;
    setIsGenerating(true);

    generateSplitSummonCanvas(summon)
      .then((url) => {
        if (isMounted) {
          setSplitImageUrl(url);
          setIsGenerating(false);
        }
      })
      .catch((err) => {
        console.error('Failed to generate split screenshot:', err);
        if (isMounted) setIsGenerating(false);
      });

    return () => {
      isMounted = false;
    };
  }, [summon]);

  if (!summon) return null;

  const handleDownload = () => {
    if (!splitImageUrl) return;
    const a = document.createElement('a');
    a.href = splitImageUrl;
    a.download = `Summon_${summon.summonNumber.replace(/[^a-zA-Z0-9]/g, '_')}_Official_Copy.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    addToast('Summon composite image downloaded.', 'success');
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const filename = await downloadSummonNoticePDF(summon);
      addToast(`Official PDF saved: ${filename}`, 'success');
    } catch (err: any) {
      console.error('PDF generation error:', err);
      addToast('Failed to generate PDF legal notice. Please try again.', 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleShare = async () => {
    if (!splitImageUrl) return;
    setSharing(true);
    try {
      await shareSummonNative(summon, splitImageUrl);
    } finally {
      setSharing(false);
    }
  };

  const handleCopyText = async () => {
    const text = generateFormattedForwardText(summon);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      addToast('Formatted dispatch text copied to clipboard.', 'info');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#0B1326] border border-[#222A3D] rounded-2xl w-full max-w-4xl my-8 overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#0A192F] border-b border-[#222A3D] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#2F4A70] text-[#ADC8F5]">
              <FileImage className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Visual Split-Copy Generator</h2>
              <p className="text-xs text-[#8F9097]">
                One side: Document scan • Other side: Extracted judicial details & address
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            id="close-split-modal-btn"
            className="p-1.5 rounded-lg text-[#8F9097] hover:text-white hover:bg-[#1E293B] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Preview */}
        <div className="p-6 overflow-y-auto space-y-4">
          {isGenerating ? (
            <div className="h-96 flex flex-col items-center justify-center gap-3 border border-[#222A3D] rounded-xl bg-[#131B2E]">
              <Loader2 className="w-8 h-8 text-[#FFB77D] animate-spin" />
              <p className="text-sm font-medium text-[#DAE2FD]">
                Generating official side-by-side composite…
              </p>
              <p className="text-xs text-[#8F9097]">
                Rendering document scan with judicial particulars and address box
              </p>
            </div>
          ) : splitImageUrl ? (
            <div className="border border-[#39475F] rounded-xl overflow-hidden shadow-xl bg-[#0B1326]">
              <img
                src={splitImageUrl}
                alt="Summon side-by-side copy"
                className="w-full h-auto object-contain max-h-[60vh] mx-auto"
              />
            </div>
          ) : (
            <div className="p-8 text-center text-[#8F9097] border border-[#222A3D] rounded-xl">
              Failed to generate visual copy.
            </div>
          )}

          {/* Forward Text Preview */}
          <div className="p-3.5 bg-[#131B2E] border border-[#222A3D] rounded-xl text-xs text-[#DAE2FD] font-mono">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-[#ADC8F5]">Formatted Dispatch Text (For Field Officers / WhatsApp):</span>
              <button
                onClick={handleCopyText}
                className="text-xs text-[#FFB77D] hover:underline flex items-center gap-1"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied to Clipboard!' : 'Copy Text'}
              </button>
            </div>
            <div className="text-[11px] text-[#C5C6CD] whitespace-pre-wrap line-clamp-3">
              {generateFormattedForwardText(summon)}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-[#0A192F] border-t border-[#222A3D] px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-[#8F9097]">
            Summon Ref: <span className="font-mono text-white">{summon.summonNumber}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleCopyText}
              className="px-3.5 py-2 rounded-xl border border-[#222A3D] hover:bg-[#1E293B] text-xs font-medium text-[#DAE2FD] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy Text'}
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              id="download-pdf-modal-btn"
              className="px-3.5 py-2 rounded-xl bg-[#222A3D] hover:bg-[#2F4A70] text-[#ADC8F5] hover:text-white text-xs font-bold flex items-center gap-1.5 border border-[#39475F] transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin text-[#FFB77D]" /> : <FileText className="w-4 h-4 text-[#FFB77D]" />}
              <span>Download PDF</span>
            </button>

            <button
              onClick={handleDownload}
              disabled={!splitImageUrl || isGenerating}
              className="px-3.5 py-2 rounded-xl bg-[#1E3A5F] hover:bg-[#2F4A70] text-white text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-4 h-4" /> Download Image
            </button>

            <button
              onClick={handleShare}
              disabled={!splitImageUrl || isGenerating || sharing}
              className="px-4 py-2 rounded-xl bg-[#3B82F6] hover:bg-blue-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Share2 className="w-4 h-4" /> Forward & Share
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
