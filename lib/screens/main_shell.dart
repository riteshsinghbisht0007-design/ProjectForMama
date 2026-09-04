import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/summon_provider.dart';
import '../theme/app_theme.dart';
import '../widgets/create_summon_sheet.dart';
import '../widgets/top_app_bar.dart';
import 'alerts_screen.dart';
import 'calendar_screen.dart';
import 'dashboard_screen.dart';
import 'profile_screen.dart';
import 'summons_list_screen.dart';

class MainShell extends StatefulWidget {
  const MainShell({super.key});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  static const List<Widget> _screens = [
    DashboardScreen(),
    CalendarScreen(),
    SummonsListScreen(),
    AlertsScreen(),
    ProfileScreen(),
  ];

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final user = context.watch<AuthProvider>().currentUser;
    context.read<SummonProvider>().setUser(user);
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<SummonProvider>();
    final currentIndex = provider.activeNavIndex;
    final alertsCount = provider.alerts.length;

    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: TopAppBar(
        onNotificationsTap: () => provider.setNavIndex(3),
      ),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 600),
          child: IndexedStack(
            index: currentIndex,
            children: _screens,
          ),
        ),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.endFloat,
      floatingActionButton: Padding(
        padding: const EdgeInsets.only(bottom: 58, right: 6),
        child: SizedBox(
          width: 54,
          height: 54,
          child: FloatingActionButton(
            onPressed: () {
              showModalBottomSheet(
                context: context,
                isScrollControlled: true,
                backgroundColor: Colors.transparent,
                builder: (context) => const CreateSummonSheet(),
              );
            },
            backgroundColor: AppColors.secondary,
            foregroundColor: AppColors.onSecondary,
            elevation: 8,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Icon(Icons.add_rounded, size: 28),
          ),
        ),
      ),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: AppColors.surfaceContainer,
          border: Border(
            top: BorderSide(color: AppColors.outlineVariant, width: 1),
          ),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: SafeArea(
          top: false,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildNavItem(
                index: 0,
                icon: Icons.dashboard_rounded,
                label: 'Dashboard',
                isActive: currentIndex == 0,
                onTap: () => provider.setNavIndex(0),
              ),
              _buildNavItem(
                index: 1,
                icon: Icons.calendar_month_outlined,
                label: 'Calendar',
                isActive: currentIndex == 1,
                onTap: () => provider.setNavIndex(1),
              ),
              _buildNavItem(
                index: 2,
                icon: Icons.assignment_outlined,
                label: 'Summons',
                isActive: currentIndex == 2,
                onTap: () => provider.setNavIndex(2),
              ),
              _buildNavItem(
                index: 3,
                icon: Icons.notifications_outlined,
                label: 'Alerts',
                badgeCount: alertsCount > 0 ? alertsCount : null,
                isActive: currentIndex == 3,
                onTap: () => provider.setNavIndex(3),
              ),
              _buildNavItem(
                index: 4,
                icon: Icons.person_outline_rounded,
                label: 'Profile',
                isActive: currentIndex == 4,
                onTap: () => provider.setNavIndex(4),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem({
    required int index,
    required IconData icon,
    required String label,
    required bool isActive,
    required VoidCallback onTap,
    int? badgeCount,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: EdgeInsets.symmetric(horizontal: isActive ? 16 : 12, vertical: 6),
        decoration: BoxDecoration(
          color: isActive ? AppColors.secondaryContainer : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Stack(
              clipBehavior: Clip.none,
              children: [
                Icon(
                  icon,
                  size: 22,
                  color: isActive ? AppColors.onSecondaryContainer : AppColors.onSurfaceVariant,
                ),
                if (badgeCount != null)
                  Positioned(
                    top: -4,
                    right: -7,
                    child: Container(
                      padding: const EdgeInsets.all(3),
                      decoration: const BoxDecoration(
                        color: AppColors.errorUrgent,
                        shape: BoxShape.circle,
                      ),
                      constraints: const BoxConstraints(minWidth: 14, minHeight: 14),
                      child: Text(
                        '$badgeCount',
                        textAlign: TextAlign.center,
                        style: GoogleFonts.jetBrainsMono(
                          fontSize: 9,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textBright,
                          height: 1,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 3),
            Text(
              label,
              style: GoogleFonts.inter(
                fontSize: 10,
                fontWeight: isActive ? FontWeight.w600 : FontWeight.w400,
                color: isActive ? AppColors.onSecondaryContainer : AppColors.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
