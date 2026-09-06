import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Camera,
  Image as ImageIcon,
  FileText,
  Sparkles,
  QrCode,
  Check,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useSummons } from '../context/SummonContext';
import { useAuth } from '../context/AuthContext';
import { scanSummonDocument, parseJudicialQRCode } from '../utils/ocrService';
import { SummonStatus, SummonUrgency } from '../types';

interface AddSummonModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultHearingDate?: string;
}

export const AddSummonModal: React.FC<AddSummonModalProps> = ({
  isOpen,
  onClose,
  defaultHearingDate,
}) => {
  const { addSummon } = useSummons();
  const { currentUser } = useAuth();

  // Attachment state
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [attachmentType, setAttachmentType] = useState<'image' | 'pdf' | null>(null);
  const [fileName, setFileName] = useState<string>('');

  // Camera state
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // QR modal state
  const [isQrActive, setIsQrActive] = useState<boolean>(false);
  const [qrInput, setQrInput] = useState<string>('');

  // Scanning / OCR state
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [extractSuccess, setExtractSuccess] = useState<boolean>(false);

  // Form fields
  const [summonNumber, setSummonNumber] = useState('');
  const [caseNumber, setCaseNumber] = useState('');
  const [personName, setPersonName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [address, setAddress] = useState('');
  const [courtName, setCourtName] = useState('');
  const [courtAddress, setCourtAddress] = useState('');
  const [policeStation, setPoliceStation] = useState(currentUser?.policeStation || '');
  const [district, setDistrict] = useState(currentUser?.district || '');
  const [state, setState] = useState('Delhi NCT');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [hearingDate, setHearingDate] = useState(
    defaultHearingDate ||
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [issuingAuthority, setIssuingAuthority] = useState('');
  const [officerDetails, setOfficerDetails] = useState(
    currentUser ? `${currentUser.rank} ${currentUser.displayName}` : ''
  );
  const [offenseCharges, setOffenseCharges] = useState('');
  const [urgency, setUrgency] = useState<SummonUrgency>('Standard');
  const [status, setStatus] = useState<SummonStatus>('Pending');

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset or initialize on open
  useEffect(() => {
    if (isOpen) {
      if (defaultHearingDate) setHearingDate(defaultHearingDate);
      if (currentUser) {
        setPoliceStation(currentUser.policeStation || '');
        setDistrict(currentUser.district || '');
        setOfficerDetails(`${currentUser.rank} ${currentUser.displayName}`);
      }
    } else {
      stopCamera();
    }
  }, [isOpen, defaultHearingDate, currentUser]);

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Start live camera feed
  const handleStartCamera = async () => {
    setCameraError(null);
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 } },
      });
      streamRef.current = stream;
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.error('Camera access failed:', err);
      setCameraError('Camera access denied or unavailable on this device. Please upload an image.');
    }
  };

  // Capture frame from camera
  const handleCapturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 800;
    canvas.height = videoRef.current.videoHeight || 600;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setAttachmentPreview(dataUrl);
      setAttachmentType('image');
      setFileName(`Camera_Capture_${Date.now()}.jpg`);
      stopCamera();
      // Automatically trigger OCR extraction
      triggerOcrExtraction(dataUrl, 'image/jpeg');
    }
  };

  // Gallery image selection
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setAttachmentType('image');
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setAttachmentPreview(result);
      triggerOcrExtraction(result, file.type);
    };
    reader.readAsDataURL(file);
  };

  // PDF file upload
  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setAttachmentType('pdf');
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setAttachmentPreview(result);
      // Run extraction on PDF / preview
      triggerOcrExtraction(result, 'application/pdf');
    };
    reader.readAsDataURL(file);
  };

  // Trigger OCR extraction
  const triggerOcrExtraction = async (dataUrl: string, mime: string) => {
    setIsExtracting(true);
    setExtractSuccess(false);
    setFormError(null);

    try {
      const extracted = await scanSummonDocument(dataUrl, mime);
      if (extracted) {
        if (extracted.summonNumber) setSummonNumber(extracted.summonNumber);
        if (extracted.caseNumber) setCaseNumber(extracted.caseNumber);
        if (extracted.personName) setPersonName(extracted.personName);
        if (extracted.fatherName) setFatherName(extracted.fatherName);
        if (extracted.address) setAddress(extracted.address);
        if (extracted.courtName) setCourtName(extracted.courtName);
        if (extracted.courtAddress) setCourtAddress(extracted.courtAddress);
        if (extracted.policeStation) setPoliceStation(extracted.policeStation);
        if (extracted.district) setDistrict(extracted.district);
        if (extracted.state) setState(extracted.state);
        if (extracted.hearingDate) setHearingDate(extracted.hearingDate);
        if (extracted.issuingAuthority) setIssuingAuthority(extracted.issuingAuthority);
        if (extracted.officerDetails) setOfficerDetails(extracted.officerDetails);
        if (extracted.offenseCharges) setOffenseCharges(extracted.offenseCharges);
        if (extracted.urgency) setUrgency(extracted.urgency);
        setExtractSuccess(true);
      }
    } catch (err) {
      console.error('OCR Extraction failed:', err);
    } finally {
      setIsExtracting(false);
    }
  };

  // Apply parsed QR code
  const handleApplyQr = () => {
    if (!qrInput.trim()) return;
    const parsed = parseJudicialQRCode(qrInput.trim());
    if (parsed.summonNumber) setSummonNumber(parsed.summonNumber);
    if (parsed.caseNumber) setCaseNumber(parsed.caseNumber);
    if (parsed.personName) setPersonName(parsed.personName);
    if (parsed.address) setAddress(parsed.address);
    if (parsed.courtName) setCourtName(parsed.courtName);
    if (parsed.hearingDate) setHearingDate(parsed.hearingDate);
    setIsQrActive(false);
    setExtractSuccess(true);
  };

  // Save summon to database
  const handleSaveSummon = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!summonNumber.trim()) {
      setFormError('Summon Number is required');
      return;
    }
    if (!caseNumber.trim()) {
      setFormError('Case or FIR Number is required');
      return;
    }
    if (!personName.trim()) {
      setFormError('Respondent / Person Name is required');
      return;
    }
    if (!address.trim()) {
      setFormError('Complete Serving Address is required for police service');
      return;
    }
    if (!courtName.trim()) {
      setFormError('Court Name is required');
      return;
    }
    if (!hearingDate) {
      setFormError('Hearing Date is required');
      return;
    }

    setIsSubmitting(true);
    try {
      await addSummon({
        summonNumber: summonNumber.trim(),
        caseNumber: caseNumber.trim(),
        personName: personName.trim(),
        fatherName: fatherName.trim() || undefined,
        address: address.trim(),
        courtName: courtName.trim(),
        courtAddress: courtAddress.trim() || 'Court Complex',
        policeStation: policeStation.trim() || 'Headquarters',
        district: district.trim() || 'Central',
        state: state.trim() || 'NCT of Delhi',
        issueDate: issueDate || new Date().toISOString().split('T')[0],
        hearingDate,
        issuingAuthority: issuingAuthority.trim() || 'Judicial Magistrate',
        officerDetails: officerDetails.trim(),
        offenseCharges: offenseCharges.trim(),
        status,
        urgency,
        imageUrl: attachmentType === 'image' && attachmentPreview ? attachmentPreview : undefined,
        pdfUrl: attachmentType === 'pdf' && attachmentPreview ? attachmentPreview : undefined,
        fileName: fileName || undefined,
        reminderEnabled: true,
      });

      // Close modal
      stopCamera();
      onClose();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save summon');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#0B1326] border border-[#222A3D] rounded-2xl w-full max-w-3xl my-8 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-[#0A192F] border-b border-[#222A3D] px-6 py-4 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#1E3A5F] text-[#ADC8F5]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Add New Judicial Summon</h2>
              <p className="text-xs text-[#8F9097]">
                Scan document with AI OCR or enter warrant details manually
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            id="close-add-modal-btn"
            className="p-1.5 rounded-lg text-[#8F9097] hover:text-white hover:bg-[#1E293B] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {/* SECTION 1: SCAN & UPLOAD AREA */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#ADC8F5] uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[#FFB77D]" />
                1. Upload Document / AI OCR Scanner
              </label>
              {attachmentPreview && (
                <button
                  type="button"
                  onClick={() => triggerOcrExtraction(attachmentPreview, 'image/jpeg')}
                  disabled={isExtracting}
                  className="text-xs text-[#ADC8F5] hover:underline flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${isExtracting ? 'animate-spin' : ''}`} />
                  Re-scan Document
                </button>
              )}
            </div>

            {/* Upload Action Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {/* Take Photo */}
              <button
                type="button"
                id="btn-take-photo"
                onClick={handleStartCamera}
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-[#222A3D] bg-[#131B2E] hover:border-[#39475F] hover:bg-[#171F33] transition-all text-center group"
              >
                <div className="p-2 rounded-lg bg-[#1E293B] text-[#B9C7E4] group-hover:scale-110 transition-transform mb-1.5">
                  <Camera className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium text-white">Take Photo</span>
                <span className="text-[10px] text-[#8F9097]">Live Camera</span>
              </button>

              {/* Gallery Image */}
              <label
                htmlFor="gallery-input"
                id="btn-gallery-upload"
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-[#222A3D] bg-[#131B2E] hover:border-[#39475F] hover:bg-[#171F33] transition-all text-center cursor-pointer group"
              >
                <input
                  id="gallery-input"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <div className="p-2 rounded-lg bg-[#1E293B] text-[#B9C7E4] group-hover:scale-110 transition-transform mb-1.5">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium text-white">Gallery</span>
                <span className="text-[10px] text-[#8F9097]">JPG / PNG</span>
              </label>

              {/* Upload PDF */}
              <label
                htmlFor="pdf-input"
                id="btn-pdf-upload"
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-[#222A3D] bg-[#131B2E] hover:border-[#39475F] hover:bg-[#171F33] transition-all text-center cursor-pointer group"
              >
                <input
                  id="pdf-input"
                  type="file"
                  accept="application/pdf"
                  onChange={handlePdfUpload}
                  className="hidden"
                />
                <div className="p-2 rounded-lg bg-[#1E293B] text-[#B9C7E4] group-hover:scale-110 transition-transform mb-1.5">
                  <FileText className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium text-white">Upload PDF</span>
                <span className="text-[10px] text-[#8F9097]">Court Notice</span>
              </label>

              {/* AI OCR Scan */}
              <label
                htmlFor="ocr-file-input"
                id="btn-ai-ocr"
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-[#FFB77D]/40 bg-[#2B1300]/30 hover:bg-[#2B1300]/50 transition-all text-center cursor-pointer group"
              >
                <input
                  id="ocr-file-input"
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <div className="p-2 rounded-lg bg-[#4D2600] text-[#FFB77D] group-hover:scale-110 transition-transform mb-1.5">
                  <Sparkles className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-[#FFB77D]">AI OCR</span>
                <span className="text-[10px] text-[#C5C6CD]">Auto Extract</span>
              </label>

              {/* QR Scan */}
              <button
                type="button"
                id="btn-qr-scan"
                onClick={() => setIsQrActive(!isQrActive)}
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-[#222A3D] bg-[#131B2E] hover:border-[#39475F] hover:bg-[#171F33] transition-all text-center group col-span-2 sm:col-span-1"
              >
                <div className="p-2 rounded-lg bg-[#1E293B] text-[#B9C7E4] group-hover:scale-110 transition-transform mb-1.5">
                  <QrCode className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium text-white">QR / Barcode</span>
                <span className="text-[10px] text-[#8F9097]">e-Courts QR</span>
              </button>
            </div>

            {/* Live Camera Viewfinder */}
            {isCameraActive && (
              <div className="relative rounded-xl overflow-hidden border-2 border-[#3B82F6] bg-black">
                <video ref={videoRef} autoPlay playsInline className="w-full h-64 object-cover" />
                <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-white/50 m-6 rounded-lg flex items-center justify-center">
                  <span className="text-xs bg-black/60 text-white px-3 py-1 rounded font-mono">
                    Align Summon Document in frame
                  </span>
                </div>
                <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={handleCapturePhoto}
                    id="btn-capture-frame"
                    className="px-5 py-2 rounded-full bg-[#3B82F6] hover:bg-blue-600 text-white font-bold text-xs flex items-center gap-2 shadow-lg"
                  >
                    <Camera className="w-4 h-4" /> Capture & Extract
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="px-4 py-2 rounded-full bg-[#1E293B] hover:bg-[#334155] text-white text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {cameraError && (
              <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{cameraError}</span>
              </div>
            )}

            {/* QR Manual / Scanner Box */}
            {isQrActive && (
              <div className="p-4 bg-[#131B2E] border border-[#222A3D] rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#DAE2FD]">
                    Scan or Paste Judicial e-Courts Barcode Payload:
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsQrActive(false)}
                    className="text-xs text-[#8F9097] hover:text-white"
                  >
                    Close
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={qrInput}
                    onChange={(e) => setQrInput(e.target.value)}
                    placeholder="e.g. CNR: DLCT010045232025; FIR: 104/2025; Court: CMM Tis Hazari; Accused: Ramesh Kumar..."
                    className="flex-1 bg-[#0B1326] border border-[#222A3D] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ADC8F5]"
                  />
                  <button
                    type="button"
                    onClick={handleApplyQr}
                    className="px-4 py-2 bg-[#2F4A70] hover:bg-[#1E3A5F] text-white text-xs font-medium rounded-lg"
                  >
                    Apply QR
                  </button>
                </div>
              </div>
            )}

            {/* Extracting Indicator */}
            {isExtracting && (
              <div className="p-4 rounded-xl bg-[#2B1300]/40 border border-[#FFB77D]/60 flex items-center gap-3 animate-pulse">
                <Loader2 className="w-5 h-5 text-[#FFB77D] animate-spin shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-[#FFB77D] uppercase tracking-wider">
                    Extracting summon details…
                  </h4>
                  <p className="text-[11px] text-[#C5C6CD]">
                    AI neural engine is parsing case number, respondent name, address, and court date
                  </p>
                </div>
              </div>
            )}

            {/* Extraction Success Banner */}
            {extractSuccess && !isExtracting && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-700/60 rounded-xl text-xs text-emerald-300 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Document details auto-populated! Review and edit before saving.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setExtractSuccess(false)}
                  className="text-[10px] text-emerald-400 hover:underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Attachment Preview Box */}
            {attachmentPreview && !isCameraActive && (
              <div className="flex items-center gap-3 p-3 bg-[#131B2E] border border-[#222A3D] rounded-xl">
                {attachmentType === 'image' ? (
                  <img
                    src={attachmentPreview}
                    alt="Uploaded summon preview"
                    className="w-14 h-14 object-cover rounded-lg border border-[#39475F]"
                  />
                ) : (
                  <div className="w-14 h-14 bg-[#1E293B] rounded-lg border border-[#39475F] flex items-center justify-center text-[#B9C7E4]">
                    <FileText className="w-6 h-6" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono text-white truncate">
                    {fileName || 'Summon_Attachment'}
                  </p>
                  <p className="text-[11px] text-[#8F9097]">
                    Attachment preserved & associated with this summon file
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAttachmentPreview(null);
                    setAttachmentType(null);
                    setFileName('');
                  }}
                  className="text-xs text-red-400 hover:underline"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* SECTION 2: FORM DETAILS */}
          <form onSubmit={handleSaveSummon} className="space-y-4">
            <div className="border-t border-[#222A3D] pt-4">
              <label className="text-xs font-bold text-[#ADC8F5] uppercase tracking-wider block mb-3">
                2. Judicial Summon Particulars (Editable)
              </label>

              {formError && (
                <div className="mb-4 p-3 bg-red-950/40 border border-red-800 rounded-xl text-xs text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Summon Number */}
                <div>
                  <label className="text-xs font-medium text-[#8F9097] block mb-1">
                    Summon / Warrant Number <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    id="input-summon-number"
                    value={summonNumber}
                    onChange={(e) => setSummonNumber(e.target.value)}
                    placeholder="e.g. SUM/2026/0892"
                    className="w-full bg-[#131B2E] border border-[#222A3D] rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-[#ADC8F5]"
                    required
                  />
                </div>

                {/* Case / FIR Number */}
                <div>
                  <label className="text-xs font-medium text-[#8F9097] block mb-1">
                    Case / FIR / CNR Number <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    id="input-case-number"
                    value={caseNumber}
                    onChange={(e) => setCaseNumber(e.target.value)}
                    placeholder="e.g. FIR No. 142/2025"
                    className="w-full bg-[#131B2E] border border-[#222A3D] rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-[#ADC8F5]"
                    required
                  />
                </div>

                {/* Person Name */}
                <div>
                  <label className="text-xs font-medium text-[#8F9097] block mb-1">
                    Person / Respondent Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    id="input-person-name"
                    value={personName}
                    onChange={(e) => setPersonName(e.target.value)}
                    placeholder="Full legal name of person summoned"
                    className="w-full bg-[#131B2E] border border-[#222A3D] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#ADC8F5]"
                    required
                  />
                </div>

                {/* Father / Guardian Name */}
                <div>
                  <label className="text-xs font-medium text-[#8F9097] block mb-1">
                    Father / Guardian Name
                  </label>
                  <input
                    type="text"
                    id="input-father-name"
                    value={fatherName}
                    onChange={(e) => setFatherName(e.target.value)}
                    placeholder="Father or spouse name"
                    className="w-full bg-[#131B2E] border border-[#222A3D] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#ADC8F5]"
                  />
                </div>
              </div>

              {/* Complete Address (Prominent Field) */}
              <div className="mt-4">
                <label className="text-xs font-medium text-[#FFB77D] block mb-1 flex items-center justify-between">
                  <span>
                    Complete Residential / Serving Address <span className="text-red-400">*</span>
                  </span>
                  <span className="text-[10px] text-[#8F9097]">Crucial for field service</span>
                </label>
                <textarea
                  id="input-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={2}
                  placeholder="House/Flat No., Street, Mohalla, Near Landmark, Sector/Village, Pin Code"
                  className="w-full bg-[#131B2E] border border-[#39475F] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FFB77D]"
                  required
                />
              </div>

              {/* Police Station & District */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                <div>
                  <label className="text-xs font-medium text-[#8F9097] block mb-1">
                    Police Station
                  </label>
                  <input
                    type="text"
                    id="input-police-station"
                    value={policeStation}
                    onChange={(e) => setPoliceStation(e.target.value)}
                    placeholder="Jurisdiction PS"
                    className="w-full bg-[#131B2E] border border-[#222A3D] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#ADC8F5]"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-[#8F9097] block mb-1">District</label>
                  <input
                    type="text"
                    id="input-district"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder="District name"
                    className="w-full bg-[#131B2E] border border-[#222A3D] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#ADC8F5]"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-[#8F9097] block mb-1">State</label>
                  <input
                    type="text"
                    id="input-state"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="State"
                    className="w-full bg-[#131B2E] border border-[#222A3D] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#ADC8F5]"
                  />
                </div>
              </div>

              {/* Court Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="text-xs font-medium text-[#8F9097] block mb-1">
                    Court Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    id="input-court-name"
                    value={courtName}
                    onChange={(e) => setCourtName(e.target.value)}
                    placeholder="e.g. Chief Metropolitan Magistrate Court"
                    className="w-full bg-[#131B2E] border border-[#222A3D] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#ADC8F5]"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-[#8F9097] block mb-1">
                    Court Room / Address
                  </label>
                  <input
                    type="text"
                    id="input-court-address"
                    value={courtAddress}
                    onChange={(e) => setCourtAddress(e.target.value)}
                    placeholder="Room No. 14, Tis Hazari Complex"
                    className="w-full bg-[#131B2E] border border-[#222A3D] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#ADC8F5]"
                  />
                </div>
              </div>

              {/* Hearing & Issue Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="text-xs font-medium text-[#FFB77D] block mb-1">
                    Court Hearing Date <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    id="input-hearing-date"
                    value={hearingDate}
                    onChange={(e) => setHearingDate(e.target.value)}
                    className="w-full bg-[#131B2E] border border-[#FFB77D]/60 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-[#FFB77D]"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-[#8F9097] block mb-1">
                    Summon Issue Date
                  </label>
                  <input
                    type="date"
                    id="input-issue-date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full bg-[#131B2E] border border-[#222A3D] rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-[#ADC8F5]"
                  />
                </div>
              </div>

              {/* Authority & Charges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="text-xs font-medium text-[#8F9097] block mb-1">
                    Issuing Authority / Judge
                  </label>
                  <input
                    type="text"
                    id="input-issuing-authority"
                    value={issuingAuthority}
                    onChange={(e) => setIssuingAuthority(e.target.value)}
                    placeholder="e.g. Sh. A.K. Sharma, Judicial Magistrate"
                    className="w-full bg-[#131B2E] border border-[#222A3D] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#ADC8F5]"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-[#8F9097] block mb-1">
                    Offense / Legal Sections
                  </label>
                  <input
                    type="text"
                    id="input-offense-charges"
                    value={offenseCharges}
                    onChange={(e) => setOffenseCharges(e.target.value)}
                    placeholder="e.g. u/s 138 NI Act / 420 IPC"
                    className="w-full bg-[#131B2E] border border-[#222A3D] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#ADC8F5]"
                  />
                </div>
              </div>

              {/* Urgency & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="text-xs font-medium text-[#8F9097] block mb-1">
                    Priority / Urgency Level
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Standard', 'High', 'Urgent'] as SummonUrgency[]).map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setUrgency(level)}
                        className={`py-2 px-3 text-xs font-medium rounded-lg border transition-all ${
                          urgency === level
                            ? level === 'Urgent'
                              ? 'bg-red-950/80 border-red-500 text-red-300 font-bold'
                              : level === 'High'
                              ? 'bg-amber-950/80 border-amber-500 text-amber-300 font-bold'
                              : 'bg-[#1E3A5F] border-[#ADC8F5] text-white font-bold'
                            : 'bg-[#131B2E] border-[#222A3D] text-[#8F9097] hover:border-[#39475F]'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-[#8F9097] block mb-1">
                    Initial Status
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['Pending', 'Upcoming'] as SummonStatus[]).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setStatus(st)}
                        className={`py-2 px-3 text-xs font-medium rounded-lg border transition-all ${
                          status === st
                            ? 'bg-[#1E3A5F] border-[#ADC8F5] text-white font-bold'
                            : 'bg-[#131B2E] border-[#222A3D] text-[#8F9097] hover:border-[#39475F]'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="border-t border-[#222A3D] pt-4 flex items-center justify-end gap-3 sticky bottom-0 bg-[#0B1326] py-3">
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  onClose();
                }}
                className="px-4 py-2.5 rounded-xl border border-[#222A3D] hover:bg-[#1E293B] text-xs font-medium text-[#DAE2FD] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="btn-save-summon-submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-[#2F4A70] hover:bg-[#3B82F6] text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-colors disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving Summon...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" /> Save Summon
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
