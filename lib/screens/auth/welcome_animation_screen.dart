import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_theme.dart';

class WelcomeAnimationScreen extends StatefulWidget {
  final VoidCallback onContinue;

  const WelcomeAnimationScreen({super.key, required this.onContinue});

  @override
  State<WelcomeAnimationScreen> createState() => _WelcomeAnimationScreenState();
}

class _WelcomeAnimationScreenState extends State<WelcomeAnimationScreen> with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  late Animation<double> _logoScale;
  late Animation<double> _logoOpacity;

  late Animation<Offset> _greetingSlide;
  late Animation<double> _greetingOpacity;

  late Animation<Offset> _welcomeSlide;
  late Animation<double> _welcomeOpacity;

  late Animation<Offset> _descSlide;
  late Animation<double> _descOpacity;

  late Animation<double> _buttonOpacity;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 3200),
    );

    // Step 1: Logo animation (0.0 to 0.3)
    _logoScale = Tween<double>(begin: 0.6, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: const Interval(0.0, 0.3, curve: Curves.easeOutBack)),
    );
    _logoOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: const Interval(0.0, 0.25, curve: Curves.easeIn)),
    );

    // Step 2: Personalized Greeting (0.25 to 0.55)
    _greetingSlide = Tween<Offset>(begin: const Offset(0, 0.4), end: Offset.zero).animate(
      CurvedAnimation(parent: _controller, curve: const Interval(0.25, 0.55, curve: Curves.easeOutCubic)),
    );
    _greetingOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: const Interval(0.25, 0.55, curve: Curves.easeIn)),
    );

    // Step 3: Welcome title (0.50 to 0.75)
    _welcomeSlide = Tween<Offset>(begin: const Offset(0, 0.4), end: Offset.zero).animate(
      CurvedAnimation(parent: _controller, curve: const Interval(0.50, 0.75, curve: Curves.easeOutCubic)),
    );
    _welcomeOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: const Interval(0.50, 0.75, curve: Curves.easeIn)),
    );

    // Step 4: Description (0.65 to 0.90)
    _descSlide = Tween<Offset>(begin: const Offset(0, 0.3), end: Offset.zero).animate(
      CurvedAnimation(parent: _controller, curve: const Interval(0.65, 0.90, curve: Curves.easeOutCubic)),
    );
    _descOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: const Interval(0.65, 0.90, curve: Curves.easeIn)),
    );

    // Step 5: Continue Button (0.80 to 1.0)
    _buttonOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: const Interval(0.80, 1.0, curve: Curves.easeIn)),
    );

    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().currentUser;
    final userName = user != null ? user.name : 'Officer';

    return Scaffold(
      backgroundColor: AppColors.surface,
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 480),
              child: AnimatedBuilder(
                animation: _controller,
                builder: (context, child) {
                  return Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      const Spacer(),

                      // Step 1: Animated Logo Emblem
                      FadeTransition(
                        opacity: _logoOpacity,
                        child: ScaleTransition(
                          scale: _logoScale,
                          child: Container(
                            width: 88,
                            height: 88,
                            decoration: BoxDecoration(
                              color: AppColors.surfaceContainerHigh,
                              borderRadius: BorderRadius.circular(24),
                              border: Border.all(
                                color: AppColors.primary.withValues(alpha: 0.6),
                                width: 2,
                              ),
                              boxShadow: [
                                BoxShadow(
                                  color: AppColors.primary.withValues(alpha: 0.25),
                                  blurRadius: 28,
                                  spreadRadius: 4,
                                ),
                              ],
                            ),
                            child: const Icon(
                              Icons.shield_rounded,
                              color: AppColors.primary,
                              size: 48,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 32),

                      // Step 2: Personalized Greeting ("Hello Ritesh Singh Bisht 👋")
                      FadeTransition(
                        opacity: _greetingOpacity,
                        child: SlideTransition(
                          position: _greetingSlide,
                          child: Text(
                            'Hello $userName 👋',
                            textAlign: TextAlign.center,
                            style: GoogleFonts.inter(
                              fontSize: 26,
                              fontWeight: FontWeight.w800,
                              color: AppColors.onSurface,
                              letterSpacing: -0.5,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Step 3: "Welcome to SummonMitra"
                      FadeTransition(
                        opacity: _welcomeOpacity,
                        child: SlideTransition(
                          position: _welcomeSlide,
                          child: Column(
                            children: [
                              Text(
                                'Welcome to SummonMitra',
                                textAlign: TextAlign.center,
                                style: GoogleFonts.inter(
                                  fontSize: 20,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.secondary,
                                  letterSpacing: -0.2,
                                ),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                'Your Smart Summon Management Assistant',
                                textAlign: TextAlign.center,
                                style: GoogleFonts.inter(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w500,
                                  color: AppColors.tertiary,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 18),

                      // Step 4: Subtitle Description
                      FadeTransition(
                        opacity: _descOpacity,
                        child: SlideTransition(
                          position: _descSlide,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                            decoration: BoxDecoration(
                              color: AppColors.surfaceContainerLow,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: AppColors.outlineVariant.withValues(alpha: 0.6)),
                            ),
                            child: Text(
                              'Manage, track and organize your summons effortlessly.',
                              textAlign: TextAlign.center,
                              style: GoogleFonts.inter(
                                fontSize: 13,
                                fontWeight: FontWeight.w400,
                                color: AppColors.onSurfaceVariant,
                                height: 1.4,
                              ),
                            ),
                          ),
                        ),
                      ),

                      const Spacer(),

                      // Step 5: Transition Button
                      FadeTransition(
                        opacity: _buttonOpacity,
                        child: SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: widget.onContinue,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.secondary,
                              foregroundColor: AppColors.onSecondary,
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                              elevation: 4,
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  'Get Started',
                                  style: GoogleFonts.inter(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                const Icon(Icons.arrow_forward_rounded, size: 18),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],
                  );
                },
              ),
            ),
          ),
        ),
      ),
    );
  }
}
