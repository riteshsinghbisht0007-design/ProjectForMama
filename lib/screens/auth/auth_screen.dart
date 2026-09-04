import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_theme.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  // Sign In Controllers
  final _signInFormKey = GlobalKey<FormState>();
  final _signInEmailController = TextEditingController();
  final _signInPasswordController = TextEditingController();

  // Sign Up Controllers
  final _signUpFormKey = GlobalKey<FormState>();
  final _signUpNameController = TextEditingController();
  final _signUpEmailController = TextEditingController();
  final _signUpPasswordController = TextEditingController();
  final _signUpConfirmPasswordController = TextEditingController();
  final _signUpDepartmentController = TextEditingController(text: 'Central Precinct #4');

  bool _obscureSignInPassword = true;
  bool _obscureSignUpPassword = true;
  bool _obscureSignUpConfirmPassword = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _signInEmailController.dispose();
    _signInPasswordController.dispose();
    _signUpNameController.dispose();
    _signUpEmailController.dispose();
    _signUpPasswordController.dispose();
    _signUpConfirmPasswordController.dispose();
    _signUpDepartmentController.dispose();
    super.dispose();
  }

  Future<void> _handleGoogleSignIn() async {
    final authProvider = context.read<AuthProvider>();
    // Prompt or authenticate with Google
    final success = await authProvider.signInWithGoogle();
    if (!mounted) return;

    if (!success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: AppColors.errorContainer,
          content: Text('Google authentication could not be completed.'),
        ),
      );
    }
  }

  Future<void> _handleEmailSignIn() async {
    if (_signInFormKey.currentState?.validate() ?? false) {
      final authProvider = context.read<AuthProvider>();
      final email = _signInEmailController.text.trim();
      final password = _signInPasswordController.text;

      final success = await authProvider.signInWithEmail(
        email: email,
        password: password,
      );

      if (!mounted) return;
      if (!success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: AppColors.errorContainer,
            content: Text('Invalid email or password. Please create an account if you are new.'),
          ),
        );
      }
    }
  }

  Future<void> _handleEmailSignUp() async {
    if (_signUpFormKey.currentState?.validate() ?? false) {
      if (_signUpPasswordController.text != _signUpConfirmPasswordController.text) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: AppColors.errorContainer,
            content: Text('Passwords do not match. Please re-enter.'),
          ),
        );
        return;
      }

      final authProvider = context.read<AuthProvider>();
      final success = await authProvider.signUpWithEmail(
        name: _signUpNameController.text.trim(),
        email: _signUpEmailController.text.trim(),
        password: _signUpPasswordController.text,
        department: _signUpDepartmentController.text.trim(),
      );

      if (!mounted) return;
      if (!success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: AppColors.errorContainer,
            content: Text('An account with this email already exists. Please Sign In.'),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();

    return Scaffold(
      backgroundColor: AppColors.surface,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // App Branding Header
                  Center(
                    child: Container(
                      width: 68,
                      height: 68,
                      decoration: BoxDecoration(
                        color: AppColors.surfaceContainerHigh,
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(color: AppColors.primary.withValues(alpha: 0.5), width: 1.5),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.primary.withValues(alpha: 0.12),
                            blurRadius: 16,
                            spreadRadius: 2,
                          ),
                        ],
                      ),
                      child: const Icon(
                        Icons.shield_rounded,
                        color: AppColors.primary,
                        size: 38,
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  Text(
                    'SummonMitra',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.inter(
                      fontSize: 28,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.5,
                      color: AppColors.onSurface,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Your Smart Summon Management Assistant',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      fontWeight: FontWeight.w400,
                      color: AppColors.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(height: 28),

                  // Continue with Google Button (Primary Action)
                  ElevatedButton(
                    onPressed: authProvider.isLoading ? null : _handleGoogleSignIn,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.surfaceContainerHighest,
                      foregroundColor: AppColors.onSurface,
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                        side: const BorderSide(color: AppColors.outlineVariant),
                      ),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          width: 20,
                          height: 20,
                          decoration: const BoxDecoration(
                            color: Colors.white,
                            shape: BoxShape.circle,
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            'G',
                            style: GoogleFonts.inter(
                              fontSize: 14,
                              fontWeight: FontWeight.w900,
                              color: const Color(0xFF4285F4),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Text(
                          'Continue with Google',
                          style: GoogleFonts.inter(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Divider
                  Row(
                    children: [
                      const Expanded(child: Divider(color: AppColors.outlineVariant)),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        child: Text(
                          'OR USE EMAIL',
                          style: GoogleFonts.jetBrainsMono(
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textMuted,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ),
                      const Expanded(child: Divider(color: AppColors.outlineVariant)),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // Auth Tabs: Sign In / Create Account
                  Container(
                    height: 44,
                    decoration: BoxDecoration(
                      color: AppColors.surfaceContainerLow,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppColors.outlineVariant),
                    ),
                    child: TabBar(
                      controller: _tabController,
                      indicator: BoxDecoration(
                        color: AppColors.secondaryContainer,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      indicatorSize: TabBarIndicatorSize.tab,
                      dividerColor: Colors.transparent,
                      labelColor: AppColors.onSecondaryContainer,
                      unselectedLabelColor: AppColors.onSurfaceVariant,
                      labelStyle: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600),
                      unselectedLabelStyle: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w400),
                      tabs: const [
                        Tab(text: 'Sign In'),
                        Tab(text: 'Create Account'),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Tab Views
                  SizedBox(
                    height: 380,
                    child: TabBarView(
                      controller: _tabController,
                      children: [
                        // 1. Sign In Tab
                        _buildSignInTab(authProvider),

                        // 2. Create Account Tab
                        _buildSignUpTab(authProvider),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSignInTab(AuthProvider authProvider) {
    return Form(
      key: _signInFormKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _buildInputLabel('Email Address'),
          const SizedBox(height: 4),
          TextFormField(
            controller: _signInEmailController,
            keyboardType: TextInputType.emailAddress,
            validator: (v) => v == null || !v.contains('@') ? 'Enter a valid email' : null,
            style: GoogleFonts.inter(fontSize: 13, color: AppColors.onSurface),
            decoration: _inputDecoration(
              hint: 'e.g. ritesh.bisht@law.gov.in',
              icon: Icons.email_outlined,
            ),
          ),
          const SizedBox(height: 14),

          _buildInputLabel('Password'),
          const SizedBox(height: 4),
          TextFormField(
            controller: _signInPasswordController,
            obscureText: _obscureSignInPassword,
            validator: (v) => v == null || v.length < 4 ? 'Enter password (min 4 chars)' : null,
            style: GoogleFonts.inter(fontSize: 13, color: AppColors.onSurface),
            decoration: _inputDecoration(
              hint: 'Enter your password',
              icon: Icons.lock_outline_rounded,
              suffix: IconButton(
                icon: Icon(
                  _obscureSignInPassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                  size: 18,
                  color: AppColors.onSurfaceVariant,
                ),
                onPressed: () => setState(() => _obscureSignInPassword = !_obscureSignInPassword),
              ),
            ),
          ),
          const SizedBox(height: 24),

          ElevatedButton(
            onPressed: authProvider.isLoading ? null : _handleEmailSignIn,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.secondary,
              foregroundColor: AppColors.onSecondary,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              elevation: 0,
            ),
            child: authProvider.isLoading
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.onSecondary),
                  )
                : Text(
                    'Sign In to SummonMitra',
                    style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildSignUpTab(AuthProvider authProvider) {
    return Form(
      key: _signUpFormKey,
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _buildInputLabel('Full Name'),
            const SizedBox(height: 4),
            TextFormField(
              controller: _signUpNameController,
              validator: (v) => v == null || v.trim().isEmpty ? 'Please enter your full name' : null,
              style: GoogleFonts.inter(fontSize: 13, color: AppColors.onSurface),
              decoration: _inputDecoration(
                hint: 'e.g. Ritesh Singh Bisht',
                icon: Icons.person_outline_rounded,
              ),
            ),
            const SizedBox(height: 12),

            _buildInputLabel('Official Email'),
            const SizedBox(height: 4),
            TextFormField(
              controller: _signUpEmailController,
              keyboardType: TextInputType.emailAddress,
              validator: (v) => v == null || !v.contains('@') ? 'Enter a valid email' : null,
              style: GoogleFonts.inter(fontSize: 13, color: AppColors.onSurface),
              decoration: _inputDecoration(
                hint: 'e.g. ritesh.bisht@law.gov.in',
                icon: Icons.email_outlined,
              ),
            ),
            const SizedBox(height: 12),

            _buildInputLabel('Password'),
            const SizedBox(height: 4),
            TextFormField(
              controller: _signUpPasswordController,
              obscureText: _obscureSignUpPassword,
              validator: (v) => v == null || v.length < 6 ? 'Password must be at least 6 characters' : null,
              style: GoogleFonts.inter(fontSize: 13, color: AppColors.onSurface),
              decoration: _inputDecoration(
                hint: 'Create strong password',
                icon: Icons.lock_outline_rounded,
                suffix: IconButton(
                  icon: Icon(
                    _obscureSignUpPassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                    size: 18,
                    color: AppColors.onSurfaceVariant,
                  ),
                  onPressed: () => setState(() => _obscureSignUpPassword = !_obscureSignUpPassword),
                ),
              ),
            ),
            const SizedBox(height: 12),

            _buildInputLabel('Confirm Password'),
            const SizedBox(height: 4),
            TextFormField(
              controller: _signUpConfirmPasswordController,
              obscureText: _obscureSignUpConfirmPassword,
              validator: (v) => v == null || v.isEmpty ? 'Please confirm password' : null,
              style: GoogleFonts.inter(fontSize: 13, color: AppColors.onSurface),
              decoration: _inputDecoration(
                hint: 'Confirm your password',
                icon: Icons.lock_clock_outlined,
                suffix: IconButton(
                  icon: Icon(
                    _obscureSignUpConfirmPassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                    size: 18,
                    color: AppColors.onSurfaceVariant,
                  ),
                  onPressed: () => setState(() => _obscureSignUpConfirmPassword = !_obscureSignUpConfirmPassword),
                ),
              ),
            ),
            const SizedBox(height: 20),

            ElevatedButton(
              onPressed: authProvider.isLoading ? null : _handleEmailSignUp,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.secondary,
                foregroundColor: AppColors.onSecondary,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                elevation: 0,
              ),
              child: authProvider.isLoading
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.onSecondary),
                    )
                  : Text(
                      'Create Account',
                      style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInputLabel(String label) {
    return Text(
      label,
      style: GoogleFonts.inter(
        fontSize: 11,
        fontWeight: FontWeight.w500,
        color: AppColors.onSurfaceVariant,
      ),
    );
  }

  InputDecoration _inputDecoration({
    required String hint,
    required IconData icon,
    Widget? suffix,
  }) {
    return InputDecoration(
      isDense: true,
      filled: true,
      fillColor: AppColors.surfaceContainerLow,
      hintText: hint,
      hintStyle: GoogleFonts.inter(fontSize: 12, color: AppColors.textMuted),
      prefixIcon: Icon(icon, size: 16, color: AppColors.onSurfaceVariant),
      suffixIcon: suffix,
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: AppColors.outlineVariant),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: AppColors.outlineVariant),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: AppColors.secondary, width: 1.5),
      ),
    );
  }
}
