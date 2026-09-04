import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user_model.dart';
import '../services/database_service.dart';

class AuthProvider with ChangeNotifier {
  UserModel? _currentUser;
  bool _isLoading = true;
  bool _showWelcomeAnimation = false;

  UserModel? get currentUser => _currentUser;
  bool get isAuthenticated => _currentUser != null;
  bool get isLoading => _isLoading;
  bool get showWelcomeAnimation => _showWelcomeAnimation;

  static const String _activeUserKey = 'summonmitra_active_user_session';

  AuthProvider() {
    _loadActiveSession();
  }

  Future<void> _loadActiveSession() async {
    _isLoading = true;
    notifyListeners();

    try {
      await DatabaseService.instance.init();
      final prefs = await SharedPreferences.getInstance();
      final userJson = prefs.getString(_activeUserKey);
      if (userJson != null && userJson.isNotEmpty) {
        final cachedUser = UserModel.fromJson(userJson);
        // Refresh latest record from database
        final dbUser = await DatabaseService.instance.getUserByEmail(cachedUser.email);
        _currentUser = dbUser ?? cachedUser;
      }
    } catch (e) {
      debugPrint('Error loading active session: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Real Email/Password Account Creation with Database Persistence
  Future<bool> signUpWithEmail({
    required String name,
    required String email,
    required String password,
    String? photoUrl,
    String? department,
    String? role,
  }) async {
    _isLoading = true;
    notifyListeners();

    try {
      final normalizedEmail = email.trim().toLowerCase();

      // Check if user already exists in SQLite database
      final existing = await DatabaseService.instance.getUserByEmail(normalizedEmail);
      if (existing != null) {
        _isLoading = false;
        notifyListeners();
        return false;
      }

      final newUser = UserModel(
        id: 'USR-${DateTime.now().millisecondsSinceEpoch}',
        name: name.trim(),
        email: normalizedEmail,
        photoUrl: photoUrl,
        department: department ?? 'Central Precinct #4',
        role: role ?? 'Inspector / Duty Officer',
        badgeNumber: '${1000 + (DateTime.now().millisecondsSinceEpoch % 9000)}',
        createdAt: DateTime.now(),
        isFirstLogin: true,
      );

      // Save user in Database
      await DatabaseService.instance.saveUser(newUser, password: password);

      // Save active session
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_activeUserKey, newUser.toJson());

      _currentUser = newUser;
      _showWelcomeAnimation = true;

      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      debugPrint('Sign up error: $e');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  // Real Email/Password Sign In with Password Verification
  Future<bool> signInWithEmail({
    required String email,
    required String password,
  }) async {
    _isLoading = true;
    notifyListeners();

    try {
      final normalizedEmail = email.trim().toLowerCase();

      final isValid = await DatabaseService.instance.verifyPassword(normalizedEmail, password);
      if (!isValid) {
        _isLoading = false;
        notifyListeners();
        return false;
      }

      final user = await DatabaseService.instance.getUserByEmail(normalizedEmail);
      if (user == null) {
        _isLoading = false;
        notifyListeners();
        return false;
      }

      final activeUser = user.copyWith(isFirstLogin: false);
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_activeUserKey, activeUser.toJson());

      _currentUser = activeUser;
      _showWelcomeAnimation = false;

      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      debugPrint('Sign in error: $e');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  // Continue with Google Sign-In
  Future<bool> signInWithGoogle({
    String? googleName,
    String? googleEmail,
    String? googlePhotoUrl,
  }) async {
    _isLoading = true;
    notifyListeners();

    try {
      final name = (googleName != null && googleName.isNotEmpty) ? googleName : 'Ritesh Singh Bisht';
      final email = (googleEmail != null && googleEmail.isNotEmpty) ? googleEmail.toLowerCase() : 'ritesh.bisht@law.gov.in';
      final normalizedEmail = email.trim().toLowerCase();

      var existingUser = await DatabaseService.instance.getUserByEmail(normalizedEmail);
      bool isFirstTime = false;

      UserModel user;
      if (existingUser != null) {
        user = existingUser;
        isFirstTime = false;
      } else {
        user = UserModel(
          id: 'GOOG-${DateTime.now().millisecondsSinceEpoch}',
          name: name,
          email: normalizedEmail,
          photoUrl: googlePhotoUrl,
          department: 'Central Precinct #4',
          role: 'Chief Inspector / Duty Officer',
          badgeNumber: '4092',
          createdAt: DateTime.now(),
          isFirstLogin: true,
        );

        await DatabaseService.instance.saveUser(user);
        isFirstTime = true;
      }

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_activeUserKey, user.toJson());

      _currentUser = user;
      _showWelcomeAnimation = isFirstTime;

      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      debugPrint('Google Sign-in error: $e');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  void completeWelcomeAnimation() {
    _showWelcomeAnimation = false;
    notifyListeners();
  }

  Future<void> updateProfile({
    String? name,
    String? photoUrl,
    String? department,
    String? role,
    String? badgeNumber,
  }) async {
    if (_currentUser == null) return;

    final updatedUser = _currentUser!.copyWith(
      name: name,
      photoUrl: photoUrl,
      department: department,
      role: role,
      badgeNumber: badgeNumber,
    );

    _currentUser = updatedUser;
    notifyListeners();

    // Persist to Database & Session
    await DatabaseService.instance.updateUserProfile(updatedUser);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_activeUserKey, updatedUser.toJson());
  }

  Future<void> signOut() async {
    _isLoading = true;
    notifyListeners();

    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_activeUserKey);
    _currentUser = null;
    _showWelcomeAnimation = false;

    _isLoading = false;
    notifyListeners();
  }
}
