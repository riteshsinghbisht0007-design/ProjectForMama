import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/summon_provider.dart';
import '../theme/app_theme.dart';

class OfficerGreetingCard extends StatelessWidget {
  const OfficerGreetingCard({super.key});

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().currentUser;
    final timeGreeting = SummonProvider.getTimeOfDayGreeting();

    final displayName = user != null ? user.firstName : 'User';
    final badgeNumber = user != null ? 'Badge #${user.badgeNumber}' : 'Badge #4092';
    final department = user != null
        ? 'DEPARTMENT: ${user.department.toUpperCase()}'
        : 'DEPARTMENT: CENTRAL PRECINCT #4';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Top Status Bar (Cloud Synced + Badge ID)
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
          decoration: BoxDecoration(
            color: AppColors.surfaceContainerLow,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: AppColors.outlineVariant, width: 1),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // Cloud Sync Status
              Row(
                children: [
                  const Icon(
                    Icons.cloud_done_rounded,
                    size: 15,
                    color: AppColors.primary,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    'Cloud Synced • Just now',
                    style: GoogleFonts.jetBrainsMono(
                      fontSize: 11,
                      fontWeight: FontWeight.w500,
                      color: AppColors.onSurfaceVariant,
                    ),
                  ),
                ],
              ),

              // Badge Number
              Row(
                children: [
                  const Icon(
                    Icons.vpn_key_rounded,
                    size: 14,
                    color: AppColors.tertiary,
                  ),
                  const SizedBox(width: 5),
                  Text(
                    badgeNumber,
                    style: GoogleFonts.jetBrainsMono(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: AppColors.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 10),

        // Main Greeting Card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.surfaceContainer,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.outlineVariant, width: 1),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // Left: Department and Dynamic Time Greeting ("Good Evening, Ritesh 👋")
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      department,
                      style: GoogleFonts.jetBrainsMono(
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 0.6,
                        color: AppColors.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '$timeGreeting, $displayName 👋',
                      style: GoogleFonts.inter(
                        fontSize: 19,
                        fontWeight: FontWeight.w700,
                        letterSpacing: -0.3,
                        color: AppColors.onSurface,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),

              // Right: User Avatar
              Container(
                width: 50,
                height: 50,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: AppColors.primary, width: 2),
                  color: AppColors.surfaceVariant,
                ),
                child: ClipOval(
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      Container(
                        color: AppColors.secondaryContainer,
                      ),
                      Text(
                        displayName.isNotEmpty ? displayName[0].toUpperCase() : 'U',
                        style: GoogleFonts.inter(
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                          color: AppColors.onSecondaryContainer,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
