import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../models/summon_model.dart';
import '../providers/auth_provider.dart';
import '../providers/summon_provider.dart';
import '../services/ai_ocr_service.dart';
import '../services/qr_scanner_service.dart';
import '../theme/app_theme.dart';

class CreateSummonSheet extends StatefulWidget {
  final DateTime? initialHearingDate;

  const CreateSummonSheet({super.key, this.initialHearingDate});

  @override
  State<CreateSummonSheet> createState() => _CreateSummonSheetState();
}

class _CreateSummonSheetState extends State<CreateSummonSheet> {
  bool _isManualFormOpen = false;
  bool _isProcessingOcr = false;
  double _ocrProgress = 0.0;
  String _ocrStatusMessage = '';

  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _firController = TextEditingController(text: 'FIR #${420 + (DateTime.now().millisecond % 80)}/2024');
  final _courtController = TextEditingController(text: 'District Court 4B');
  final _timeController = TextEditingController(text: '10:30 AM');
  final _caseSectionController = TextEditingController(text: 'Section 420 / 468 IPC - Financial Fraud');
  final _stationController = TextEditingController(text: 'Central Precinct #4');
  final _addressController = TextEditingController(text: 'Judicial Complex, Sector 9');
  final _notesController = TextEditingController(text: 'Notice issued for mandatory appearance.');

  late DateTime _hearingDate;
  UrgencyLevel _selectedUrgency = UrgencyLevel.highPriority;

  @override
  void initState() {
    super.initState();
    _hearingDate = widget.initialHearingDate ?? DateTime.now().add(const Duration(days: 1));
  }

  @override
  void dispose() {
    _nameController.dispose();
    _firController.dispose();
    _courtController.dispose();
    _timeController.dispose();
    _caseSectionController.dispose();
    _stationController.dispose();
    _addressController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  // Real AI Document OCR Scan
  Future<void> _handleAiDocumentScan() async {
    final option = await showModalBottomSheet<String>(
      context: context,
      backgroundColor: AppColors.surfaceContainer,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Select Document Source',
                style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.onSurface),
              ),
              const SizedBox(height: 16),
              ListTile(
                leading: const Icon(Icons.camera_alt_outlined, color: AppColors.primary),
                title: const Text('Capture with Device Camera'),
                onTap: () => Navigator.pop(context, 'camera'),
              ),
              ListTile(
                leading: const Icon(Icons.file_upload_outlined, color: AppColors.secondary),
                title: const Text('Upload Document (PDF / Image / TXT)'),
                onTap: () => Navigator.pop(context, 'file'),
              ),
            ],
          ),
        );
      },
    );

    if (option == null) return;

    setState(() {
      _isProcessingOcr = true;
      _ocrProgress = 0.1;
      _ocrStatusMessage = 'Initializing OCR Scanner...';
    });

    OcrExtractionResult result;
    if (option == 'camera') {
      result = await AiOcrService.instance.captureFromCamera(
        onProgress: (prog, msg) {
          if (mounted) {
            setState(() {
              _ocrProgress = prog;
              _ocrStatusMessage = msg;
            });
          }
        },
      );
    } else {
      result = await AiOcrService.instance.pickAndProcessFile(
        onProgress: (prog, msg) {
          if (mounted) {
            setState(() {
              _ocrProgress = prog;
              _ocrStatusMessage = msg;
            });
          }
        },
      );
    }

    if (!mounted) return;
    setState(() => _isProcessingOcr = false);

    if (result.success) {
      setState(() {
        _isManualFormOpen = true;
        _firController.text = result.firNumber ?? _firController.text;
        _nameController.text = result.subjectName ?? _nameController.text;
        _courtController.text = result.courtName ?? _courtController.text;
        _timeController.text = result.scheduledTime ?? _timeController.text;
        _caseSectionController.text = result.caseSection ?? _caseSectionController.text;
        _addressController.text = result.deliveryAddress ?? _addressController.text;
        _selectedUrgency = result.urgency;
        if (result.hearingDate != null) _hearingDate = result.hearingDate!;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: AppColors.successContainer,
          content: Text('Document extracted successfully! Please review details below.'),
        ),
      );
    } else if (result.errorMessage != null && !result.errorMessage!.contains('cancelled')) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: AppColors.errorContainer,
          content: Text(result.errorMessage!),
        ),
      );
    }
  }

  // Real QR / Barcode Scan
  Future<void> _handleQrScan() async {
    final option = await showModalBottomSheet<String>(
      context: context,
      backgroundColor: AppColors.surfaceContainer,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Scan QR / Barcode',
                style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.onSurface),
              ),
              const SizedBox(height: 16),
              ListTile(
                leading: const Icon(Icons.qr_code_scanner_rounded, color: AppColors.tertiary),
                title: const Text('Camera QR Scanner'),
                onTap: () => Navigator.pop(context, 'camera'),
              ),
              ListTile(
                leading: const Icon(Icons.photo_library_outlined, color: AppColors.primary),
                title: const Text('Pick QR Code from Gallery'),
                onTap: () => Navigator.pop(context, 'gallery'),
              ),
            ],
          ),
        );
      },
    );

    if (option == null) return;

    QrScanResult result;
    if (option == 'camera') {
      result = await QrScannerService.instance.scanFromCamera();
    } else {
      result = await QrScannerService.instance.scanFromGallery();
    }

    if (!mounted) return;

    if (result.success) {
      setState(() {
        _isManualFormOpen = true;
        _firController.text = result.firNumber ?? _firController.text;
        _nameController.text = result.subjectName ?? _nameController.text;
        _courtController.text = result.courtName ?? _courtController.text;
        _timeController.text = result.scheduledTime ?? _timeController.text;
        _caseSectionController.text = result.caseSection ?? _caseSectionController.text;
        _addressController.text = result.deliveryAddress ?? _addressController.text;
        _selectedUrgency = result.urgency;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: AppColors.successContainer,
          content: Text('QR Code verified & metadata loaded!'),
        ),
      );
    } else if (result.errorMessage != null && !result.errorMessage!.contains('cancelled')) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: AppColors.errorContainer,
          content: Text(result.errorMessage!),
        ),
      );
    }
  }

  Future<void> _pickHearingDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _hearingDate,
      firstDate: DateTime.now().subtract(const Duration(days: 30)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      builder: (context, child) {
        return Theme(
          data: ThemeData.dark().copyWith(
            colorScheme: const ColorScheme.dark(
              primary: AppColors.secondary,
              onPrimary: AppColors.onSecondary,
              surface: AppColors.surfaceContainerHigh,
              onSurface: AppColors.onSurface,
            ),
          ),
          child: child!,
        );
      },
    );

    if (picked != null) {
      setState(() => _hearingDate = picked);
    }
  }

  Future<void> _pickHearingTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.now(),
      builder: (context, child) {
        return Theme(
          data: ThemeData.dark().copyWith(
            colorScheme: const ColorScheme.dark(
              primary: AppColors.secondary,
              onPrimary: AppColors.onSecondary,
              surface: AppColors.surfaceContainerHigh,
              onSurface: AppColors.onSurface,
            ),
          ),
          child: child!,
        );
      },
    );

    if (picked != null) {
      setState(() {
        _timeController.text = picked.format(context);
      });
    }
  }

  void _submitForm() {
    if (_formKey.currentState?.validate() ?? false) {
      final user = context.read<AuthProvider>().currentUser;
      final assignedOfficer = user != null ? user.name : 'Duty Officer';
      final policeStation = _stationController.text.trim().isNotEmpty
          ? _stationController.text.trim()
          : (user?.department ?? 'Central Precinct #4');

      final newSummon = SummonModel(
        id: 'SUM-${DateTime.now().millisecondsSinceEpoch.toString().substring(6)}',
        userId: user?.id ?? '',
        firNumber: _firController.text.trim(),
        subjectName: _nameController.text.trim(),
        courtName: _courtController.text.trim(),
        scheduledTime: _timeController.text.trim(),
        assignedOfficer: assignedOfficer,
        urgency: _selectedUrgency,
        status: SummonStatus.dueToday,
        caseSection: _caseSectionController.text.trim(),
        policeStation: policeStation,
        deliveryAddress: _addressController.text.trim(),
        hearingDate: _hearingDate,
        notes: _notesController.text.trim(),
      );

      context.read<SummonProvider>().addSummon(newSummon);
      Navigator.pop(context);

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: AppColors.successContainer,
          content: Text(
            'Summon (${newSummon.firNumber}) successfully created & saved to database!',
            style: const TextStyle(color: AppColors.onSurface),
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surfaceContainer,
        borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
        border: Border(
          top: BorderSide(color: AppColors.outlineVariant, width: 1),
          left: BorderSide(color: AppColors.outlineVariant, width: 1),
          right: BorderSide(color: AppColors.outlineVariant, width: 1),
        ),
      ),
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Modal Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  _isManualFormOpen ? 'Summon Entry Details' : 'Create New Summon',
                  style: GoogleFonts.inter(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: AppColors.onSurface,
                    letterSpacing: -0.2,
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close_rounded, color: AppColors.onSurfaceVariant, size: 20),
                  visualDensity: VisualDensity.compact,
                ),
              ],
            ),
            const Divider(color: AppColors.outlineVariant, height: 18),

            // OCR Scanning Progress Overlay
            if (_isProcessingOcr) ...[
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: AppColors.surfaceContainerLow,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.primary.withValues(alpha: 0.5)),
                ),
                child: Column(
                  children: [
                    const CircularProgressIndicator(color: AppColors.primary),
                    const SizedBox(height: 16),
                    Text(
                      _ocrStatusMessage,
                      textAlign: TextAlign.center,
                      style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.onSurface),
                    ),
                    const SizedBox(height: 10),
                    LinearProgressIndicator(
                      value: _ocrProgress,
                      backgroundColor: AppColors.surfaceContainerHighest,
                      color: AppColors.primary,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ] else if (!_isManualFormOpen) ...[
              // Option 1: AI Document Scan
              _buildOptionTile(
                icon: Icons.document_scanner_rounded,
                iconColor: AppColors.primary,
                iconBgColor: AppColors.primaryContainer,
                title: 'AI Document Scan',
                subtitle: 'Extract text & FIR details from physical warrant',
                onTap: _handleAiDocumentScan,
              ),
              const SizedBox(height: 10),

              // Option 2: QR / Barcode Scan
              _buildOptionTile(
                icon: Icons.qr_code_scanner_rounded,
                iconColor: AppColors.tertiary,
                iconBgColor: AppColors.tertiaryContainer,
                title: 'QR / Barcode Scan',
                subtitle: 'Scan judicial badge or digital case QR code',
                onTap: _handleQrScan,
              ),
              const SizedBox(height: 10),

              // Option 3: Manual Entry Form
              _buildOptionTile(
                icon: Icons.edit_note_rounded,
                iconColor: AppColors.secondary,
                iconBgColor: AppColors.secondaryContainer,
                title: 'Manual Entry',
                subtitle: 'Fill out standard secure summons docket',
                onTap: () {
                  setState(() {
                    _isManualFormOpen = true;
                  });
                },
              ),
            ] else ...[
              // Full Add New Summons Form
              Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Subject Name
                    _buildTextField(
                      controller: _nameController,
                      label: 'Subject / Accused Full Name *',
                      hint: 'e.g. Marcus Vance Sterling',
                      icon: Icons.person_outline_rounded,
                      validator: (v) => v == null || v.trim().isEmpty ? 'Please enter subject name' : null,
                    ),
                    const SizedBox(height: 12),

                    // FIR Number & Urgency
                    Row(
                      children: [
                        Expanded(
                          child: _buildTextField(
                            controller: _firController,
                            label: 'FIR / Case Number *',
                            hint: 'FIR #409/2024',
                            icon: Icons.tag_rounded,
                            isMono: true,
                            validator: (v) => v == null || v.trim().isEmpty ? 'Required' : null,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Urgency Level',
                                style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w500, color: AppColors.onSurfaceVariant),
                              ),
                              const SizedBox(height: 4),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10),
                                decoration: BoxDecoration(
                                  color: AppColors.surfaceContainerLow,
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: AppColors.outlineVariant),
                                ),
                                child: DropdownButtonHideUnderline(
                                  child: DropdownButton<UrgencyLevel>(
                                    value: _selectedUrgency,
                                    isExpanded: true,
                                    dropdownColor: AppColors.surfaceContainerHigh,
                                    items: UrgencyLevel.values.map((u) {
                                      return DropdownMenuItem(
                                        value: u,
                                        child: Text(
                                          u.label,
                                          style: GoogleFonts.jetBrainsMono(
                                            fontSize: 11,
                                            fontWeight: FontWeight.w600,
                                            color: u.color,
                                          ),
                                        ),
                                      );
                                    }).toList(),
                                    onChanged: (u) {
                                      if (u != null) {
                                        setState(() => _selectedUrgency = u);
                                      }
                                    },
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // Court Name
                    _buildTextField(
                      controller: _courtController,
                      label: 'Court Room & Judicial Bench *',
                      hint: 'District Court 4B',
                      icon: Icons.account_balance_outlined,
                      validator: (v) => v == null || v.trim().isEmpty ? 'Enter court name' : null,
                    ),
                    const SizedBox(height: 12),

                    // Hearing Date & Time Row
                    Row(
                      children: [
                        // Hearing Date Picker
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Hearing Date *',
                                style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w500, color: AppColors.onSurfaceVariant),
                              ),
                              const SizedBox(height: 4),
                              InkWell(
                                onTap: _pickHearingDate,
                                borderRadius: BorderRadius.circular(8),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                                  decoration: BoxDecoration(
                                    color: AppColors.surfaceContainerLow,
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(color: AppColors.outlineVariant),
                                  ),
                                  child: Row(
                                    children: [
                                      const Icon(Icons.calendar_month_outlined, size: 16, color: AppColors.primary),
                                      const SizedBox(width: 8),
                                      Text(
                                        DateFormat('dd MMM yyyy').format(_hearingDate),
                                        style: GoogleFonts.jetBrainsMono(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.onSurface),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 10),

                        // Hearing Time Picker
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Scheduled Time *',
                                style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w500, color: AppColors.onSurfaceVariant),
                              ),
                              const SizedBox(height: 4),
                              InkWell(
                                onTap: _pickHearingTime,
                                borderRadius: BorderRadius.circular(8),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                                  decoration: BoxDecoration(
                                    color: AppColors.surfaceContainerLow,
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(color: AppColors.outlineVariant),
                                  ),
                                  child: Row(
                                    children: [
                                      const Icon(Icons.access_time_rounded, size: 16, color: AppColors.tertiary),
                                      const SizedBox(width: 8),
                                      Text(
                                        _timeController.text,
                                        style: GoogleFonts.jetBrainsMono(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.onSurface),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // Case Section / Charges
                    _buildTextField(
                      controller: _caseSectionController,
                      label: 'Case Legal Section / Acts',
                      hint: 'IPC Section 420 / 468',
                      icon: Icons.gavel_outlined,
                    ),
                    const SizedBox(height: 12),

                    // Police Station
                    _buildTextField(
                      controller: _stationController,
                      label: 'Originating Police Station / Precinct',
                      hint: 'Central Precinct #4',
                      icon: Icons.local_police_outlined,
                    ),
                    const SizedBox(height: 12),

                    // Delivery Address
                    _buildTextField(
                      controller: _addressController,
                      label: 'Delivery & Service Address',
                      hint: 'Residential or Corporate location',
                      icon: Icons.location_on_outlined,
                    ),
                    const SizedBox(height: 12),

                    // Operational Notes
                    _buildTextField(
                      controller: _notesController,
                      label: 'Operational Notes / Reminder Instructions',
                      hint: 'High-flight risk, serve with warrant, etc.',
                      icon: Icons.notes_rounded,
                      maxLines: 2,
                    ),
                    const SizedBox(height: 20),

                    // Submit & Back Buttons
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () => setState(() => _isManualFormOpen = false),
                            style: OutlinedButton.styleFrom(
                              side: const BorderSide(color: AppColors.outlineVariant),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                              padding: const EdgeInsets.symmetric(vertical: 13),
                            ),
                            child: Text(
                              'Back',
                              style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.onSurfaceVariant),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          flex: 2,
                          child: ElevatedButton.icon(
                            onPressed: _submitForm,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.secondary,
                              foregroundColor: AppColors.onSecondary,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                              padding: const EdgeInsets.symmetric(vertical: 13),
                              elevation: 0,
                            ),
                            icon: const Icon(Icons.check_rounded, size: 18),
                            label: Text(
                              'Save & Issue Summon',
                              style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w700),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildOptionTile({
    required IconData icon,
    required Color iconColor,
    required Color iconBgColor,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.surfaceVariant,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: AppColors.outlineVariant.withValues(alpha: 0.5)),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: iconBgColor,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, color: iconColor, size: 22),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: GoogleFonts.inter(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppColors.onSurface,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      fontWeight: FontWeight.w400,
                      color: AppColors.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: AppColors.onSurfaceVariant),
          ],
        ),
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required String hint,
    required IconData icon,
    bool isMono = false,
    int maxLines = 1,
    String? Function(String?)? validator,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 11,
            fontWeight: FontWeight.w500,
            color: AppColors.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 4),
        TextFormField(
          controller: controller,
          maxLines: maxLines,
          validator: validator,
          style: isMono
              ? GoogleFonts.jetBrainsMono(fontSize: 13, color: AppColors.onSurface)
              : GoogleFonts.inter(fontSize: 13, color: AppColors.onSurface),
          decoration: InputDecoration(
            isDense: true,
            filled: true,
            fillColor: AppColors.surfaceContainerLow,
            hintText: hint,
            hintStyle: GoogleFonts.inter(fontSize: 12, color: AppColors.textMuted),
            prefixIcon: Icon(icon, size: 16, color: AppColors.onSurfaceVariant),
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: const BorderSide(color: AppColors.outlineVariant),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: const BorderSide(color: AppColors.outlineVariant),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: const BorderSide(color: AppColors.secondary, width: 1.5),
            ),
          ),
        ),
      ],
    );
  }
}
