import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../models/summon_model.dart';
import '../theme/app_theme.dart';
import 'summon_detail_dialog.dart';

class SummonCard extends StatelessWidget {
  final SummonModel summon;

  const SummonCard({super.key, required this.summon});

  @override
  Widget build(BuildContext context) {
    final urgency = summon.urgency;

    return Container(
      decoration: BoxDecoration(
        color: AppColors.surfaceContainer,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.outlineVariant, width: 1),
      ),
      clipBehavior: Clip.antiAlias,
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Left Accent Border (Urgency Coded)
            Container(
              width: 4,
              color: urgency.color,
            ),

            // Card Body
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Top Row: Tag, FIR Number & Icon
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Row(
                          children: [
                            // Urgency Badge Pill
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2.5),
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
                                  letterSpacing: 0.5,
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),

                            // FIR Number
                            Text(
                              summon.firNumber,
                              style: GoogleFonts.jetBrainsMono(
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                                color: AppColors.onSurfaceVariant,
                              ),
                            ),
                          ],
                        ),

                        // Action Icon
                        Icon(
                          urgency.icon,
                          size: 18,
                          color: urgency.color,
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),

                    // Subject / Accused Name
                    Text(
                      summon.subjectName,
                      style: GoogleFonts.inter(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: AppColors.onSurface,
                        letterSpacing: -0.2,
                      ),
                    ),
                    const SizedBox(height: 10),

                    // Divider
                    Container(
                      height: 1,
                      color: AppColors.outlineVariant.withValues(alpha: 0.4),
                    ),
                    const SizedBox(height: 10),

                    // Court & Scheduled Time Grid
                    Row(
                      children: [
                        // Court Name
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Court Name',
                                style: GoogleFonts.inter(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w400,
                                  color: AppColors.onSurfaceVariant,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                summon.courtName,
                                style: GoogleFonts.inter(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w500,
                                  color: AppColors.onSurface,
                                ),
                              ),
                            ],
                          ),
                        ),

                        // Scheduled Time
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Scheduled Time',
                                style: GoogleFonts.inter(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w400,
                                  color: AppColors.onSurfaceVariant,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                summon.scheduledTime,
                                style: GoogleFonts.jetBrainsMono(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.onSurface,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),

                    // Footer Row: Assigned Officer & View Details Button
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        // Assigned Officer Tag
                        Row(
                          children: [
                            const Icon(
                              Icons.verified_user_outlined,
                              size: 13,
                              color: AppColors.onSurfaceVariant,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              'Assigned: ${summon.assignedOfficer}',
                              style: GoogleFonts.inter(
                                fontSize: 11,
                                fontWeight: FontWeight.w400,
                                color: AppColors.onSurfaceVariant,
                              ),
                            ),
                          ],
                        ),

                        // View Details Button
                        InkWell(
                          onTap: () {
                            showDialog(
                              context: context,
                              builder: (context) => SummonDetailDialog(summon: summon),
                            );
                          },
                          borderRadius: BorderRadius.circular(6),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                            decoration: BoxDecoration(
                              color: AppColors.secondaryContainer,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              'View Details',
                              style: GoogleFonts.inter(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: AppColors.onSecondaryContainer,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
