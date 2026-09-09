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
  Edit3,
  Calendar,
  MapPin,
  Building2,
  Shield,
  Upload,
  ArrowRight,
  ArrowLeft,
  Eye,
  CheckCircle2,
  UserCheck,
  Plus,
} from 'lucide-react';
import jsQR from 'jsqr';
import { useSummons } from '../context/SummonContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import { scanSummonDocument, parseJudicialQRCode, ExtractedSummonData } from '../utils/ocrService';
import { SummonStatus, SummonUrgency, WitnessPerson } from '../types';
import { SelectPersonModal } from './SelectPersonModal';

interface AddSummonModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultHearingDate?: string;
}

type WorkflowStep = 'upload' | 'processing' | 'review';

export const AddSummonModal: React.FC<AddSummonModalProps> = ({
  isOpen,
  onClose,
  defaultHearingDate,
}) => {
  const { addSummon } = useSummons();
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  // Workflow step
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('upload');

  // Attachment state
  const [rawFile, setRawFile] = useState<File | null>(null);
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
  const [qrScanningLive, setQrScanningLive] = useState<boolean>(false);
  const [qrCameraError, setQrCameraError] = useState<string | null>(null);
  const [qrInput, setQrInput] = useState<string>('');
  const qrVideoRef = useRef<HTMLVideoElement | null>(null);
  const qrStreamRef = useRef<MediaStream | null>(null);
  const qrAnimIdRef = useRef<number | null>(null);

  // Person selection modal states
  const [isSelectPersonOpen, setIsSelectPersonOpen] = useState(false);
  const [isAddPersonDirectOpen, setIsAddPersonDirectOpen] = useState(false);

  // OCR state & field telemetry
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [extractStatusText, setExtractStatusText] = useState<string>('');
  const [detectedFields, setDetectedFields] = useState<Set<string>>(new Set());
  const [ocrMessage, setOcrMessage] = useState<string | null>(null);
  const [ocrSuccess, setOcrSuccess] = useState<boolean>(false);

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
      setCurrentStep('upload');
      setFormError(null);
      setOcrMessage(null);
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
      setCameraError('Camera access unavailable or blocked. Please select an image from your gallery.');
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
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      const captureName = `Camera_Capture_${Date.now()}.jpg`;

      // Convert dataUrl to a blob file
      fetch(dataUrl)
        .then((res) => res.blob())
        .then((blob) => {
          const file = new File([blob], captureName, { type: 'image/jpeg' });
          setRawFile(file);
        });

      setAttachmentPreview(dataUrl);
      setAttachmentType('image');
      setFileName(captureName);
      stopCamera();
      triggerOcrPipeline(dataUrl, 'image/jpeg');
    }
  };

  // Gallery image selection
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRawFile(file);
    setFileName(file.name);
    setAttachmentType('image');

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setAttachmentPreview(result);
      triggerOcrPipeline(result, file.type || 'image/jpeg');
    };
    reader.readAsDataURL(file);
  };

  // PDF file upload
  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRawFile(file);
    setFileName(file.name);
    setAttachmentType('pdf');

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setAttachmentPreview(result);
      triggerOcrPipeline(result, 'application/pdf');
    };
    reader.readAsDataURL(file);
  };

  // Trigger AI OCR extraction pipeline with visual phases
  const triggerOcrPipeline = async (dataUrl: string, mime: string) => {
    setCurrentStep('processing');
    setIsExtracting(true);
    setOcrSuccess(false);
    setOcrMessage(null);
    setExtractStatusText('Transmitting document to legal AI scanner...');

    const timer1 = setTimeout(() => {
      setExtractStatusText('Analyzing legal sections, court bench, and FIR details...');
    }, 900);

    const timer2 = setTimeout(() => {
      setExtractStatusText('Extracting respondent name, address, and appearance schedule...');
    }, 1800);

    try {
      const result = await scanSummonDocument(dataUrl, mime);
      clearTimeout(timer1);
      clearTimeout(timer2);

      const data = result.data;
      const detected = new Set(data.detectedFields || []);
      setDetectedFields(detected);

      // Populate form fields only with actual extracted values
      if (data.summonNumber) setSummonNumber(data.summonNumber);
      if (data.caseNumber) setCaseNumber(data.caseNumber);
      if (data.personName) setPersonName(data.personName);
      if (data.fatherName) setFatherName(data.fatherName);
      if (data.address) setAddress(data.address);
      if (data.courtName) setCourtName(data.courtName);
      if (data.courtAddress) setCourtAddress(data.courtAddress);
      if (data.policeStation) setPoliceStation(data.policeStation);
      if (data.district) setDistrict(data.district);
      if (data.state) setState(data.state);
      if (data.hearingDate) setHearingDate(data.hearingDate);
      if (data.issuingAuthority) setIssuingAuthority(data.issuingAuthority);
      if (data.offenseCharges) setOffenseCharges(data.offenseCharges);
      if (data.urgency) setUrgency(data.urgency);

      setOcrSuccess(result.success);
      setOcrMessage(result.message || null);

      if (result.success && detected.size > 0) {
        showToast(`AI OCR extracted ${detected.size} fields from document`, 'success', 'Scan Complete');
      } else if (!result.success) {
        showToast(result.message || 'Manual entry required.', 'warning', 'OCR Notice');
      }
    } catch (err: any) {
      console.warn('OCR Pipeline caught error:', err);
      setOcrSuccess(false);
      setOcrMessage(err.message || 'Document OCR scan did not complete. Please enter details manually.');
      showToast('Document scan could not complete. Please enter details manually.', 'warning', 'Scan Notice');
    } finally {
      setIsExtracting(false);
      setCurrentStep('review');
    }
  };

  const stopQrCamera = () => {
    if (qrAnimIdRef.current) {
      cancelAnimationFrame(qrAnimIdRef.current);
      qrAnimIdRef.current = null;
    }
    if (qrStreamRef.current) {
      qrStreamRef.current.getTracks().forEach((t) => t.stop());
      qrStreamRef.current = null;
    }
    setQrScanningLive(false);
  };

  // Process decoded QR code payload from camera, image, or text
  const handleDecodedQr = (rawQrData: string) => {
    stopQrCamera();
    const parsed = parseJudicialQRCode(rawQrData.trim());
    const detected = new Set<string>();

    if (parsed.summonNumber) {
      setSummonNumber(parsed.summonNumber);
      detected.add('summonNumber');
    }
    if (parsed.caseNumber) {
      setCaseNumber(parsed.caseNumber);
      detected.add('caseNumber');
    }
    if (parsed.personName) {
      setPersonName(parsed.personName);
      detected.add('personName');
    }
    if (parsed.fatherName) {
      setFatherName(parsed.fatherName);
      detected.add('fatherName');
    }
    if (parsed.address) {
      setAddress(parsed.address);
      detected.add('address');
    }
    if (parsed.courtName) {
      setCourtName(parsed.courtName);
      detected.add('courtName');
    }
    if (parsed.hearingDate) {
      setHearingDate(parsed.hearingDate);
      detected.add('hearingDate');
    }
    if (parsed.offenseCharges) {
      setOffenseCharges(parsed.offenseCharges);
      detected.add('offenseCharges');
    }

    setDetectedFields(detected);
    setIsQrActive(false);
    setOcrSuccess(true);
    if (detected.size > 0) {
      setOcrMessage(`Successfully decoded ${detected.size} judicial parameters from e-Court QR code`);
      showToast(`Decoded ${detected.size} fields from QR code`, 'success', 'QR Decoded');
    } else {
      setOcrMessage(`Scanned QR data: ${rawQrData.substring(0, 60)}...`);
      showToast('QR code scanned. Please verify case fields.', 'info', 'QR Scanned');
    }
    setCurrentStep('review');
  };

  // Start QR camera scanner with live frame processing
  const handleStartQrCamera = async () => {
    setQrCameraError(null);
    try {
      stopQrCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 } },
      });
      qrStreamRef.current = stream;
      setQrScanningLive(true);
      if (qrVideoRef.current) {
        qrVideoRef.current.srcObject = stream;
        await qrVideoRef.current.play();
      }

      // Continuous scanning loop
      const scanFrame = () => {
        if (qrVideoRef.current && qrVideoRef.current.readyState >= 2) {
          const video = qrVideoRef.current;
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imgData.data, imgData.width, imgData.height, {
              inversionAttempts: 'attemptBoth',
            });
            if (code && code.data && code.data.trim().length > 0) {
              handleDecodedQr(code.data);
              return;
            }
          }
        }
        qrAnimIdRef.current = requestAnimationFrame(scanFrame);
      };

      qrAnimIdRef.current = requestAnimationFrame(scanFrame);
    } catch (err: any) {
      console.error('QR camera access error:', err);
      setQrCameraError(
        'Unable to access camera for live QR scanning. Please allow camera permissions or upload an image file.'
      );
      setQrScanningLive(false);
    }
  };

  // Scan QR from image file
  const handleQrImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imgData.data, imgData.width, imgData.height, {
            inversionAttempts: 'attemptBoth',
          });
          if (code && code.data) {
            handleDecodedQr(code.data);
          } else {
            showToast('No legible QR barcode found in this image. Please try another or scan live.', 'warning');
          }
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Apply parsed QR code from text box
  const handleApplyQr = () => {
    if (!qrInput.trim()) return;
    handleDecodedQr(qrInput.trim());
  };

  // Auto-populate fields when person is selected from directory
  const handlePersonSelected = (person: WitnessPerson) => {
    setPersonName(person.name);
    if (person.fatherName) setFatherName(person.fatherName);
    setAddress(person.address);
    if (person.policeStation) setPoliceStation(person.policeStation);
    if (person.district) setDistrict(person.district);

    const detected = new Set(detectedFields);
    detected.add('personName');
    if (person.fatherName) detected.add('fatherName');
    detected.add('address');
    setDetectedFields(detected);

    showToast(`Autofilled particulars for ${person.name} (${person.role})`, 'success', 'Person Selected');
  };

  // Save summon to Firebase / database
  const handleSaveSummon = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (!summonNumber.trim()) {
      setFormError('Summon / Warrant Number is required');
      return;
    }
    if (!caseNumber.trim()) {
      setFormError('Case or FIR Number is required');
      return;
    }
    if (!personName.trim()) {
      setFormError('Respondent / Accused Full Name is required');
      return;
    }
    if (!address.trim()) {
      setFormError('Complete Serving Address is required for police dispatch');
      return;
    }
    if (!courtName.trim()) {
      setFormError('Court / Bench Name is required');
      return;
    }
    if (!hearingDate) {
      setFormError('Court Hearing Date is required');
      return;
    }

    setIsSubmitting(true);
    try {
      await addSummon(
        {
          summonNumber: summonNumber.trim(),
          caseNumber: caseNumber.trim(),
          personName: personName.trim(),
          fatherName: fatherName.trim() || undefined,
          address: address.trim(),
          courtName: courtName.trim(),
          courtAddress: courtAddress.trim() || 'District Court Complex',
          policeStation: policeStation.trim() || currentUser?.policeStation || 'PS Tis Hazari',
          district: district.trim() || currentUser?.district || 'Central District',
          state: state.trim() || 'Delhi NCT',
          issueDate: issueDate || new Date().toISOString().split('T')[0],
          hearingDate,
          issuingAuthority: issuingAuthority.trim() || 'Judicial Magistrate 1st Class',
          officerDetails: officerDetails.trim() || `${currentUser?.rank} ${currentUser?.displayName}`,
          offenseCharges: offenseCharges.trim(),
          status,
          urgency,
          imageUrl: attachmentType === 'image' && attachmentPreview ? attachmentPreview : undefined,
          pdfUrl: attachmentType === 'pdf' && attachmentPreview ? attachmentPreview : undefined,
          fileName: fileName || undefined,
          reminderEnabled: true,
        },
        rawFile
      );

      showToast(`Summon ${summonNumber.trim()} registered and saved successfully`, 'success', 'Docket Saved');

      // Reset & close
      stopCamera();
      onClose();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save judicial summon to database');
      showToast(err.message || 'Failed to save summon', 'error', 'Save Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#0B1326] border border-[#222A3D] rounded-2xl w-full max-w-3xl my-6 overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header & Step Indicator */}
        <div className="bg-[#0A192F] border-b border-[#222A3D] px-5 sm:px-6 py-4 sticky top-0 z-20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[#1E3A5F] text-[#ADC8F5] border border-[#39475F]">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Register Judicial Summon / Warrant
                </h2>
                <p className="text-xs text-[#8F9097]">
                  Law Enforcement Ingestion & AI Docket Extraction
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                stopCamera();
                onClose();
              }}
              id="close-add-modal-btn"
              className="p-1.5 rounded-lg text-[#8F9097] hover:text-white hover:bg-[#1E293B] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Workflow Stepper Bar */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              onClick={() => setCurrentStep('upload')}
              className={`py-1.5 px-2 rounded-lg text-[11px] font-mono font-bold flex items-center justify-center gap-1.5 transition-all ${
                currentStep === 'upload'
                  ? 'bg-[#1E3A5F] text-white border border-[#ADC8F5]'
                  : 'bg-[#131B2E] text-[#8F9097] border border-[#222A3D]'
              }`}
            >
              <span>1. Ingest Document</span>
            </button>

            <div
              className={`py-1.5 px-2 rounded-lg text-[11px] font-mono font-bold flex items-center justify-center gap-1.5 transition-all ${
                currentStep === 'processing'
                  ? 'bg-[#2B1300] text-[#FFB77D] border border-[#FFB77D]'
                  : 'bg-[#131B2E] text-[#8F9097] border border-[#222A3D]'
              }`}
            >
              <span>2. AI OCR Scan</span>
            </div>

            <button
              type="button"
              onClick={() => setCurrentStep('review')}
              className={`py-1.5 px-2 rounded-lg text-[11px] font-mono font-bold flex items-center justify-center gap-1.5 transition-all ${
                currentStep === 'review'
                  ? 'bg-[#1E3A5F] text-white border border-[#ADC8F5]'
                  : 'bg-[#131B2E] text-[#8F9097] border border-[#222A3D]'
              }`}
            >
              <span>3. Review & Save</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {/* STEP 1: INGEST DOCUMENT & SOURCES */}
          {currentStep === 'upload' && (
            <div className="space-y-5">
              <div className="text-center max-w-md mx-auto space-y-1">
                <h3 className="text-sm font-bold text-white">Select Document Input Method</h3>
                <p className="text-xs text-[#8F9097]">
                  Capture warrant photo, upload court PDF or scan judicial QR notice.
                </p>
              </div>

              {/* Camera Live Feed Area */}
              {isCameraActive ? (
                <div className="bg-[#131B2E] border border-[#39475F] rounded-2xl p-4 space-y-3">
                  <div className="relative aspect-video max-h-72 bg-black rounded-xl overflow-hidden flex items-center justify-center">
                    <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                    <div className="absolute inset-4 border border-dashed border-[#ADC8F5]/60 rounded-lg pointer-events-none" />
                  </div>

                  <div className="flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={handleCapturePhoto}
                      id="btn-capture-frame"
                      className="px-6 py-2.5 rounded-xl bg-[#2F4A70] hover:bg-[#3B82F6] text-white font-bold text-xs flex items-center gap-2 shadow-lg cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Capture & Run AI OCR</span>
                    </button>

                    <button
                      type="button"
                      onClick={stopCamera}
                      className="px-4 py-2.5 rounded-xl bg-[#1E293B] hover:bg-[#222A3D] text-[#DAE2FD] text-xs font-medium cursor-pointer"
                    >
                      Cancel Camera
                    </button>
                  </div>
                </div>
              ) : (
                /* Primary Ingestion Grid */
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Camera */}
                  <button
                    type="button"
                    onClick={handleStartCamera}
                    id="btn-start-camera"
                    className="flex flex-col items-center justify-center p-5 rounded-2xl border border-[#222A3D] bg-[#131B2E] hover:border-[#ADC8F5] hover:bg-[#171F33] transition-all group cursor-pointer"
                  >
                    <div className="p-3 rounded-xl bg-[#1E293B] text-[#ADC8F5] group-hover:scale-110 transition-transform mb-2">
                      <Camera className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-white">Live Camera</span>
                    <span className="text-[10px] text-[#8F9097] mt-0.5">Capture Paper Warrant</span>
                  </button>

                  {/* Gallery */}
                  <label
                    htmlFor="upload-gallery-file"
                    id="btn-gallery-select"
                    className="flex flex-col items-center justify-center p-5 rounded-2xl border border-[#222A3D] bg-[#131B2E] hover:border-[#ADC8F5] hover:bg-[#171F33] transition-all group cursor-pointer"
                  >
                    <input
                      id="upload-gallery-file"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <div className="p-3 rounded-xl bg-[#1E293B] text-[#ADC8F5] group-hover:scale-110 transition-transform mb-2">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-white">Gallery Photo</span>
                    <span className="text-[10px] text-[#8F9097] mt-0.5">JPG / PNG / WEBP</span>
                  </label>

                  {/* PDF Upload */}
                  <label
                    htmlFor="upload-pdf-file"
                    id="btn-pdf-select"
                    className="flex flex-col items-center justify-center p-5 rounded-2xl border border-[#222A3D] bg-[#131B2E] hover:border-[#ADC8F5] hover:bg-[#171F33] transition-all group cursor-pointer"
                  >
                    <input
                      id="upload-pdf-file"
                      type="file"
                      accept="application/pdf"
                      onChange={handlePdfUpload}
                      className="hidden"
                    />
                    <div className="p-3 rounded-xl bg-[#1E293B] text-[#ADC8F5] group-hover:scale-110 transition-transform mb-2">
                      <FileText className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-white">Court PDF</span>
                    <span className="text-[10px] text-[#8F9097] mt-0.5">Official e-Summon</span>
                  </label>

                  {/* QR Code */}
                  <button
                    type="button"
                    onClick={() => setIsQrActive(!isQrActive)}
                    id="btn-open-qr"
                    className="flex flex-col items-center justify-center p-5 rounded-2xl border border-[#222A3D] bg-[#131B2E] hover:border-[#ADC8F5] hover:bg-[#171F33] transition-all group cursor-pointer"
                  >
                    <div className="p-3 rounded-xl bg-[#1E293B] text-[#FFB77D] group-hover:scale-110 transition-transform mb-2">
                      <QrCode className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-white">Judicial QR</span>
                    <span className="text-[10px] text-[#8F9097] mt-0.5">e-Courts Barcode</span>
                  </button>
                </div>
              )}

              {cameraError && (
                <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl text-xs text-red-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{cameraError}</span>
                </div>
              )}

              {/* QR Scanner Drawer */}
              {isQrActive && (
                <div className="bg-[#131B2E] border border-[#222A3D] rounded-2xl p-5 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between pb-2 border-b border-[#222A3D]">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <QrCode className="w-4 h-4 text-[#FFB77D]" />
                      Judicial QR & Barcode Scanner
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        stopQrCamera();
                        setIsQrActive(false);
                      }}
                      className="text-xs text-[#8F9097] hover:text-white cursor-pointer"
                    >
                      Close Scanner
                    </button>
                  </div>

                  {/* QR Scanning Mode Selector */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={qrScanningLive ? stopQrCamera : handleStartQrCamera}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        qrScanningLive
                          ? 'bg-red-950/80 border border-red-800 text-red-300'
                          : 'bg-[#2F4A70] hover:bg-[#3B82F6] text-white shadow'
                      }`}
                    >
                      <Camera className="w-4 h-4" />
                      <span>{qrScanningLive ? 'Stop Live Camera' : 'Scan via Live Camera'}</span>
                    </button>

                    <label
                      htmlFor="qr-file-upload"
                      className="px-3.5 py-2 rounded-xl bg-[#1E293B] hover:bg-[#2F4A70] border border-[#39475F] text-[#ADC8F5] hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <input
                        id="qr-file-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleQrImageUpload}
                        className="hidden"
                      />
                      <ImageIcon className="w-4 h-4" />
                      <span>Upload QR Image</span>
                    </label>
                  </div>

                  {/* Live Video Viewfinder with targeting reticle */}
                  {qrScanningLive && (
                    <div className="relative rounded-xl overflow-hidden border-2 border-[#FFB77D] bg-black aspect-video max-h-56 mx-auto flex items-center justify-center">
                      <video
                        ref={qrVideoRef}
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      {/* Targeting overlay */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-36 h-36 border-2 border-[#FFB77D] rounded-xl relative">
                          <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-white" />
                          <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-white" />
                          <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-white" />
                          <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-white" />
                          <div className="w-full h-0.5 bg-[#FFB77D]/80 absolute top-1/2 -translate-y-1/2 animate-bounce" />
                        </div>
                      </div>
                      <div className="absolute bottom-2 left-0 right-0 text-center">
                        <span className="px-2.5 py-1 rounded-full bg-black/70 text-[10px] font-mono text-[#FFB77D]">
                          Point camera directly at Judicial QR code
                        </span>
                      </div>
                    </div>
                  )}

                  {qrCameraError && (
                    <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl text-xs text-red-200 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                      <span>{qrCameraError}</span>
                    </div>
                  )}

                  {/* Manual Paste Fallback */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-[11px] font-medium text-[#8F9097] block">
                      Or paste raw e-Court CNR / QR payload text:
                    </label>
                    <textarea
                      value={qrInput}
                      onChange={(e) => setQrInput(e.target.value)}
                      placeholder="e.g. CNR:DLCT010012342026; FIR:142/2026; Court:Tis Hazari; Accused:Sanjay Kumar; Date:2026-09-24"
                      rows={2}
                      className="w-full bg-[#0B1326] border border-[#222A3D] rounded-xl p-2.5 text-xs text-white font-mono placeholder-[#5A6072] focus:outline-none focus:border-[#ADC8F5] resize-none"
                    />
                    <button
                      type="button"
                      onClick={handleApplyQr}
                      disabled={!qrInput.trim()}
                      className="px-4 py-2 bg-[#2F4A70] hover:bg-[#3B82F6] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Decode & Populate Particulars
                    </button>
                  </div>
                </div>
              )}

              {/* Attachment Preview (if already loaded) */}
              {attachmentPreview && (
                <div className="p-4 bg-[#131B2E] border border-[#222A3D] rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {attachmentType === 'image' ? (
                      <img
                        src={attachmentPreview}
                        alt="Scanned summon"
                        className="w-12 h-12 rounded-lg object-cover border border-[#39475F]"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-[#1E293B] border border-[#39475F] flex items-center justify-center text-[#ADC8F5]">
                        <FileText className="w-6 h-6" />
                      </div>
                    )}
                    <div className="truncate">
                      <div className="text-xs font-bold text-white truncate">{fileName}</div>
                      <div className="text-[11px] text-[#8F9097]">
                        {attachmentType === 'image' ? 'Image Document' : 'Court PDF Notice'} • Ready for review
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => triggerOcrPipeline(attachmentPreview, attachmentType === 'pdf' ? 'application/pdf' : 'image/jpeg')}
                      className="px-3 py-1.5 rounded-lg border border-[#222A3D] hover:bg-[#1E293B] text-xs text-[#ADC8F5] flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Re-scan
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentStep('review')}
                      className="px-4 py-1.5 rounded-lg bg-[#2F4A70] hover:bg-[#3B82F6] text-xs font-bold text-white flex items-center gap-1"
                    >
                      Proceed <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Manual Entry Direct Action */}
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setCurrentStep('review')}
                  id="btn-skip-to-manual"
                  className="text-xs text-[#ADC8F5] hover:underline inline-flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Manual Docket Entry (Skip AI OCR Scan)</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: PROCESSING & AI TELEMETRY */}
          {currentStep === 'processing' && (
            <div className="py-12 px-4 text-center space-y-4 bg-[#131B2E] border border-[#222A3D] rounded-2xl">
              <div className="relative w-16 h-16 mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-[#0A192F] border border-[#39475F] flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-[#FFB77D] animate-pulse" />
                </div>
                <div className="absolute -inset-1 rounded-2xl border-2 border-t-[#3B82F6] border-r-transparent border-b-transparent border-l-transparent animate-spin pointer-events-none" />
              </div>

              <div className="space-y-1 max-w-sm mx-auto">
                <h3 className="text-sm font-bold text-white font-mono">
                  JUDICIAL DOCUMENT OCR IN PROGRESS
                </h3>
                <p className="text-xs text-[#ADC8F5] animate-pulse">{extractStatusText}</p>
                <p className="text-[11px] text-[#8F9097] pt-2">
                  Gemini AI models are parsing court headers, FIR details, and respondent address.
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: REVIEW & EDIT FORM */}
          {currentStep === 'review' && (
            <form onSubmit={handleSaveSummon} className="space-y-6">
              {/* Status & Autofill Banner */}
              {ocrMessage && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-start justify-between gap-3 ${
                    ocrSuccess
                      ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-200'
                      : 'bg-amber-950/40 border-amber-700/60 text-amber-200'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {ocrSuccess ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <span className="font-bold block mb-0.5">
                        {ocrSuccess ? 'AI OCR Extraction Verified' : 'AI OCR Notice'}
                      </span>
                      <span>{ocrMessage}</span>
                      {detectedFields.size > 0 && (
                        <span className="block mt-1 font-mono text-[11px] opacity-85">
                          Autofilled: {Array.from(detectedFields).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setCurrentStep('upload')}
                    className="text-[11px] underline shrink-0 hover:opacity-80"
                  >
                    Change Document
                  </button>
                </div>
              )}

              {formError && (
                <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl text-xs text-red-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{formError}</span>
                </div>
              )}

              {/* SECTION A: WARRANT & CASE DETAILS */}
              <div className="space-y-3 bg-[#131B2E] border border-[#222A3D] rounded-2xl p-4 sm:p-5">
                <span className="text-xs font-bold text-[#ADC8F5] uppercase tracking-wider font-mono flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-[#FFB77D]" />
                  A. Warrant & Case Identifiers
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-xs font-medium text-[#8F9097] flex items-center justify-between mb-1">
                      <span>Summon / Warrant Number *</span>
                      {detectedFields.has('summonNumber') && (
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-700/50">
                          AI Autofilled
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      id="input-summon-number"
                      value={summonNumber}
                      onChange={(e) => setSummonNumber(e.target.value)}
                      placeholder="e.g. SUM/2026/0892 or WAR-112"
                      className={`w-full bg-[#0B1326] border rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#ADC8F5] ${
                        detectedFields.has('summonNumber') ? 'border-emerald-600/60' : 'border-[#222A3D]'
                      }`}
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[#8F9097] flex items-center justify-between mb-1">
                      <span>Case / FIR Number *</span>
                      {detectedFields.has('caseNumber') && (
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-700/50">
                          AI Autofilled
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      id="input-case-number"
                      value={caseNumber}
                      onChange={(e) => setCaseNumber(e.target.value)}
                      placeholder="e.g. FIR No. 248/2025 PS Tis Hazari"
                      className={`w-full bg-[#0B1326] border rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#ADC8F5] ${
                        detectedFields.has('caseNumber') ? 'border-emerald-600/60' : 'border-[#222A3D]'
                      }`}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  <div>
                    <label className="text-xs font-medium text-[#8F9097] block mb-1">Priority Urgency</label>
                    <select
                      value={urgency}
                      onChange={(e) => setUrgency(e.target.value as SummonUrgency)}
                      className="w-full bg-[#0B1326] border border-[#222A3D] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ADC8F5]"
                    >
                      <option value="Standard">Standard</option>
                      <option value="High">High Priority</option>
                      <option value="Urgent">Urgent / Warrant</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[#8F9097] block mb-1">Docket Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as SummonStatus)}
                      className="w-full bg-[#0B1326] border border-[#222A3D] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ADC8F5]"
                    >
                      <option value="Pending">Pending Service</option>
                      <option value="Upcoming">Upcoming Court</option>
                      <option value="Completed">Completed / Served</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[#8F9097] block mb-1">Issue Date</label>
                    <input
                      type="date"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                      className="w-full bg-[#0B1326] border border-[#222A3D] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#ADC8F5]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[#8F9097] flex items-center justify-between mb-1">
                      <span>Hearing Date *</span>
                      {detectedFields.has('hearingDate') && (
                        <span className="text-[10px] font-mono text-emerald-400">AI</span>
                      )}
                    </label>
                    <input
                      type="date"
                      id="input-hearing-date"
                      value={hearingDate}
                      onChange={(e) => setHearingDate(e.target.value)}
                      className={`w-full bg-[#0B1326] border rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#ADC8F5] ${
                        detectedFields.has('hearingDate') ? 'border-emerald-600/60' : 'border-[#222A3D]'
                      }`}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* SECTION B: RESPONDENT & SERVING ADDRESS */}
              <div className="space-y-3 bg-[#131B2E] border border-[#222A3D] rounded-2xl p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#ADC8F5] uppercase tracking-wider font-mono flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-[#FFB77D]" />
                    B. Person Summoned & Official Serving Address
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsSelectPersonOpen(true)}
                      id="btn-select-someone"
                      className="px-2.5 py-1 bg-[#1E293B] hover:bg-[#2F4A70] text-[#ADC8F5] hover:text-white rounded-lg text-xs font-medium flex items-center gap-1.5 border border-[#39475F] transition-colors cursor-pointer"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-[#FFB77D]" />
                      <span>Select Someone</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddPersonDirectOpen(true)}
                      id="btn-add-someone"
                      className="px-2.5 py-1 bg-[#2F4A70] hover:bg-[#3B82F6] text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Someone</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-xs font-medium text-[#8F9097] flex items-center justify-between mb-1">
                      <span>Respondent / Accused Full Name *</span>
                      {detectedFields.has('personName') && (
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-700/50">
                          AI Autofilled
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      id="input-person-name"
                      value={personName}
                      onChange={(e) => setPersonName(e.target.value)}
                      placeholder="e.g. Ramesh Chandra / Rajesh Gupta"
                      className={`w-full bg-[#0B1326] border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ADC8F5] ${
                        detectedFields.has('personName') ? 'border-emerald-600/60' : 'border-[#222A3D]'
                      }`}
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[#8F9097] flex items-center justify-between mb-1">
                      <span>Father / Husband / Guardian Name</span>
                      {detectedFields.has('fatherName') && (
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-700/50">
                          AI Autofilled
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={fatherName}
                      onChange={(e) => setFatherName(e.target.value)}
                      placeholder="e.g. Sh. Harish Chandra"
                      className={`w-full bg-[#0B1326] border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ADC8F5] ${
                        detectedFields.has('fatherName') ? 'border-emerald-600/60' : 'border-[#222A3D]'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-[#8F9097] flex items-center justify-between mb-1">
                    <span className="font-semibold text-white">Complete Delivery / Serving Address *</span>
                    {detectedFields.has('address') && (
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-700/50">
                        AI Autofilled
                      </span>
                    )}
                  </label>
                  <textarea
                    id="input-serving-address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="House/Flat number, Street, Landmark, Village/Colony, Pincode for field officer delivery..."
                    rows={3}
                    className={`w-full bg-[#0B1326] border rounded-xl p-3 text-xs text-white leading-relaxed focus:outline-none focus:border-[#ADC8F5] ${
                      detectedFields.has('address') ? 'border-emerald-600/60' : 'border-[#222A3D]'
                    }`}
                    required
                  />
                </div>
              </div>

              {/* SECTION C: COURT & CHARGES */}
              <div className="space-y-3 bg-[#131B2E] border border-[#222A3D] rounded-2xl p-4 sm:p-5">
                <span className="text-xs font-bold text-[#ADC8F5] uppercase tracking-wider font-mono flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-[#FFB77D]" />
                  C. Judicial Court & Offense Sections
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-xs font-medium text-[#8F9097] flex items-center justify-between mb-1">
                      <span>Court / Bench Name *</span>
                      {detectedFields.has('courtName') && (
                        <span className="text-[10px] font-mono text-emerald-400">AI</span>
                      )}
                    </label>
                    <input
                      type="text"
                      id="input-court-name"
                      value={courtName}
                      onChange={(e) => setCourtName(e.target.value)}
                      placeholder="e.g. Chief Metropolitan Magistrate Court"
                      className="w-full bg-[#0B1326] border border-[#222A3D] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ADC8F5]"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[#8F9097] block mb-1">
                      Court Room / Complex Location
                    </label>
                    <input
                      type="text"
                      value={courtAddress}
                      onChange={(e) => setCourtAddress(e.target.value)}
                      placeholder="e.g. Room No. 14, Tis Hazari Courts Complex, Delhi"
                      className="w-full bg-[#0B1326] border border-[#222A3D] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ADC8F5]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-[#8F9097] block mb-1">Police Station Jurisdiction</label>
                    <input
                      type="text"
                      value={policeStation}
                      onChange={(e) => setPoliceStation(e.target.value)}
                      placeholder="e.g. PS Tis Hazari"
                      className="w-full bg-[#0B1326] border border-[#222A3D] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ADC8F5]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[#8F9097] block mb-1">District</label>
                    <input
                      type="text"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      placeholder="e.g. Central Delhi"
                      className="w-full bg-[#0B1326] border border-[#222A3D] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ADC8F5]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[#8F9097] block mb-1">Issuing Authority</label>
                    <input
                      type="text"
                      value={issuingAuthority}
                      onChange={(e) => setIssuingAuthority(e.target.value)}
                      placeholder="e.g. Judicial Magistrate 1st Class"
                      className="w-full bg-[#0B1326] border border-[#222A3D] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ADC8F5]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-[#8F9097] block mb-1">
                    Offense / Legal Sections (IPC / BNS / NI Act)
                  </label>
                  <input
                    type="text"
                    value={offenseCharges}
                    onChange={(e) => setOffenseCharges(e.target.value)}
                    placeholder="e.g. Under Section 138 NI Act / 420 IPC"
                    className="w-full bg-[#0B1326] border border-[#222A3D] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ADC8F5]"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep('upload')}
                  className="px-4 py-2.5 rounded-xl border border-[#222A3D] hover:bg-[#1E293B] text-xs font-medium text-[#DAE2FD] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Document
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      stopCamera();
                      onClose();
                    }}
                    className="px-4 py-2.5 rounded-xl border border-[#222A3D] hover:bg-[#1E293B] text-xs text-[#8F9097] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    id="btn-save-summon-submit"
                    className="px-6 py-2.5 rounded-xl bg-[#2F4A70] hover:bg-[#3B82F6] text-white text-xs font-bold flex items-center gap-2 shadow-lg hover:shadow-blue-500/25 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving to Cloud Database...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Save Judicial Summon</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Select Person / Witness Directory Modal */}
      <SelectPersonModal
        isOpen={isSelectPersonOpen}
        onClose={() => setIsSelectPersonOpen(false)}
        onSelectPerson={handlePersonSelected}
        title="Select Registered Person / Witness"
      />

      {/* Direct Add Person Modal */}
      <SelectPersonModal
        isOpen={isAddPersonDirectOpen}
        onClose={() => setIsAddPersonDirectOpen(false)}
        onSelectPerson={handlePersonSelected}
        title="Register & Select Person"
        defaultRoleFilter="Accused"
      />
    </div>
  );
};
