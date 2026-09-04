import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'providers/auth_provider.dart';
import 'providers/summon_provider.dart';
import 'screens/auth/auth_screen.dart';
import 'screens/auth/welcome_animation_screen.dart';
import 'screens/main_shell.dart';
import 'theme/app_theme.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  // Dark navigation bar and status bar for tactical theme
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: AppColors.surfaceContainer,
      systemNavigationBarIconBrightness: Brightness.light,
    ),
  );

  runApp(const SummonMitraApp());
}

class SummonMitraApp extends StatelessWidget {
  const SummonMitraApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => SummonProvider()),
      ],
      child: MaterialApp(
        title: 'SummonMitra - Smart Summon Management Assistant',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.darkTheme,
        home: const SummonMitraRoot(),
      ),
    );
  }
}

class SummonMitraRoot extends StatelessWidget {
  const SummonMitraRoot({super.key});

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();

    // 1. Initial Loading State
    if (authProvider.isLoading) {
      return Scaffold(
        backgroundColor: AppColors.surface,
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: AppColors.surfaceContainerHigh,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.primary.withValues(alpha: 0.5)),
                ),
                child: const Icon(Icons.shield_rounded, color: AppColors.primary, size: 36),
              ),
              const SizedBox(height: 16),
              Text(
                'SummonMitra',
                style: GoogleFonts.inter(
                  fontSize: 22,
                  fontWeight: FontWeight.w700,
                  color: AppColors.onSurface,
                ),
              ),
              const SizedBox(height: 16),
              const SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: AppColors.secondary,
                ),
              ),
            ],
          ),
        ),
      );
    }

    // 2. Unauthenticated -> Auth Screen (Sign In / Create Account / Google)
    if (!authProvider.isAuthenticated) {
      return const AuthScreen();
    }

    // 3. Authenticated First-Time -> Animated Welcome Screen
    if (authProvider.showWelcomeAnimation) {
      return WelcomeAnimationScreen(
        onContinue: () {
          authProvider.completeWelcomeAnimation();
        },
      );
    }

    // 4. Authenticated -> Main Dashboard Shell
    return const MainShell();
  }
}
