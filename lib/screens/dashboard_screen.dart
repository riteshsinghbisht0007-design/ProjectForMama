import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/summon_provider.dart';
import '../theme/app_theme.dart';
import '../widgets/create_summon_sheet.dart';
import '../widgets/metric_cards_grid.dart';
import '../widgets/officer_greeting_card.dart';
import '../widgets/summon_card.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<SummonProvider>();
    final user = context.watch<AuthProvider>().currentUser;
    final summons = provider.filteredSummons;

    final userName = user != null ? user.name : 'Officer';

    return RefreshIndicator(
      color: AppColors.secondary,
      backgroundColor: AppColors.surfaceContainer,
      onRefresh: () async {
        await Future.delayed(const Duration(milliseconds: 500));
      },
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.only(
          left: 16,
          right: 16,
          top: 14,
          bottom: 100,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Dynamic Officer Profile & Sync Banner
            const OfficerGreetingCard(),
            const SizedBox(height: 18),

            // Summary Metrics Overview Grid (Calculated dynamically)
            const MetricCardsGrid(),
            const SizedBox(height: 22),

            // Today's Summons Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Text(
                      "Today's Summons",
                      style: GoogleFonts.inter(
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                        color: AppColors.onSurface,
                        letterSpacing: -0.2,
                      ),
                    ),
                    if (provider.selectedFilter != 'All') ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppColors.secondaryContainer,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          provider.selectedFilter.toUpperCase(),
                          style: GoogleFonts.jetBrainsMono(
                            fontSize: 9,
                            fontWeight: FontWeight.w700,
                            color: AppColors.onSecondaryContainer,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
                Text(
                  '${summons.length} PENDING',
                  style: GoogleFonts.jetBrainsMono(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: AppColors.primary,
                    letterSpacing: 0.5,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Summons List or Fresh Account Empty State
            if (summons.isEmpty)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 36),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: AppColors.surfaceContainer,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.outlineVariant.withValues(alpha: 0.6)),
                ),
                child: Column(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceContainerLow,
                        shape: BoxShape.circle,
                        border: Border.all(color: AppColors.outlineVariant),
                      ),
                      child: const Icon(
                        Icons.assignment_add,
                        size: 36,
                        color: AppColors.primary,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Welcome to SummonMitra, $userName!',
                      textAlign: TextAlign.center,
                      style: GoogleFonts.inter(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: AppColors.onSurface,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'No summons issued or pending yet. Tap the button below to create, scan, or import your first summon.',
                      textAlign: TextAlign.center,
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        fontWeight: FontWeight.w400,
                        color: AppColors.onSurfaceVariant,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 18),
                    ElevatedButton.icon(
                      onPressed: () {
                        showModalBottomSheet(
                          context: context,
                          isScrollControlled: true,
                          backgroundColor: Colors.transparent,
                          builder: (context) => const CreateSummonSheet(),
                        );
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.secondary,
                        foregroundColor: AppColors.onSecondary,
                        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        elevation: 0,
                      ),
                      icon: const Icon(Icons.add_rounded, size: 18),
                      label: Text(
                        'Create First Summon',
                        style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w700),
                      ),
                    ),
                  ],
                ),
              )
            else
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: summons.length,
                separatorBuilder: (context, index) => const SizedBox(height: 12),
                itemBuilder: (context, index) {
                  return SummonCard(summon: summons[index]);
                },
              ),
          ],
        ),
      ),
    );
  }
}
