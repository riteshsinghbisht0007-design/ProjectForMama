import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../theme/app_theme.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  Future<void> _pickProfilePhoto(BuildContext context, AuthProvider authProvider) async {
    final picker = ImagePicker();
    final option = await showModalBottomSheet<String>(
      context: context,
      backgroundColor: AppColors.surfaceContainer,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Change Profile Photo',
                style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.onSurface),
              ),
              const SizedBox(height: 16),
              ListTile(
                leading: const Icon(Icons.camera_alt_outlined, color: AppColors.primary),
                title: const Text('Take Photo from Camera'),
                onTap: () => Navigator.pop(context, 'camera'),
              ),
              ListTile(
                leading: const Icon(Icons.photo_library_outlined, color: AppColors.secondary),
                title: const Text('Choose from Gallery / Files'),
                onTap: () => Navigator.pop(context, 'gallery'),
              ),
            ],
          ),
        );
      },
    );

    if (option == null) return;

    try {
      final XFile? image = await picker.pickImage(
        source: option == 'camera' ? ImageSource.camera : ImageSource.gallery,
        maxWidth: 512,
        maxHeight: 512,
        imageQuality: 85,
      );

      if (image != null) {
        final bytes = await image.readAsBytes();
        final base64Image = base64Encode(bytes);
        await authProvider.updateProfile(photoUrl: base64Image);

        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              backgroundColor: AppColors.successContainer,
              content: Text('Profile picture updated & saved!'),
            ),
          );
        }
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppColors.errorContainer,
            content: Text('Failed to update picture: ${e.toString()}'),
          ),
        );
      }
    }
  }

  void _showEditProfileDialog(BuildContext context, AuthProvider authProvider) {
    final user = authProvider.currentUser;
    if (user == null) return;

    final nameController = TextEditingController(text: user.name);
    final departmentController = TextEditingController(text: user.department);
    final roleController = TextEditingController(text: user.role);
    final badgeController = TextEditingController(text: user.badgeNumber);

    showDialog(
      context: context,
      builder: (context) {
        return Dialog(
          backgroundColor: AppColors.surfaceContainer,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: AppColors.outlineVariant),
          ),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Edit Profile Information',
                        style: GoogleFonts.inter(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: AppColors.onSurface,
                        ),
                      ),
                      IconButton(
                        onPressed: () => Navigator.pop(context),
                        icon: const Icon(Icons.close_rounded, size: 18, color: AppColors.onSurfaceVariant),
                        visualDensity: VisualDensity.compact,
                      ),
                    ],
                  ),
                  const Divider(color: AppColors.outlineVariant),
                  const SizedBox(height: 8),

                  _buildEditField('Full Name', nameController, Icons.person_outline),
                  const SizedBox(height: 10),
                  _buildEditField('Department / Station', departmentController, Icons.location_city_outlined),
                  const SizedBox(height: 10),
                  _buildEditField('Official Role', roleController, Icons.badge_outlined),
                  const SizedBox(height: 10),
                  _buildEditField('Badge Number', badgeController, Icons.tag_rounded),
                  const SizedBox(height: 20),

                  ElevatedButton(
                    onPressed: () async {
                      await authProvider.updateProfile(
                        name: nameController.text.trim(),
                        department: departmentController.text.trim(),
                        role: roleController.text.trim(),
                        badgeNumber: badgeController.text.trim(),
                      );
                      if (context.mounted) {
                        Navigator.pop(context);
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            backgroundColor: AppColors.successContainer,
                            content: Text('Profile updated & persisted to database!'),
                          ),
                        );
                      }
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.secondary,
                      foregroundColor: AppColors.onSecondary,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      elevation: 0,
                    ),
                    child: Text(
                      'Save Changes',
                      style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w700),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  static Widget _buildEditField(String label, TextEditingController controller, IconData icon) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w500, color: AppColors.onSurfaceVariant),
        ),
        const SizedBox(height: 4),
        TextField(
          controller: controller,
          style: GoogleFonts.inter(fontSize: 13, color: AppColors.onSurface),
          decoration: InputDecoration(
            isDense: true,
            filled: true,
            fillColor: AppColors.surfaceContainerLow,
            prefixIcon: Icon(icon, size: 16, color: AppColors.onSurfaceVariant),
            contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: AppColors.outlineVariant)),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: AppColors.outlineVariant)),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: AppColors.secondary, width: 1.5)),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();
    final user = authProvider.currentUser;

    final userName = user != null ? user.name : 'Officer';
    final userEmail = user != null ? user.email : 'officer@law.gov.in';
    final badgeNumber = user != null ? user.badgeNumber : '4092';
    final department = user != null ? user.department : 'Central Precinct #4';
    final role = user != null ? user.role : 'Inspector / Duty Officer';
    final createdAtStr = user != null ? DateFormat('MMMM dd, yyyy').format(user.createdAt) : 'Recently';

    Widget avatarWidget;
    if (user?.photoUrl != null && user!.photoUrl!.isNotEmpty) {
      try {
        final imageBytes = base64Decode(user.photoUrl!);
        avatarWidget = Image.memory(imageBytes, fit: BoxFit.cover, width: 76, height: 76);
      } catch (_) {
        avatarWidget = Center(
          child: Text(
            userName.isNotEmpty ? userName[0].toUpperCase() : 'U',
            style: GoogleFonts.inter(fontSize: 32, fontWeight: FontWeight.w700, color: AppColors.onSecondaryContainer),
          ),
        );
      }
    } else {
      avatarWidget = Center(
        child: Text(
          userName.isNotEmpty ? userName[0].toUpperCase() : 'U',
          style: GoogleFonts.inter(fontSize: 32, fontWeight: FontWeight.w700, color: AppColors.onSecondaryContainer),
        ),
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.only(left: 16, right: 16, top: 14, bottom: 100),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header Profile Card
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppColors.surfaceContainer,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.outlineVariant, width: 1),
            ),
            child: Column(
              children: [
                Stack(
                  alignment: Alignment.bottomRight,
                  children: [
                    Container(
                      width: 76,
                      height: 76,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(color: AppColors.primary, width: 2),
                        color: AppColors.secondaryContainer,
                      ),
                      clipBehavior: Clip.antiAlias,
                      child: avatarWidget,
                    ),
                    InkWell(
                      onTap: () => _pickProfilePhoto(context, authProvider),
                      child: Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: AppColors.secondary,
                          shape: BoxShape.circle,
                          border: Border.all(color: AppColors.surface, width: 2),
                        ),
                        child: const Icon(Icons.camera_alt, size: 14, color: AppColors.onSecondary),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                Text(
                  userName,
                  textAlign: TextAlign.center,
                  style: GoogleFonts.inter(
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                    color: AppColors.onSurface,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  userEmail,
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    fontWeight: FontWeight.w400,
                    color: AppColors.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Badge #$badgeNumber • $department',
                  style: GoogleFonts.jetBrainsMono(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: AppColors.primary,
                  ),
                ),
                const SizedBox(height: 14),

                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppColors.successContainer.withValues(alpha: 0.4),
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(color: AppColors.success.withValues(alpha: 0.5)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(width: 6, height: 6, decoration: const BoxDecoration(color: AppColors.success, shape: BoxShape.circle)),
                      const SizedBox(width: 6),
                      Text(
                        role.toUpperCase(),
                        style: GoogleFonts.jetBrainsMono(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: AppColors.success,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),

          // User Account Information
          Text(
            'ACCOUNT & SYSTEM TELEMETRY',
            style: GoogleFonts.jetBrainsMono(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: AppColors.onSurfaceVariant,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 8),

          Container(
            decoration: BoxDecoration(
              color: AppColors.surfaceContainer,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.outlineVariant),
            ),
            child: Column(
              children: [
                _buildSettingTile(
                  icon: Icons.calendar_today_outlined,
                  title: 'Account Member Since',
                  subtitle: createdAtStr,
                  trailing: const SizedBox.shrink(),
                ),
                const Divider(color: AppColors.outlineVariant, height: 1),
                _buildSettingTile(
                  icon: Icons.shield_outlined,
                  title: 'Security & Database Isolation',
                  subtitle: 'SQLite Hardware Encrypted Storage',
                  trailing: const Icon(Icons.check_circle_rounded, color: AppColors.success, size: 18),
                ),
                const Divider(color: AppColors.outlineVariant, height: 1),
                _buildSettingTile(
                  icon: Icons.edit_note_rounded,
                  title: 'Edit Profile Information',
                  subtitle: 'Update name, department, or role',
                  trailing: IconButton(
                    icon: const Icon(Icons.arrow_forward_ios_rounded, color: AppColors.onSurfaceVariant, size: 14),
                    onPressed: () => _showEditProfileDialog(context, authProvider),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Real Logout Button
          OutlinedButton.icon(
            onPressed: () async {
              final confirm = await showDialog<bool>(
                context: context,
                builder: (context) => AlertDialog(
                  backgroundColor: AppColors.surfaceContainer,
                  title: Text(
                    'Sign Out of SummonMitra?',
                    style: GoogleFonts.inter(fontWeight: FontWeight.w700, color: AppColors.onSurface),
                  ),
                  content: Text(
                    'Your summon data and account are safely stored in the database. You can sign back in anytime.',
                    style: GoogleFonts.inter(fontSize: 13, color: AppColors.onSurfaceVariant),
                  ),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(context, false),
                      child: const Text('Cancel'),
                    ),
                    ElevatedButton(
                      onPressed: () => Navigator.pop(context, true),
                      style: ElevatedButton.styleFrom(backgroundColor: AppColors.errorUrgent),
                      child: const Text('Sign Out', style: TextStyle(color: Colors.white)),
                    ),
                  ],
                ),
              );

              if (confirm == true) {
                await authProvider.signOut();
              }
            },
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: AppColors.errorUrgent),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
            icon: const Icon(Icons.logout_rounded, color: AppColors.errorUrgent, size: 18),
            label: Text(
              'Sign Out of SummonMitra',
              style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.errorUrgent),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSettingTile({
    required IconData icon,
    required String title,
    required String subtitle,
    required Widget trailing,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          Icon(icon, color: AppColors.onSurfaceVariant, size: 22),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.onSurface),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: GoogleFonts.inter(fontSize: 11, color: AppColors.onSurfaceVariant),
                ),
              ],
            ),
          ),
          trailing,
        ],
      ),
    );
  }
}
