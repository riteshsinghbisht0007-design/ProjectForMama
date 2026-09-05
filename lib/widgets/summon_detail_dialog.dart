import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../models/summon_model.dart';
import '../providers/summon_provider.dart';
import '../theme/app_theme.dart';

class SummonDetailDialog extends StatelessWidget {
  final SummonModel summon;

  const SummonDetailDialog({super.key, required this.summon});

  @override
  Widget build(BuildContext context) {
    final urgency = summon.urgency;
    final provider = context.read<SummonProvider>();

    return Dialog(
      backgroundColor: AppColors.surfaceContainer,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: AppColors.outlineVariant, width: 1),
      ),
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 480),
        padding: const EdgeInsets.all(20),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header Row
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: urgency.containerColor,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          urgency.label,
                          style: GoogleFonts.jetBrainsMono(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: urgency.onContainerColor,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        summon.firNumber,
                        style: GoogleFonts.jetBrainsMono(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: AppColors.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close_rounded, color: AppColors.onSurfaceVariant, size: 20),
                    visualDensity: VisualDensity.compact,
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Subject Name & Case Section
              Text(
                summon.subjectName,
                style: GoogleFonts.inter(
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                  color: AppColors.onSurface,
                  letterSpacing: -0.3,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                summon.caseSection.isNotEmpty ? summon.caseSection : 'Judicial Summons Notice',
                style: GoogleFonts.inter(
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  color: AppColors.tertiary,
                ),
              ),
              const SizedBox(height: 16),

              // Details Grid
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.surfaceContainerLow,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppColors.outlineVariant.withValues(alpha: 0.6), width: 1),
                ),
                child: Column(
                  children: [
                    _buildDetailRow('Court Room', summon.courtName, Icons.account_balance_outlined),
                    const Divider(color: AppColors.outlineVariant, height: 16, thickness: 0.5),
                    _buildDetailRow('Hearing Date', DateFormat('EEEE, dd MMMM yyyy').format(summon.hearingDate), Icons.calendar_today_outlined),
                    const Divider(color: AppColors.outlineVariant, height: 16, thickness: 0.5),
                    _buildDetailRow('Hearing Time', summon.scheduledTime, Icons.access_time_rounded),
                    const Divider(color: AppColors.outlineVariant, height: 16, thickness: 0.5),
                    _buildDetailRow('Originating Precinct', summon.policeStation, Icons.local_police_outlined),
                    const Divider(color: AppColors.outlineVariant, height: 16, thickness: 0.5),
                    _buildDetailRow('Assigned Officer', summon.assignedOfficer, Icons.badge_outlined),
                    const Divider(color: AppColors.outlineVariant, height: 16, thickness: 0.5),
                    _buildDetailRow('Service Address', summon.deliveryAddress.isNotEmpty ? summon.deliveryAddress : 'Standard Jurisdiction', Icons.location_on_outlined),
                  ],
                ),
              ),
              const SizedBox(height: 14),

              // Operational Notes
              Text(
                'OPERATIONAL NOTES & INSTRUCTIONS',
                style: GoogleFonts.jetBrainsMono(
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                  color: AppColors.onSurfaceVariant,
                  letterSpacing: 0.5,
                ),
              ),
              const SizedBox(height: 6),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.surfaceContainerHighest.withValues(alpha: 0.4),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppColors.outlineVariant.withValues(alpha: 0.5)),
                ),
                child: Text(
                  summon.notes.isNotEmpty ? summon.notes : 'Notice active in judicial docket.',
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    fontWeight: FontWeight.w400,
                    color: AppColors.onSurface,
                    height: 1.4,
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Action Buttons Row (Print, Delete, Mark Served)
              Row(
                children: [
                  IconButton(
                    onPressed: () async {
                      final confirm = await showDialog<bool>(
                        context: context,
                        builder: (ctx) => AlertDialog(
                          backgroundColor: AppColors.surfaceContainer,
                          title: const Text('Delete Summon Record?'),
                          content: Text('Are you sure you want to delete ${summon.firNumber}? This action cannot be undone.'),
                          actions: [
                            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
                            ElevatedButton(
                              onPressed: () => Navigator.pop(ctx, true),
                              style: ElevatedButton.styleFrom(backgroundColor: AppColors.errorUrgent),
                              child: const Text('Delete', style: TextStyle(color: Colors.white)),
                            ),
                          ],
                        ),
                      );

                      if (confirm == true) {
                        provider.deleteSummon(summon.id);
                        if (context.mounted) {
                          Navigator.pop(context);
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              backgroundColor: AppColors.errorContainer,
                              content: Text('Summon record deleted.'),
                            ),
                          );
                        }
                      }
                    },
                    icon: const Icon(Icons.delete_outline_rounded, color: AppColors.errorUrgent),
                    tooltip: 'Delete Summon',
                  ),
                  const SizedBox(width: 4),

                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () {
                        Navigator.pop(context);
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            backgroundColor: AppColors.surfaceContainerHigh,
                            content: Text('Summon order for ${summon.firNumber} generated for print/export.'),
                          ),
                        );
                      },
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: AppColors.outlineVariant),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                      icon: const Icon(Icons.print_outlined, size: 16, color: AppColors.primary),
                      label: Text(
                        'Print Order',
                        style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.primary),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),

                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () {
                        provider.updateSummonStatus(
                          summon.id,
                          summon.status == SummonStatus.completed ? SummonStatus.pending : SummonStatus.completed,
                        );
                        Navigator.pop(context);
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            backgroundColor: AppColors.successContainer,
                            content: Text(
                              summon.status == SummonStatus.completed
                                  ? 'Summon ${summon.firNumber} reopened as PENDING.'
                                  : 'Summon ${summon.firNumber} marked as SERVED & COMPLETED.',
                            ),
                          ),
                        );
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: summon.status == SummonStatus.completed ? AppColors.surfaceVariant : AppColors.secondaryContainer,
                        foregroundColor: AppColors.onSecondaryContainer,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        elevation: 0,
                      ),
                      icon: Icon(
                        summon.status == SummonStatus.completed ? Icons.replay_rounded : Icons.check_circle_outline_rounded,
                        size: 16,
                      ),
                      label: Text(
                        summon.status == SummonStatus.completed ? 'Reopen' : 'Mark Served',
                        style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value, IconData icon) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 15, color: AppColors.onSurfaceVariant),
        const SizedBox(width: 8),
        SizedBox(
          width: 120,
          child: Text(
            label,
            style: GoogleFonts.inter(
              fontSize: 12,
              fontWeight: FontWeight.w400,
              color: AppColors.onSurfaceVariant,
            ),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: GoogleFonts.inter(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: AppColors.onSurface,
            ),
          ),
        ),
      ],
    );
  }
}
