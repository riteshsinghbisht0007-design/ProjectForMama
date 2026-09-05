import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../models/summon_model.dart';
import '../providers/summon_provider.dart';
import '../theme/app_theme.dart';
import '../widgets/create_summon_sheet.dart';
import '../widgets/summon_card.dart';

class CalendarScreen extends StatefulWidget {
  const CalendarScreen({super.key});

  @override
  State<CalendarScreen> createState() => _CalendarScreenState();
}

class _CalendarScreenState extends State<CalendarScreen> {
  DateTime _currentMonth = DateTime(DateTime.now().year, DateTime.now().month, 1);
  DateTime _selectedDate = DateTime(DateTime.now().year, DateTime.now().month, DateTime.now().day);

  void _previousMonth() {
    setState(() {
      _currentMonth = DateTime(_currentMonth.year, _currentMonth.month - 1, 1);
    });
  }

  void _nextMonth() {
    setState(() {
      _currentMonth = DateTime(_currentMonth.year, _currentMonth.month + 1, 1);
    });
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<SummonProvider>();
    final allSummons = provider.allSummons;
    final selectedDaySummons = provider.getSummonsForDate(_selectedDate);

    final daysInMonth = DateUtils.getDaysInMonth(_currentMonth.year, _currentMonth.month);
    final firstDayWeekday = _currentMonth.weekday; // 1 = Monday, 7 = Sunday
    final today = DateTime.now();

    return SingleChildScrollView(
      padding: const EdgeInsets.only(left: 16, right: 16, top: 14, bottom: 100),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Screen Title
          Text(
            'Court Hearing Calendar',
            style: GoogleFonts.inter(
              fontSize: 20,
              fontWeight: FontWeight.w700,
              color: AppColors.onSurface,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Monthly judicial schedule & scheduled appearance registry',
            style: GoogleFonts.inter(
              fontSize: 12,
              fontWeight: FontWeight.w400,
              color: AppColors.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 16),

          // Monthly Calendar Card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.surfaceContainer,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.outlineVariant, width: 1),
            ),
            child: Column(
              children: [
                // Month Header & Navigation
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    IconButton(
                      icon: const Icon(Icons.chevron_left_rounded, color: AppColors.onSurfaceVariant),
                      onPressed: _previousMonth,
                    ),
                    Text(
                      DateFormat('MMMM yyyy').format(_currentMonth),
                      style: GoogleFonts.inter(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: AppColors.onSurface,
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.chevron_right_rounded, color: AppColors.onSurfaceVariant),
                      onPressed: _nextMonth,
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Weekday Labels Row
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) {
                    return SizedBox(
                      width: 38,
                      child: Text(
                        day,
                        textAlign: TextAlign.center,
                        style: GoogleFonts.jetBrainsMono(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textMuted,
                        ),
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 8),

                // Calendar Days Grid
                GridView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 7,
                    mainAxisSpacing: 6,
                    crossAxisSpacing: 6,
                    childAspectRatio: 1.0,
                  ),
                  itemCount: 42, // 6 weeks
                  itemBuilder: (context, index) {
                    final dayOffset = index - (firstDayWeekday - 1);
                    if (dayOffset < 0 || dayOffset >= daysInMonth) {
                      return const SizedBox.shrink();
                    }

                    final date = DateTime(_currentMonth.year, _currentMonth.month, dayOffset + 1);
                    final isToday = date.year == today.year && date.month == today.month && date.day == today.day;
                    final isSelected = date.year == _selectedDate.year && date.month == _selectedDate.month && date.day == _selectedDate.day;

                    // Check if there are summons on this day
                    final daySummons = provider.getSummonsForDate(date);
                    final hasEvents = daySummons.isNotEmpty;

                    return GestureDetector(
                      onTap: () {
                        setState(() {
                          _selectedDate = date;
                        });
                      },
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 150),
                        decoration: BoxDecoration(
                          color: isSelected
                              ? AppColors.secondaryContainer
                              : isToday
                                  ? AppColors.surfaceContainerHigh
                                  : Colors.transparent,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: isSelected
                                ? AppColors.secondary
                                : isToday
                                    ? AppColors.primary
                                    : Colors.transparent,
                            width: 1,
                          ),
                        ),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              '${date.day}',
                              style: GoogleFonts.jetBrainsMono(
                                fontSize: 13,
                                fontWeight: isSelected || isToday ? FontWeight.w700 : FontWeight.w500,
                                color: isSelected
                                    ? AppColors.onSecondaryContainer
                                    : isToday
                                        ? AppColors.primary
                                        : AppColors.onSurface,
                              ),
                            ),
                            if (hasEvents)
                              Container(
                                margin: const EdgeInsets.only(top: 2),
                                width: 5,
                                height: 5,
                                decoration: BoxDecoration(
                                  color: daySummons.any((s) => s.urgency == UrgencyLevel.urgent)
                                      ? AppColors.errorUrgent
                                      : AppColors.tertiary,
                                  shape: BoxShape.circle,
                                ),
                              ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Selected Day Header & Hearings
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Hearings for ${DateFormat('MMMM dd, yyyy').format(_selectedDate)}',
                style: GoogleFonts.inter(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: AppColors.onSurface,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppColors.surfaceContainerHigh,
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  '${selectedDaySummons.length} HEARINGS',
                  style: GoogleFonts.jetBrainsMono(
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                    color: AppColors.primary,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Hearings List or Empty Day State
          if (selectedDaySummons.isEmpty)
            Container(
              padding: const EdgeInsets.all(28),
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: AppColors.surfaceContainer,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.outlineVariant),
              ),
              child: Column(
                children: [
                  const Icon(Icons.event_available_rounded, size: 36, color: AppColors.onSurfaceVariant),
                  const SizedBox(height: 8),
                  Text(
                    'No court hearings scheduled for this date',
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: AppColors.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(height: 12),
                  OutlinedButton.icon(
                    onPressed: () {
                      showModalBottomSheet(
                        context: context,
                        isScrollControlled: true,
                        backgroundColor: Colors.transparent,
                        builder: (context) => const CreateSummonSheet(),
                      );
                    },
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: AppColors.outlineVariant),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    icon: const Icon(Icons.add_rounded, size: 16),
                    label: const Text('Schedule Summon for this Date'),
                  ),
                ],
              ),
            )
          else
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: selectedDaySummons.length,
              separatorBuilder: (context, index) => const SizedBox(height: 12),
              itemBuilder: (context, index) => SummonCard(summon: selectedDaySummons[index]),
            ),
        ],
      ),
    );
  }
}
