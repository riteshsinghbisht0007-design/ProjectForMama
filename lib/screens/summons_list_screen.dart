import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../providers/summon_provider.dart';
import '../theme/app_theme.dart';
import '../widgets/summon_card.dart';

class SummonsListScreen extends StatelessWidget {
  const SummonsListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<SummonProvider>();
    final summons = provider.filteredSummons;

    final filterOptions = ['All', 'Due Today', 'Pending', 'Overdue', 'Completed', 'Urgent', 'High Priority', 'Standard'];

    return SingleChildScrollView(
      padding: const EdgeInsets.only(left: 16, right: 16, top: 14, bottom: 100),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Screen Title
          Text(
            'Summons Registry',
            style: GoogleFonts.inter(
              fontSize: 20,
              fontWeight: FontWeight.w700,
              color: AppColors.onSurface,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Search and manage enterprise law enforcement summons',
            style: GoogleFonts.inter(
              fontSize: 12,
              fontWeight: FontWeight.w400,
              color: AppColors.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 14),

          // Search Bar
          TextField(
            onChanged: provider.setSearchQuery,
            style: GoogleFonts.inter(fontSize: 13, color: AppColors.onSurface),
            decoration: InputDecoration(
              isDense: true,
              filled: true,
              fillColor: AppColors.surfaceContainer,
              hintText: 'Search FIR #, Name, or Court...',
              hintStyle: GoogleFonts.inter(fontSize: 13, color: AppColors.textMuted),
              prefixIcon: const Icon(Icons.search_rounded, size: 18, color: AppColors.onSurfaceVariant),
              suffixIcon: provider.searchQuery.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear_rounded, size: 16, color: AppColors.onSurfaceVariant),
                      onPressed: () => provider.setSearchQuery(''),
                    )
                  : null,
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: const BorderSide(color: AppColors.outlineVariant),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: const BorderSide(color: AppColors.outlineVariant),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: const BorderSide(color: AppColors.secondary, width: 1.5),
              ),
            ),
          ),
          const SizedBox(height: 12),

          // Horizontal Filter Chips
          SizedBox(
            height: 34,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: filterOptions.length,
              separatorBuilder: (context, index) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                final filter = filterOptions[index];
                final isSelected = provider.selectedFilter == filter;

                return GestureDetector(
                  onTap: () => provider.setFilter(filter),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 150),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: isSelected ? AppColors.secondaryContainer : AppColors.surfaceContainer,
                      borderRadius: BorderRadius.circular(999),
                      border: Border.all(
                        color: isSelected ? AppColors.secondary : AppColors.outlineVariant,
                        width: 1,
                      ),
                    ),
                    child: Center(
                      child: Text(
                        filter,
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                          color: isSelected ? AppColors.onSecondaryContainer : AppColors.onSurfaceVariant,
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 16),

          // Results Count
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Showing ${summons.length} records',
                style: GoogleFonts.jetBrainsMono(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: AppColors.onSurfaceVariant,
                ),
              ),
              Text(
                'Total: ${provider.totalCount}',
                style: GoogleFonts.jetBrainsMono(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: AppColors.primary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // List
          if (summons.isEmpty)
            Container(
              padding: const EdgeInsets.all(32),
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: AppColors.surfaceContainer,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.outlineVariant),
              ),
              child: Column(
                children: [
                  const Icon(Icons.folder_off_outlined, size: 40, color: AppColors.onSurfaceVariant),
                  const SizedBox(height: 8),
                  Text(
                    'No matching summon records found',
                    style: GoogleFonts.inter(fontSize: 14, color: AppColors.onSurfaceVariant),
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
              itemBuilder: (context, index) => SummonCard(summon: summons[index]),
            ),
        ],
      ),
    );
  }
}
