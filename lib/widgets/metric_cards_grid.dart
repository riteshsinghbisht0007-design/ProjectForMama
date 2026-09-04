import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../providers/summon_provider.dart';
import '../theme/app_theme.dart';

class MetricCardsGrid extends StatelessWidget {
  const MetricCardsGrid({super.key});

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<SummonProvider>();
    final activeFilter = provider.selectedFilter;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Section Header
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Summon Overview',
              style: GoogleFonts.inter(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: AppColors.onSurface,
                letterSpacing: -0.2,
              ),
            ),
            Text(
              'REAL-TIME DATA',
              style: GoogleFonts.jetBrainsMono(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: AppColors.onSurfaceVariant,
                letterSpacing: 0.5,
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),

        // Row 1: 3 Column Cards (Total, Pending, Due Today)
        Row(
          children: [
            // Total Card
            Expanded(
              child: _buildTopMetricCard(
                label: 'Total',
                value: '${provider.totalCount}',
                valueColor: AppColors.onSurface,
                icon: Icons.folder_open_outlined,
                iconColor: AppColors.primary,
                isSelected: activeFilter == 'All',
                activeBorderColor: AppColors.primary,
                onTap: () => provider.setFilter('All'),
              ),
            ),
            const SizedBox(width: 8),

            // Pending Card
            Expanded(
              child: _buildTopMetricCard(
                label: 'Pending',
                value: '${provider.pendingCount}',
                valueColor: AppColors.tertiary,
                icon: Icons.schedule_rounded,
                iconColor: AppColors.tertiary,
                isSelected: activeFilter == 'Pending',
                activeBorderColor: AppColors.tertiary,
                onTap: () => provider.setFilter('Pending'),
              ),
            ),
            const SizedBox(width: 8),

            // Due Today Card
            Expanded(
              child: _buildTopMetricCard(
                label: 'Due Today',
                value: '${provider.dueTodayCount}',
                valueColor: AppColors.error,
                icon: Icons.warning_amber_rounded,
                iconColor: AppColors.error,
                isSelected: activeFilter == 'Due Today',
                activeBorderColor: AppColors.error,
                onTap: () => provider.setFilter('Due Today'),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),

        // Row 2: 2 Column Cards (Overdue, Completed)
        Row(
          children: [
            // Overdue Card
            Expanded(
              child: _buildBottomMetricCard(
                label: 'Overdue',
                value: '${provider.overdueCount}',
                valueColor: AppColors.errorUrgent,
                icon: Icons.error_outline_rounded,
                iconColor: AppColors.errorUrgent,
                iconBgColor: AppColors.errorContainer.withValues(alpha: 0.3),
                isSelected: activeFilter == 'Overdue',
                activeBorderColor: AppColors.errorUrgent,
                onTap: () => provider.setFilter('Overdue'),
              ),
            ),
            const SizedBox(width: 8),

            // Completed Card
            Expanded(
              child: _buildBottomMetricCard(
                label: 'Completed',
                value: '${provider.completedCount}',
                valueColor: AppColors.success,
                icon: Icons.task_alt_rounded,
                iconColor: AppColors.success,
                iconBgColor: AppColors.successContainer.withValues(alpha: 0.4),
                isSelected: activeFilter == 'Completed',
                activeBorderColor: AppColors.success,
                onTap: () => provider.setFilter('Completed'),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildTopMetricCard({
    required String label,
    required String value,
    required Color valueColor,
    required IconData icon,
    required Color iconColor,
    required bool isSelected,
    required Color activeBorderColor,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.surfaceContainerHigh : AppColors.surfaceContainer,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? activeBorderColor : AppColors.outlineVariant,
            width: isSelected ? 1.5 : 1,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: activeBorderColor.withValues(alpha: 0.15),
                    blurRadius: 8,
                    spreadRadius: 0,
                  ),
                ]
              : null,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              label,
              style: GoogleFonts.inter(
                fontSize: 12,
                fontWeight: FontWeight.w400,
                color: AppColors.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [
                Text(
                  value,
                  style: GoogleFonts.jetBrainsMono(
                    fontSize: 22,
                    fontWeight: FontWeight.w700,
                    color: valueColor,
                  ),
                ),
                Icon(
                  icon,
                  size: 16,
                  color: iconColor,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBottomMetricCard({
    required String label,
    required String value,
    required Color valueColor,
    required IconData icon,
    required Color iconColor,
    required Color iconBgColor,
    required bool isSelected,
    required Color activeBorderColor,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.surfaceContainerHigh : AppColors.surfaceContainer,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? activeBorderColor : AppColors.outlineVariant,
            width: isSelected ? 1.5 : 1,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: activeBorderColor.withValues(alpha: 0.15),
                    blurRadius: 8,
                    spreadRadius: 0,
                  ),
                ]
              : null,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    fontWeight: FontWeight.w400,
                    color: AppColors.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: GoogleFonts.jetBrainsMono(
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                    color: valueColor,
                  ),
                ),
              ],
            ),
            Container(
              padding: const EdgeInsets.all(7),
              decoration: BoxDecoration(
                color: iconBgColor,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                icon,
                size: 20,
                color: iconColor,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
