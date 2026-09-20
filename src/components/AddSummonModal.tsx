import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useReducedMotion } from 'motion/react';
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
  FileCheck,
  Maximize2,
} from 'lucide-react';
import jsQR from 'jsqr';
import { useSummons } from '../context/SummonContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import { scanSummonDocument, parseJudicialQRCode, ExtractedSummonData } from '../utils/ocrService';
import { SummonStatus, SummonUrgency, WitnessPerson } from '../types';
import { SelectPersonModal } from './SelectPersonModal';
import { ImageCropperModal } from './ImageCropperModal';
import { DocumentCameraScanner, ScanResultData } from './DocumentCameraScanner';
import { JudicialQrScannerModal } from './JudicialQrScannerModal';
import { NormalizedCaseData } from '../utils/judicialQrClient';

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
  const shouldReduceMotion = useReducedMotion();

  // Workflow step
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('upload');

  // Attachment state
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [originalAttachmentPreview, setOriginalAttachmentPreview] = useState<string | null>(null);
  const [viewingOriginalDoc, setViewingOriginalDoc] = useState<boolean>(false);
  const [attachmentType, setAttachmentType] = useState<'image' | 'pdf' | null>(null);
  const [fileName, setFileName] = useState<string>('');

  // Full-screen camera & mobile document scanner state
  const [isFullScreenScannerOpen, setIsFullScreenScannerOpen] = useState<boolean>(false);
  const [scannerInitialImage, setScannerInitialImage] = useState<string | null>(null);
  const [scannerInitialFileName, setScannerInitialFileName] = useState<string | undefined>(undefined);

  // Dedicated Judicial QR modal state
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [selectedSource, setSelectedSource] = useState<'camera' | 'upload' | 'pdf' | 'judicial-qr' | null>(null);

  // e-Courts QR import metadata
  const [importedFromECourts, setImportedFromECourts] = useState<boolean>(false);
  const [importedFields, setImportedFields] = useState<Set<string>>(new Set());
  const [eCourtsImportMeta, setECourtsImportMeta] = useState<{
    source: string;
    verifiedAt: string;
    cnrNumber?: string;
  } | null>(null);

  // Fallback camera states
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraMode, setCameraMode] = useState<'document' | 'qr'>('document');
  const [isCameraStarting, setIsCameraStarting] = useState<boolean>(false);
  const [isCameraReady, setIsCameraReady] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

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
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropMimeType, setCropMimeType] = useState<string>('image/jpeg');
  const [cropFileName, setCropFileName] = useState<string>('image.jpg');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Completely stops and cleans up camera hardware tracks
  const stopCamera = useCallback((turnOffActive: boolean = true) => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (_) {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (turnOffActive) {
      setIsCameraActive(false);
    }
    setIsCameraReady(false);
    setIsCameraStarting(false);
  }, []);

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
      stopCamera(true);
    }
  }, [isOpen, defaultHearingDate, currentUser, stopCamera]);

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      stopCamera(true);
    };
  }, [stopCamera]);

  // Callback ref ensuring video node connects to stream as soon as it mounts
  const setVideoRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && streamRef.current) {
      if (node.srcObject !== streamRef.current) {
        node.srcObject = streamRef.current;
      }
      node.play().catch((playErr) => {
        console.warn('Video playback notice:', playErr);
      });
    }
  }, []);

  // Ensure stream connection whenever isCameraActive flips
  useEffect(() => {
    if (isCameraActive && streamRef.current && videoRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }
      videoRef.current.play().catch(() => {});
    }
  }, [isCameraActive]);

  // Launch dedicated full-screen camera modal
  const handleOpenFullScreenCamera = () => {
    stopCamera(true);
    setScannerInitialImage(null);
    setScannerInitialFileName(undefined);
    setIsFullScreenScannerOpen(true);
  };

  // Launch mobile scanner directly in crop mode for uploaded gallery image
  const handleSelectPhotoForScanner = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    stopCamera(true);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setScannerInitialImage(dataUrl);
      setScannerInitialFileName(file.name || 'Summon_Upload.jpg');
      setIsFullScreenScannerOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Handler when DocumentCameraScanner completes (Camera/Upload -> Review -> Crop -> AI OCR)
  const handleScannerComplete = (result: ScanResultData) => {
    setIsFullScreenScannerOpen(false);
    setScannerInitialImage(null);
    setScannerInitialFileName(undefined);

    setRawFile(result.croppedFile);
    setAttachmentType('image');
    setFileName(result.fileName);
    setAttachmentPreview(result.croppedDataUrl);
    setOriginalAttachmentPreview(result.originalDataUrl);
    setViewingOriginalDoc(false);

    const data = result.ocrResult.data;
    const detected = new Set(data.detectedFields || []);
    setDetectedFields(detected);

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

    setOcrSuccess(result.ocrResult.success);
    setOcrMessage(result.ocrResult.message ? sanitizeOcrNotice(result.ocrResult.message) : null);

    if (result.ocrResult.success && detected.size > 0) {
      showToast(`AI OCR extracted ${detected.size} judicial fields from document`, 'success', 'Scan Complete');
    } else if (!result.ocrResult.success) {
      showToast(sanitizeOcrNotice(result.ocrResult.message) || 'Please verify docket particulars below.', 'warning', 'OCR Notice');
    }

    setCurrentStep('review');
  };

  // Gallery image selection
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCropFileName(file.name);
    setCropMimeType(file.type || 'image/jpeg');

    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // PDF file upload
  
  const handleCropComplete = (croppedBlob: Blob) => {
    setCropImageSrc(null);
    const file = new File([croppedBlob], cropFileName, { type: cropMimeType });
    setRawFile(file);
    setAttachmentType('image');
    setFileName(cropFileName);

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setAttachmentPreview(dataUrl);
      triggerOcrPipeline(dataUrl, cropMimeType);
    };
    reader.readAsDataURL(croppedBlob);
  };

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

  // Helper to sanitize technical AI error messages into professional judicial guidance
  const sanitizeOcrNotice = (msg: string | null | undefined): string => {
    if (!msg) return '';
    let clean = msg;
    if (clean.includes('{') && clean.includes('}')) {
      try {
        const start = clean.indexOf('{');
        const end = clean.lastIndexOf('}');
        const parsed = JSON.parse(clean.slice(start, end + 1));
        if (parsed?.error?.message) {
          clean = parsed.error.message;
        }
      } catch (_) {}
    }
    if (clean.includes('503') || clean.includes('high demand') || clean.includes('UNAVAILABLE') || clean.includes('busy')) {
      return 'The AI document extraction service was temporarily experiencing peak demand. Click "Retry AI Scan" to re-process with our high-speed engine, or enter details below.';
    }
    return clean;
  };

  // Trigger AI OCR extraction pipeline with visual phases
  const triggerOcrPipeline = async (dataUrl: string, mime: string) => {
    if (isExtracting) return; // Prevent concurrent OCR runs
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
      setOcrMessage(result.message ? sanitizeOcrNotice(result.message) : null);

      if (result.success && detected.size > 0) {
        showToast(`AI OCR extracted ${detected.size} fields from document`, 'success', 'Scan Complete');
      } else if (!result.success) {
        showToast(sanitizeOcrNotice(result.message) || 'Manual entry required.', 'warning', 'OCR Notice');
      }
    } catch (err: any) {
      console.warn('OCR Pipeline caught error:', err);
      setOcrSuccess(false);
      setOcrMessage(sanitizeOcrNotice(err.message) || 'Document OCR scan did not complete. Please enter details manually.');
      showToast('Document scan could not complete. Please enter details manually.', 'warning', 'Scan Notice');
    } finally {
      setIsExtracting(false);
      setCurrentStep('review');
    }
  };

  // Process decoded QR code payload from camera, image, or manual text
  const handleDecodedQr = (rawQrData: string) => {
    stopCamera(true);
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
    if (parsed.courtAddress) {
      setCourtAddress(parsed.courtAddress);
      detected.add('courtAddress');
    }
    if (parsed.policeStation) {
      setPoliceStation(parsed.policeStation);
      detected.add('policeStation');
    }
    if (parsed.district) {
      setDistrict(parsed.district);
      detected.add('district');
    }
    if (parsed.state) {
      setState(parsed.state);
      detected.add('state');
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
    setIsQrModalOpen(false);
    setOcrSuccess(true);
    if (detected.size > 0) {
      setOcrMessage(`Successfully decoded ${detected.size} judicial parameters from e-Court QR code`);
      showToast(`Decoded ${detected.size} fields from QR code!`, 'success', 'QR Decoded');
    } else {
      setOcrMessage(`Scanned QR data: ${rawQrData.substring(0, 60)}...`);
      showToast('QR code scanned. Please verify case fields.', 'info', 'QR Scanned');
    }
    setCurrentStep('review');
  };

  // Apply verified e-Courts case data from dedicated Judicial QR Scanner
  const handleApplyCaseDetails = (caseData: NormalizedCaseData, rawPayload: string) => {
    setIsQrModalOpen(false);
    stopCamera(true);

    const imported = new Set<string>();

    const applySafe = (currentVal: string, newVal: string, setter: (val: string) => void, key: string) => {
      if (newVal && newVal.trim()) {
        setter(newVal.trim());
        imported.add(key);
      }
    };

    // 1. CNR / Summon Identifier
    const cnrVal = caseData.cnrNumber || (rawPayload && rawPayload.length >= 16 ? rawPayload.trim() : '');
    if (cnrVal) {
      applySafe(summonNumber, cnrVal, setSummonNumber, 'summonNumber');
    }

    // 2. Case Number
    if (caseData.caseNumber) {
      applySafe(caseNumber, caseData.caseNumber, setCaseNumber, 'caseNumber');
    }

    // 3. Court Name
    if (caseData.courtName) {
      applySafe(courtName, caseData.courtName, setCourtName, 'courtName');
    }

    // 4. Court Address / Complex / Room
    if (caseData.courtNumber) {
      applySafe(courtAddress, caseData.courtNumber, setCourtAddress, 'courtAddress');
    }

    // 5. District
    if (caseData.district) {
      applySafe(district, caseData.district, setDistrict, 'district');
    }

    // 6. State
    if (caseData.state) {
      applySafe(state, caseData.state, setState, 'state');
    }

    // 7. Police Station
    if (caseData.policeStation) {
      applySafe(policeStation, caseData.policeStation, setPoliceStation, 'policeStation');
    }

    // 8. Hearing Date
    if (caseData.nextHearingDate) {
      applySafe(hearingDate, caseData.nextHearingDate, setHearingDate, 'hearingDate');
    }

    // 9. Respondent (Person Name)
    if (caseData.respondent && caseData.respondent.length > 0) {
      applySafe(personName, caseData.respondent[0], setPersonName, 'personName');
    }

    // 10. Petitioner / Issuing Authority
    if (caseData.petitioner && caseData.petitioner.length > 0) {
      if (!issuingAuthority) {
        setIssuingAuthority(caseData.petitioner.join(', '));
        imported.add('issuingAuthority');
      }
    }

    // 11. Sections / Acts
    if (caseData.sections && caseData.sections.length > 0) {
      const secStr = caseData.sections.join(', ') + (caseData.acts && caseData.acts.length > 0 ? ` (${caseData.acts.join(', ')})` : '');
      applySafe(offenseCharges, secStr, setOffenseCharges, 'offenseCharges');
    }

    setImportedFromECourts(true);
    setImportedFields(imported);
    setDetectedFields(imported);
    setECourtsImportMeta({
      source: 'e-Courts / Judicial QR',
      verifiedAt: new Date().toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
      cnrNumber: caseData.cnrNumber || rawPayload,
    });

    setOcrSuccess(true);
    setOcrMessage(`Case docket imported successfully from e-Courts (${caseData.cnrNumber || caseData.caseNumber || 'CNR Verified'})`);
    showToast('Case details imported successfully from e-Courts!', 'success', 'Case Found');
    setCurrentStep('review');
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
    if (isSubmitting) return; // Prevent double clicks
    
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
          originalImageUrl: attachmentType === 'image' && originalAttachmentPreview ? originalAttachmentPreview : undefined,
          pdfUrl: attachmentType === 'pdf' && attachmentPreview ? attachmentPreview : undefined,
          fileName: fileName || undefined,
          reminderEnabled: true,
        },
        rawFile
      );

      setSaveSuccess(true);
      showToast(`Summon ${summonNumber.trim()} registered and saved successfully`, 'success', 'Docket Saved');
      setTimeout(() => {
        stopCamera();
        onClose();
        setSaveSuccess(false);
      }, 1000);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save judicial summon to database');
      showToast(err.message || 'Failed to save summon', 'error', 'Save Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModalClose = React.useCallback(() => {
    stopCamera(true);
    onClose();
  }, [onClose, stopCamera]);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleModalClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleModalClose]);

  if (!isOpen) return null;

  return (
    <div
      id="add-summon-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleModalClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto animate-fadeIn"
    >
      <div className="bg-background border border-border rounded-2xl w-full max-w-3xl my-6 overflow-hidden shadow-2xl animate-scaleIn flex flex-col max-h-[92vh]">
        {/* Modal Header & Step Indicator */}
        <div className="bg-card border-b border-border px-5 sm:px-6 py-4 sticky top-0 z-20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-muted text-foreground border border-border">
                <FileText className="w-5 h-5 text-primary-text" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
                  Register Judicial Summon / Warrant
                </h2>
                <p className="text-xs text-muted-foreground">
                  Law Enforcement Ingestion & AI Docket Extraction
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleModalClose}
              id="close-add-modal-btn"
              aria-label="Close summon registration"
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Workflow Stepper Bar */}
          <div className="grid grid-cols-3 gap-2 pt-1" role="tablist" aria-label="Workflow progress">
            <button
              type="button"
              role="tab"
              aria-selected={currentStep === 'upload'}
              onClick={() => {
                if (isCameraActive) stopCamera(true);
                setCurrentStep('upload');
              }}
              className={`py-2 px-3 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                currentStep === 'upload'
                  ? 'bg-primary-btn text-white shadow-sm ring-1 ring-primary-text/40'
                  : 'bg-card text-muted-foreground border border-border hover:text-foreground hover:border-border-strong'
              }`}
            >
              <span>1. Ingest Document</span>
            </button>

            <div
              role="tab"
              aria-selected={currentStep === 'processing'}
              className={`py-2 px-3 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all ${
                currentStep === 'processing'
                  ? 'bg-amber-500/15 text-amber-500 border border-amber-500/40 shadow-sm animate-pulse'
                  : 'bg-card text-muted-foreground border border-border'
              }`}
            >
              <span>2. AI OCR Scan</span>
            </div>

            <button
              type="button"
              role="tab"
              aria-selected={currentStep === 'review'}
              onClick={() => {
                if (isCameraActive) stopCamera(true);
                setCurrentStep('review');
              }}
              className={`py-2 px-3 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                currentStep === 'review'
                  ? 'bg-primary-btn text-white shadow-sm ring-1 ring-primary-text/40'
                  : 'bg-card text-muted-foreground border border-border hover:text-foreground hover:border-border-strong'
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
              {/* Primary Ingestion Methods Grid - Select Source */}
              <div className="space-y-3">
                <div className="text-center max-w-md mx-auto py-1">
                  <h3 className="text-sm sm:text-base font-bold text-foreground">
                    Select Document Source
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Capture paper summon with camera or upload photo to begin AI extraction
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* 1. Live Camera */}
                  <button
                    type="button"
                    onClick={handleOpenFullScreenCamera}
                    id="btn-start-camera"
                    aria-label="Open full-screen camera to capture paper warrant"
                    className="min-h-[120px] flex flex-col items-center justify-center p-4 sm:p-5 rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/5 hover:border-emerald-500 hover:bg-emerald-500/10 transition-all group cursor-pointer active:scale-[0.98] shadow-sm"
                  >
                    <div className="p-3.5 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform mb-2">
                      <Camera className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-foreground">Live Camera</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5 text-center">Full-Screen Scanner</span>
                  </button>

                  {/* 2. Gallery Photo Upload with Direct Mobile Crop & OCR */}
                  <label
                    htmlFor="upload-gallery-file"
                    id="btn-gallery-select"
                    className="min-h-[120px] flex flex-col items-center justify-center p-4 sm:p-5 rounded-2xl border-2 border-primary-btn/30 bg-primary-btn/5 hover:border-primary-btn hover:bg-primary-btn/10 transition-all group cursor-pointer active:scale-[0.98] shadow-sm"
                  >
                    <input
                      id="upload-gallery-file"
                      type="file"
                      accept="image/*"
                      onChange={handleSelectPhotoForScanner}
                      className="hidden"
                    />
                    <div className="p-3.5 rounded-xl bg-primary-btn/15 text-primary-text group-hover:scale-110 transition-transform mb-2">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-foreground">Upload Photo</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5 text-center">Preview & Crop → AI OCR</span>
                  </label>

                  {/* 3. PDF Upload */}
                  <label
                    htmlFor="upload-pdf-file"
                    id="btn-pdf-select"
                    className="min-h-[120px] flex flex-col items-center justify-center p-4 sm:p-5 rounded-2xl border border-border bg-card hover:border-primary-text hover:bg-muted/30 transition-all group cursor-pointer active:scale-[0.98]"
                  >
                    <input
                      id="upload-pdf-file"
                      type="file"
                      accept="application/pdf"
                      onChange={handlePdfUpload}
                      className="hidden"
                    />
                    <div className="p-3.5 rounded-xl bg-muted text-muted-foreground group-hover:scale-110 transition-transform mb-2">
                      <FileText className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-foreground">Court PDF</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5 text-center">Official e-Summon</span>
                  </label>

                  {/* 4. Judicial QR Code */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSource('judicial-qr');
                      setIsQrModalOpen(true);
                    }}
                    id="btn-open-qr"
                    aria-label="Scan judicial QR code with camera, photo upload, or CNR text"
                    className={`min-h-[120px] flex flex-col items-center justify-center p-4 sm:p-5 rounded-2xl border-2 transition-all group cursor-pointer active:scale-[0.98] shadow-sm relative ${
                      selectedSource === 'judicial-qr'
                        ? 'border-amber-500 bg-amber-500/15 ring-2 ring-amber-500/50 shadow-md'
                        : 'border-amber-500/30 bg-amber-500/5 hover:border-amber-500 hover:bg-amber-500/10'
                    }`}
                  >
                    {selectedSource === 'judicial-qr' && (
                      <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500 text-black uppercase font-mono tracking-wider shadow-sm">
                        Selected
                      </span>
                    )}
                    <div className="p-3.5 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform mb-2">
                      <QrCode className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-foreground">Judicial QR</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5 text-center">e-Courts Barcode</span>
                  </button>
                </div>
              </div>

              {/* Secondary QR Launcher Link */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setIsQrModalOpen(true)}
                  className="text-xs text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-1.5 cursor-pointer underline-offset-4 hover:underline"
                >
                  <QrCode className="w-3.5 h-3.5 text-amber-500" />
                  <span>Have an e-Courts QR screenshot or 16-digit CNR code? Scan or test here</span>
                </button>
              </div>

              {/* Attachment Preview (if already loaded) */}
              {attachmentPreview && (
                <div className="p-4 bg-card border border-border rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {attachmentType === 'image' ? (
                      <img
                        src={attachmentPreview}
                        alt="Scanned summon"
                        className="w-12 h-12 rounded-lg object-cover border border-border-strong"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-muted border border-border-strong flex items-center justify-center text-primary-text">
                        <FileText className="w-6 h-6" />
                      </div>
                    )}
                    <div className="truncate">
                      <div className="text-xs font-bold text-foreground truncate">{fileName}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {attachmentType === 'image' ? 'Image Document' : 'Court PDF Notice'} • Ready for review
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => triggerOcrPipeline(attachmentPreview, attachmentType === 'pdf' ? 'application/pdf' : 'image/jpeg')}
                      className="px-3 py-1.5 rounded-lg border border-border hover:bg-muted text-xs text-primary-text flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Re-scan
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentStep('review')}
                      className="px-4 py-1.5 rounded-lg bg-primary-btn text-white hover:bg-primary-hover text-xs font-bold text-foreground flex items-center gap-1"
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
                  className="text-xs text-primary-text hover:underline inline-flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Manual Docket Entry (Skip AI OCR Scan)</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: PROCESSING & AI TELEMETRY */}
          {currentStep === 'processing' && (
            <div className="py-12 px-4 text-center space-y-4 bg-card border border-border shadow-sm hover:border-border-strong transition-all duration-200 rounded-2xl">
              <div className="relative w-16 h-16 mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-background-alt border border-border-strong flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-warning animate-pulse" />
                </div>
                <div className="absolute -inset-1 rounded-2xl border-2 border-t-primary-hover border-r-transparent border-b-transparent border-l-transparent animate-spin pointer-events-none" />
              </div>

              <div className="space-y-1 max-w-sm mx-auto">
                <h3 className="text-sm font-bold text-foreground font-mono">
                  JUDICIAL DOCUMENT OCR IN PROGRESS
                </h3>
                <p className="text-xs text-primary-text animate-pulse">{extractStatusText}</p>
                <p className="text-[11px] text-muted-foreground pt-2">
                  Gemini AI models are parsing court headers, FIR details, and respondent address.
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: REVIEW & EDIT FORM */}
          {currentStep === 'review' && (
            <form onSubmit={handleSaveSummon} className="space-y-6">
              {/* e-Courts QR Import Banner */}
              {importedFromECourts && eCourtsImportMeta && (
                <div
                  id="ecourts-imported-banner"
                  className="p-4 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/40 text-emerald-950 dark:text-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-emerald-950 dark:text-emerald-200">
                          ✓ Case information imported successfully
                        </h4>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-600/20 text-emerald-900 dark:text-emerald-300 border border-emerald-500/40 font-bold">
                          e-Courts
                        </span>
                      </div>
                      <p className="text-xs text-emerald-900/90 dark:text-emerald-300/90">
                        <span className="font-semibold">Source:</span> {eCourtsImportMeta.source} &nbsp;•&nbsp;{' '}
                        <span className="font-semibold">Last verified:</span> {eCourtsImportMeta.verifiedAt}
                      </p>
                      {eCourtsImportMeta.cnrNumber && (
                        <p className="text-[11px] font-mono text-emerald-800 dark:text-emerald-400">
                          CNR: {eCourtsImportMeta.cnrNumber}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSource('judicial-qr');
                        setIsQrModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-950 dark:text-emerald-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Re-scan QR</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Status & Autofill Banner */}
              {ocrMessage && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-start justify-between gap-3 ${
                    ocrSuccess
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-700/60 dark:text-emerald-200'
                      : 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-700/60 dark:text-amber-200'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {ocrSuccess ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
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

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    {!ocrSuccess && attachmentPreview && (
                      <button
                        type="button"
                        onClick={() =>
                          triggerOcrPipeline(
                            attachmentPreview,
                            attachmentPreview.startsWith('data:application/pdf') ? 'application/pdf' : 'image/jpeg'
                          )
                        }
                        className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-[11px] font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                      >
                        <Sparkles className="w-3 h-3" />
                        Retry AI Scan
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setCurrentStep('upload')}
                      className="text-[11px] underline hover:opacity-80 cursor-pointer"
                    >
                      Change Document
                    </button>
                  </div>
                </div>
              )}

              {formError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-900 dark:text-red-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{formError}</span>
                </div>
              )}

              {/* DOCUMENT EVIDENCE PREVIEW (Cropped & Original Photos) */}
              {attachmentPreview && (
                <div className="p-4 bg-card border border-border rounded-2xl space-y-3 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-primary-text uppercase tracking-wider font-mono flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4 text-emerald-500" />
                      Scanned Summon Document Evidence
                    </span>
                    {originalAttachmentPreview && (
                      <div className="flex items-center gap-1.5 bg-muted p-1 rounded-xl border border-border">
                        <button
                          type="button"
                          onClick={() => setViewingOriginalDoc(false)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                            !viewingOriginalDoc
                              ? 'bg-card text-foreground shadow-sm font-bold border border-border'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          Cropped (OCR)
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewingOriginalDoc(true)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                            viewingOriginalDoc
                              ? 'bg-card text-foreground shadow-sm font-bold border border-border'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          Original Photo
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-4 bg-neutral-950/40 p-3 rounded-xl border border-border">
                    <div className="relative group max-h-48 max-w-full overflow-hidden rounded-lg border border-border shrink-0">
                      <img
                        src={viewingOriginalDoc && originalAttachmentPreview ? originalAttachmentPreview : attachmentPreview}
                        alt="Summon evidence"
                        className="max-h-44 object-contain rounded-lg shadow-sm"
                      />
                      <div className="absolute bottom-1 right-1 px-2 py-0.5 rounded bg-black/75 text-[10px] text-white/90 font-mono">
                        {viewingOriginalDoc ? 'Original Photo' : 'Cropped for AI OCR'}
                      </div>
                    </div>

                    <div className="space-y-2 text-xs text-muted-foreground flex-1">
                      <div className="font-bold text-foreground truncate">{fileName || 'Document.jpg'}</div>
                      <p className="text-[11px] leading-relaxed">
                        {viewingOriginalDoc
                          ? 'Original uncropped photograph preserved in docket records for official judicial reference.'
                          : 'Cropped document image optimized and scanned by the AI legal docket engine.'}
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleOpenFullScreenCamera}
                          className="px-3 py-1.5 rounded-lg bg-muted hover:bg-border text-foreground text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5" /> Re-scan with Camera
                        </button>
                        {originalAttachmentPreview && (
                          <button
                            type="button"
                            onClick={() => {
                              setScannerInitialImage(originalAttachmentPreview);
                              setScannerInitialFileName(fileName);
                              setIsFullScreenScannerOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-lg border border-border hover:bg-muted text-xs font-medium text-primary-text flex items-center gap-1.5 cursor-pointer"
                          >
                            <Maximize2 className="w-3.5 h-3.5" /> Adjust Crop Box
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION A: WARRANT & CASE DETAILS */}
              <div className="space-y-3 bg-card border border-border shadow-sm hover:border-border-strong transition-all duration-200 rounded-2xl p-4 sm:p-5">
                <span className="text-xs font-bold text-primary-text uppercase tracking-wider font-mono flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-warning" />
                  A. Warrant & Case Identifiers
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground flex items-center justify-between mb-1">
                      <span>Summon / Warrant / CNR *</span>
                      {importedFromECourts && importedFields.has('summonNumber') ? (
                        <span className="text-[10px] font-mono font-semibold text-emerald-800 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-300 dark:border-emerald-700/60 flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" />
                          Imported from e-Courts
                        </span>
                      ) : detectedFields.has('summonNumber') ? (
                        <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 dark:bg-emerald-950/80 dark:text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-700/50">
                          AI Autofilled
                        </span>
                      ) : !summonNumber ? (
                        <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
                          Verify / Required
                        </span>
                      ) : null}
                    </label>
                    <input
                      type="text"
                      id="input-summon-number"
                      value={summonNumber}
                      onChange={(e) => setSummonNumber(e.target.value)}
                      placeholder="e.g. SUM/2026/0892 or CNR Number"
                      className={`w-full bg-background border rounded-xl px-3 py-2 text-xs text-foreground font-mono focus:outline-none focus:border-primary-text focus:ring-1 focus:ring-primary-text/40 transition-all ${
                        importedFromECourts && importedFields.has('summonNumber')
                          ? 'border-emerald-500/60 bg-emerald-500/[0.02]'
                          : detectedFields.has('summonNumber')
                          ? 'border-emerald-500/60'
                          : !summonNumber
                          ? 'border-amber-500/40 bg-amber-500/[0.03]'
                          : 'border-border'
                      }`}
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground flex items-center justify-between mb-1">
                      <span>Case / FIR Number *</span>
                      {importedFromECourts && importedFields.has('caseNumber') ? (
                        <span className="text-[10px] font-mono font-semibold text-emerald-800 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-300 dark:border-emerald-700/60 flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" />
                          Imported from e-Courts
                        </span>
                      ) : detectedFields.has('caseNumber') ? (
                        <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 dark:bg-emerald-950/80 dark:text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-700/50">
                          AI Autofilled
                        </span>
                      ) : !caseNumber ? (
                        <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
                          Verify / Required
                        </span>
                      ) : null}
                    </label>
                    <input
                      type="text"
                      id="input-case-number"
                      value={caseNumber}
                      onChange={(e) => setCaseNumber(e.target.value)}
                      placeholder="e.g. FIR No. 248/2025 PS Tis Hazari"
                      className={`w-full bg-background border rounded-xl px-3 py-2 text-xs text-foreground font-mono focus:outline-none focus:border-primary-text focus:ring-1 focus:ring-primary-text/40 transition-all ${
                        importedFromECourts && importedFields.has('caseNumber')
                          ? 'border-emerald-500/60 bg-emerald-500/[0.02]'
                          : detectedFields.has('caseNumber')
                          ? 'border-emerald-500/60'
                          : !caseNumber
                          ? 'border-amber-500/40 bg-amber-500/[0.03]'
                          : 'border-border'
                      }`}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Priority Urgency</label>
                    <select
                      value={urgency}
                      onChange={(e) => setUrgency(e.target.value as SummonUrgency)}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary-text focus:ring-1 focus:ring-primary-text/40 transition-all"
                    >
                      <option value="Standard">Standard</option>
                      <option value="High">High Priority</option>
                      <option value="Urgent">Urgent / Warrant</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Docket Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as SummonStatus)}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary-text focus:ring-1 focus:ring-primary-text/40 transition-all"
                    >
                      <option value="Pending">Pending Service</option>
                      <option value="Upcoming">Upcoming Court</option>
                      <option value="Completed">Completed / Served</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Issue Date</label>
                    <input
                      type="date"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground font-mono focus:outline-none focus:border-primary-text focus:ring-1 focus:ring-primary-text/40 transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground flex items-center justify-between mb-1">
                      <span>Hearing Date *</span>
                      {importedFromECourts && importedFields.has('hearingDate') ? (
                        <span className="text-[10px] font-mono font-semibold text-emerald-800 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-300 dark:border-emerald-700/60">
                          e-Courts
                        </span>
                      ) : detectedFields.has('hearingDate') ? (
                        <span className="text-[10px] font-mono text-emerald-800 dark:text-emerald-400">AI</span>
                      ) : null}
                    </label>
                    <input
                      type="date"
                      id="input-hearing-date"
                      value={hearingDate}
                      onChange={(e) => setHearingDate(e.target.value)}
                      className={`w-full bg-background border rounded-xl px-3 py-2 text-xs text-foreground font-mono focus:outline-none focus:border-primary-text focus:ring-1 focus:ring-primary-text/40 transition-all ${
                        importedFromECourts && importedFields.has('hearingDate')
                          ? 'border-emerald-500/60 bg-emerald-500/[0.02]'
                          : detectedFields.has('hearingDate')
                          ? 'border-emerald-500/60'
                          : 'border-border'
                      }`}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* SECTION B: RESPONDENT & SERVING ADDRESS */}
              <div className="space-y-3 bg-card border border-border shadow-sm hover:border-border-strong transition-all duration-200 rounded-2xl p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-primary-text uppercase tracking-wider font-mono flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-warning" />
                    B. Person Summoned & Official Serving Address
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsSelectPersonOpen(true)}
                      id="btn-select-someone"
                      className="px-2.5 py-1 bg-card hover:bg-muted text-foreground rounded-lg text-xs font-medium flex items-center gap-1.5 border border-border transition-colors cursor-pointer shadow-sm"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-warning" />
                      <span>Select Someone</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddPersonDirectOpen(true)}
                      id="btn-add-someone"
                      className="px-2.5 py-1 bg-primary-btn text-white hover:bg-primary-hover rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Someone</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground flex items-center justify-between mb-1">
                      <span>Respondent / Accused Full Name *</span>
                      {importedFromECourts && importedFields.has('personName') ? (
                        <span className="text-[10px] font-mono font-semibold text-emerald-800 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-300 dark:border-emerald-700/60 flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" />
                          Imported from e-Courts
                        </span>
                      ) : detectedFields.has('personName') ? (
                        <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 dark:bg-emerald-950/80 dark:text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-700/50">
                          AI Autofilled
                        </span>
                      ) : null}
                    </label>
                    <input
                      type="text"
                      id="input-person-name"
                      value={personName}
                      onChange={(e) => setPersonName(e.target.value)}
                      placeholder="e.g. Ramesh Chandra / Rajesh Gupta"
                      className={`w-full bg-background border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary-text focus:ring-1 focus:ring-primary-text/40 transition-all ${
                        importedFromECourts && importedFields.has('personName')
                          ? 'border-emerald-500/60 bg-emerald-500/[0.02]'
                          : detectedFields.has('personName')
                          ? 'border-emerald-500/60'
                          : 'border-border'
                      }`}
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground flex items-center justify-between mb-1">
                      <span>Father / Husband / Guardian Name</span>
                      {detectedFields.has('fatherName') && (
                        <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 dark:bg-emerald-950/80 dark:text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-700/50">
                          AI Autofilled
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={fatherName}
                      onChange={(e) => setFatherName(e.target.value)}
                      placeholder="e.g. Sh. Harish Chandra"
                      className={`w-full bg-background border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary-text focus:ring-1 focus:ring-primary-text/40 transition-all ${
                        detectedFields.has('fatherName') ? 'border-emerald-500/60' : 'border-border'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground flex items-center justify-between mb-1">
                    <span className="font-semibold text-foreground">Complete Delivery / Serving Address *</span>
                    {detectedFields.has('address') && (
                      <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 dark:bg-emerald-950/80 dark:text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-700/50">
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
                    className={`w-full bg-background border rounded-xl p-3 text-xs text-foreground leading-relaxed focus:outline-none focus:border-primary-text focus:ring-1 focus:ring-primary-text/40 transition-all ${
                      detectedFields.has('address') ? 'border-emerald-500/60' : 'border-border'
                    }`}
                    required
                  />
                </div>
              </div>

              {/* SECTION C: COURT & CHARGES */}
              <div className="space-y-3 bg-card border border-border shadow-sm hover:border-border-strong transition-all duration-200 rounded-2xl p-4 sm:p-5">
                <span className="text-xs font-bold text-primary-text uppercase tracking-wider font-mono flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-warning" />
                  C. Judicial Court & Offense Sections
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground flex items-center justify-between mb-1">
                      <span>Court / Bench Name *</span>
                      {importedFromECourts && importedFields.has('courtName') ? (
                        <span className="text-[10px] font-mono font-semibold text-emerald-800 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-300 dark:border-emerald-700/60 flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" />
                          Imported from e-Courts
                        </span>
                      ) : detectedFields.has('courtName') ? (
                        <span className="text-[10px] font-mono text-emerald-800 dark:text-emerald-400">AI</span>
                      ) : null}
                    </label>
                    <input
                      type="text"
                      id="input-court-name"
                      value={courtName}
                      onChange={(e) => setCourtName(e.target.value)}
                      placeholder="e.g. Chief Metropolitan Magistrate Court"
                      className={`w-full bg-background border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary-text focus:ring-1 focus:ring-primary-text/40 transition-all ${
                        importedFromECourts && importedFields.has('courtName')
                          ? 'border-emerald-500/60 bg-emerald-500/[0.02]'
                          : 'border-border'
                      }`}
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground flex items-center justify-between mb-1">
                      <span>Court Room / Complex Location</span>
                      {importedFromECourts && importedFields.has('courtAddress') && (
                        <span className="text-[10px] font-mono font-semibold text-emerald-800 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-300 dark:border-emerald-700/60">
                          e-Courts
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={courtAddress}
                      onChange={(e) => setCourtAddress(e.target.value)}
                      placeholder="e.g. Room No. 14, Tis Hazari Courts Complex, Delhi"
                      className={`w-full bg-background border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary-text focus:ring-1 focus:ring-primary-text/40 transition-all ${
                        importedFromECourts && importedFields.has('courtAddress')
                          ? 'border-emerald-500/60 bg-emerald-500/[0.02]'
                          : 'border-border'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground flex items-center justify-between mb-1">
                      <span>Police Station</span>
                      {importedFromECourts && importedFields.has('policeStation') && (
                        <span className="text-[10px] font-mono font-semibold text-emerald-800 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-300 dark:border-emerald-700/60">
                          e-Courts
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={policeStation}
                      onChange={(e) => setPoliceStation(e.target.value)}
                      placeholder="e.g. PS Tis Hazari"
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary-text focus:ring-1 focus:ring-primary-text/40 transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground flex items-center justify-between mb-1">
                      <span>District</span>
                      {importedFromECourts && importedFields.has('district') && (
                        <span className="text-[10px] font-mono font-semibold text-emerald-800 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-300 dark:border-emerald-700/60">
                          e-Courts
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      placeholder="e.g. Central Delhi"
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary-text focus:ring-1 focus:ring-primary-text/40 transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground flex items-center justify-between mb-1">
                      <span>State</span>
                      {importedFromECourts && importedFields.has('state') && (
                        <span className="text-[10px] font-mono font-semibold text-emerald-800 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-300 dark:border-emerald-700/60">
                          e-Courts
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="e.g. Delhi NCT"
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary-text focus:ring-1 focus:ring-primary-text/40 transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground flex items-center justify-between mb-1">
                      <span>Issuing Authority</span>
                      {importedFromECourts && importedFields.has('issuingAuthority') && (
                        <span className="text-[10px] font-mono font-semibold text-emerald-800 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-300 dark:border-emerald-700/60">
                          e-Courts
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={issuingAuthority}
                      onChange={(e) => setIssuingAuthority(e.target.value)}
                      placeholder="e.g. Judicial Magistrate 1st Class"
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary-text focus:ring-1 focus:ring-primary-text/40 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground flex items-center justify-between mb-1">
                    <span>Offense / Legal Sections (IPC / BNS / NI Act)</span>
                    {importedFromECourts && importedFields.has('offenseCharges') && (
                      <span className="text-[10px] font-mono font-semibold text-emerald-800 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-300 dark:border-emerald-700/60">
                        e-Courts
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={offenseCharges}
                    onChange={(e) => setOffenseCharges(e.target.value)}
                    placeholder="e.g. Under Section 138 NI Act / 420 IPC"
                    className={`w-full bg-background border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary-text focus:ring-1 focus:ring-primary-text/40 transition-all ${
                      importedFromECourts && importedFields.has('offenseCharges')
                        ? 'border-emerald-500/60 bg-emerald-500/[0.02]'
                        : 'border-border'
                    }`}
                  />
                </div>
              </div>


              {/* SECTION D: SUMMONS PHOTO (OPTIONAL) */}
              <div className="space-y-3 bg-card border border-border shadow-sm hover:border-border-strong transition-all duration-200 rounded-2xl p-4 sm:p-5">
                <span className="text-xs font-bold text-primary-text uppercase tracking-wider font-mono flex items-center gap-2">
                  <ImageIcon className="w-3.5 h-3.5 text-warning" />
                  D. Summons Photo (Optional)
                </span>
                
                {attachmentPreview && attachmentType === 'image' ? (
                  <div className="space-y-3">
                    <div className="relative aspect-video max-h-48 bg-black rounded-xl overflow-hidden border border-border flex items-center justify-center">
                      <img src={attachmentPreview} alt="Summons Preview" className="max-w-full max-h-full object-contain" />
                    </div>
                    <div className="flex items-center justify-center gap-3">
                      <label
                        htmlFor="manual-replace-photo"
                        className="px-4 py-2 rounded-xl border border-border hover:bg-muted text-foreground text-[11px] font-medium cursor-pointer transition-colors"
                      >
                        <input
                          id="manual-replace-photo"
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                        Replace Photo
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setAttachmentPreview(null);
                          setRawFile(null);
                          setAttachmentType(null);
                          setFileName('');
                        }}
                        className="px-4 py-2 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-[11px] font-medium cursor-pointer transition-colors"
                      >
                        Remove Photo
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 border border-dashed border-border rounded-xl bg-background/50">
                    <div className="p-3 rounded-full bg-muted text-muted-foreground mb-3">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <p className="text-xs text-muted-foreground text-center max-w-[250px] mb-4">
                      Optionally attach a clear photo of the original summons for future reference.
                    </p>
                    <label
                      htmlFor="manual-add-photo"
                      className="px-5 py-2 rounded-xl bg-primary-btn text-white hover:bg-primary-hover text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm transition-all"
                    >
                      <input
                        id="manual-add-photo"
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <Plus className="w-4 h-4" />
                      Add Photo
                    </label>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep('upload')}
                  className="px-4 py-2.5 rounded-xl border border-border hover:bg-muted text-xs font-medium text-foreground flex items-center gap-1.5 transition-colors cursor-pointer"
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
                    className="px-4 py-2.5 rounded-xl border border-border hover:bg-muted text-xs text-muted-foreground transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    id="btn-save-summon-submit"
                    className="px-6 py-2.5 rounded-xl bg-primary-btn text-white hover:bg-primary-hover text-xs font-bold flex items-center gap-2 shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {saveSuccess ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Saved ✓</span>
                      </>
                    ) : isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>{importedFromECourts ? 'Save Case' : 'Save Summons'}</span>
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
      {cropImageSrc && (
        <ImageCropperModal
          isOpen={!!cropImageSrc}
          onClose={() => setCropImageSrc(null)}
          imageSrc={cropImageSrc}
          onCropComplete={handleCropComplete}
        />
      )}

      {/* Dedicated Mobile Full-Screen Camera Document Scanner: mounts ONLY when opened */}
      {isFullScreenScannerOpen && (
        <DocumentCameraScanner
          isOpen={isFullScreenScannerOpen}
          onClose={() => {
            setIsFullScreenScannerOpen(false);
            setScannerInitialImage(null);
            setScannerInitialFileName(undefined);
          }}
          onScanComplete={handleScannerComplete}
          initialImageSrc={scannerInitialImage}
          initialFileName={scannerInitialFileName}
        />
      )}

      {/* Dedicated Judicial QR & CNR Scanner Modal */}
      {isQrModalOpen && (
        <JudicialQrScannerModal
          isOpen={isQrModalOpen}
          onClose={() => setIsQrModalOpen(false)}
          onUseCaseDetails={(caseData, rawPayload) => {
            handleApplyCaseDetails(caseData, rawPayload);
          }}
          onScanSuccess={(payload) => {
            setIsQrModalOpen(false);
            handleDecodedQr(payload);
          }}
          onManualEntryFallback={() => {
            setIsQrModalOpen(false);
            setCurrentStep('review');
          }}
        />
      )}
    </div>
  );
};
