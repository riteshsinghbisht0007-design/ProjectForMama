import 'package:flutter/material.dart';
import '../models/summon_model.dart';
import '../models/user_model.dart';
import '../services/database_service.dart';

class SummonProvider with ChangeNotifier {
  String _searchQuery = '';
  String _selectedFilter = 'All'; // 'All', 'Due Today', 'Pending', 'Overdue', 'Completed'
  int _activeNavIndex = 0;
  String? _currentUserId;

  final List<SummonModel> _summons = [];
  final List<AlertModel> _alerts = [];
  bool _isLoading = false;

  String get searchQuery => _searchQuery;
  String get selectedFilter => _selectedFilter;
  int get activeNavIndex => _activeNavIndex;
  bool get isLoading => _isLoading;
  List<AlertModel> get alerts => List.unmodifiable(_alerts);

  // Dynamic calculated metrics from real database records
  int get totalCount => _summons.length;
  int get pendingCount => _summons.where((s) => s.status == SummonStatus.pending || s.status == SummonStatus.dueToday).length;
  int get dueTodayCount => _summons.where((s) => s.status == SummonStatus.dueToday).length;
  int get overdueCount => _summons.where((s) => s.status == SummonStatus.overdue).length;
  int get completedCount => _summons.where((s) => s.status == SummonStatus.completed).length;

  List<SummonModel> get allSummons => List.unmodifiable(_summons);

  List<SummonModel> get todaysSummons {
    return _summons.where((s) => s.status == SummonStatus.dueToday).toList();
  }

  List<SummonModel> get filteredSummons {
    return _summons.where((s) {
      final matchesSearch = _searchQuery.isEmpty ||
          s.subjectName.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          s.firNumber.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          s.courtName.toLowerCase().contains(_searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      switch (_selectedFilter) {
        case 'Due Today':
          return s.status == SummonStatus.dueToday;
        case 'Pending':
          return s.status == SummonStatus.pending || s.status == SummonStatus.dueToday;
        case 'Overdue':
          return s.status == SummonStatus.overdue;
        case 'Completed':
          return s.status == SummonStatus.completed;
        case 'Urgent':
          return s.urgency == UrgencyLevel.urgent;
        case 'High Priority':
          return s.urgency == UrgencyLevel.highPriority;
        case 'Standard':
          return s.urgency == UrgencyLevel.standard;
        default:
          return true;
      }
    }).toList();
  }

  // Get summons for a specific date (for Calendar)
  List<SummonModel> getSummonsForDate(DateTime date) {
    return _summons.where((s) {
      return s.hearingDate.year == date.year &&
          s.hearingDate.month == date.month &&
          s.hearingDate.day == date.day;
    }).toList();
  }

  // Dynamic Time of Day Greeting
  static String getTimeOfDayGreeting() {
    final hour = DateTime.now().hour;
    if (hour >= 5 && hour < 12) {
      return 'Good Morning';
    } else if (hour >= 12 && hour < 17) {
      return 'Good Afternoon';
    } else if (hour >= 17 && hour < 21) {
      return 'Good Evening';
    } else {
      return 'Good Night';
    }
  }

  // Switch User & Load Isolated Data from Database
  Future<void> setUser(UserModel? user) async {
    if (user == null) {
      _currentUserId = null;
      _summons.clear();
      _alerts.clear();
      notifyListeners();
      return;
    }

    if (_currentUserId == user.id) return;
    _currentUserId = user.id;

    await loadUserData(user.id);
  }

  Future<void> loadUserData(String userId) async {
    _isLoading = true;
    notifyListeners();

    try {
      final summons = await DatabaseService.instance.getSummonsForUser(userId);
      final alerts = await DatabaseService.instance.getAlertsForUser(userId);

      _summons.clear();
      _summons.addAll(summons);

      _alerts.clear();
      _alerts.addAll(alerts);
    } catch (e) {
      debugPrint('Error loading user summons from DB: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void setSearchQuery(String query) {
    _searchQuery = query;
    notifyListeners();
  }

  void setFilter(String filter) {
    if (_selectedFilter == filter) {
      _selectedFilter = 'All';
    } else {
      _selectedFilter = filter;
    }
    notifyListeners();
  }

  void setNavIndex(int index) {
    _activeNavIndex = index;
    notifyListeners();
  }

  // Real Summon Creation with Database Persistence
  Future<void> addSummon(SummonModel summon) async {
    if (_currentUserId == null) return;

    final newSummon = summon.copyWith(userId: _currentUserId!);
    _summons.insert(0, newSummon);
    notifyListeners();

    // Persist in SQLite
    await DatabaseService.instance.insertSummon(newSummon);

    // If Urgent/High Priority, trigger real Alert in DB
    if (newSummon.urgency != UrgencyLevel.standard) {
      final alert = AlertModel(
        id: 'ALT-${DateTime.now().millisecondsSinceEpoch}',
        userId: _currentUserId!,
        title: '${newSummon.urgency.label}: ${newSummon.firNumber}',
        message: 'Summon issued for ${newSummon.subjectName} at ${newSummon.courtName}. Scheduled at ${newSummon.scheduledTime}.',
        timestamp: 'Just now',
        urgency: newSummon.urgency,
      );
      _alerts.insert(0, alert);
      await DatabaseService.instance.insertAlert(alert);
      notifyListeners();
    }
  }

  // Real Status Update with Database Persistence
  Future<void> updateSummonStatus(String id, SummonStatus newStatus) async {
    if (_currentUserId == null) return;

    final index = _summons.indexWhere((s) => s.id == id);
    if (index != -1) {
      _summons[index] = _summons[index].copyWith(status: newStatus);
      notifyListeners();

      await DatabaseService.instance.updateSummonStatus(id, newStatus, _currentUserId!);
    }
  }

  // Real Delete with Database Persistence
  Future<void> deleteSummon(String id) async {
    if (_currentUserId == null) return;

    _summons.removeWhere((s) => s.id == id);
    notifyListeners();

    await DatabaseService.instance.deleteSummon(id, _currentUserId!);
  }
}
