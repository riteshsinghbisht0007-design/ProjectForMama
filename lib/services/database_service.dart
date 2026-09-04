import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:path/path.dart' as p;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sqflite/sqflite.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import '../models/summon_model.dart';
import '../models/user_model.dart';

class DatabaseService {
  static final DatabaseService instance = DatabaseService._internal();
  DatabaseService._internal();

  Database? _database;
  bool _isWeb = kIsWeb;

  Future<void> init() async {
    if (_isWeb) return;

    if (!kIsWeb && (defaultTargetPlatform == TargetPlatform.windows || defaultTargetPlatform == TargetPlatform.linux || defaultTargetPlatform == TargetPlatform.macOS)) {
      sqfliteFfiInit();
      databaseFactory = databaseFactoryFfi;
    }

    if (_database == null) {
      final dbPath = await getDatabasesPath();
      final path = p.join(dbPath, 'summonmitra_secure.db');

      _database = await openDatabase(
        path,
        version: 1,
        onCreate: (db, version) async {
          // Users Table
          await db.execute('''
            CREATE TABLE users (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              email TEXT UNIQUE NOT NULL,
              password_hash TEXT,
              photo_url TEXT,
              department TEXT,
              role TEXT,
              badge_number TEXT,
              created_at TEXT NOT NULL
            )
          ''');

          // Summons Table
          await db.execute('''
            CREATE TABLE summons (
              id TEXT PRIMARY KEY,
              user_id TEXT NOT NULL,
              fir_number TEXT NOT NULL,
              subject_name TEXT NOT NULL,
              court_name TEXT NOT NULL,
              scheduled_time TEXT NOT NULL,
              assigned_officer TEXT NOT NULL,
              urgency INTEGER NOT NULL,
              status INTEGER NOT NULL,
              case_section TEXT,
              police_station TEXT,
              delivery_address TEXT,
              hearing_date TEXT NOT NULL,
              notes TEXT,
              FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
          ''');

          // Alerts / Notifications Table
          await db.execute('''
            CREATE TABLE alerts (
              id TEXT PRIMARY KEY,
              user_id TEXT NOT NULL,
              title TEXT NOT NULL,
              message TEXT NOT NULL,
              timestamp TEXT NOT NULL,
              urgency INTEGER NOT NULL,
              is_read INTEGER DEFAULT 0,
              FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
          ''');
        },
      );
    }
  }

  // ================= USER OPERATIONS =================

  Future<void> saveUser(UserModel user, {String? password}) async {
    if (_isWeb) {
      final prefs = await SharedPreferences.getInstance();
      final usersMap = _getWebRegisteredUsers(prefs);
      usersMap[user.email.toLowerCase()] = {
        'user': user.toMap(),
        'password': password ?? 'google_oauth_verified',
      };
      await prefs.setString('summonmitra_web_users_db', json.encode(usersMap));
      return;
    }

    await init();
    await _database!.insert(
      'users',
      {
        'id': user.id,
        'name': user.name,
        'email': user.email.toLowerCase(),
        'password_hash': password ?? 'google_oauth_verified',
        'photo_url': user.photoUrl,
        'department': user.department,
        'role': user.role,
        'badge_number': user.badgeNumber,
        'created_at': user.createdAt.toIso8601String(),
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<UserModel?> getUserByEmail(String email) async {
    final cleanEmail = email.trim().toLowerCase();

    if (_isWeb) {
      final prefs = await SharedPreferences.getInstance();
      final usersMap = _getWebRegisteredUsers(prefs);
      if (usersMap.containsKey(cleanEmail)) {
        final data = usersMap[cleanEmail] as Map<String, dynamic>;
        return UserModel.fromMap(data['user'] as Map<String, dynamic>);
      }
      return null;
    }

    await init();
    final results = await _database!.query(
      'users',
      where: 'LOWER(email) = ?',
      whereArgs: [cleanEmail],
    );

    if (results.isNotEmpty) {
      final row = results.first;
      return UserModel(
        id: row['id'] as String,
        name: row['name'] as String,
        email: row['email'] as String,
        photoUrl: row['photo_url'] as String?,
        department: (row['department'] as String?) ?? 'Central Precinct #4',
        role: (row['role'] as String?) ?? 'Inspector / Duty Officer',
        badgeNumber: (row['badge_number'] as String?) ?? '4092',
        createdAt: DateTime.tryParse(row['created_at'] as String) ?? DateTime.now(),
      );
    }
    return null;
  }

  Future<bool> verifyPassword(String email, String password) async {
    final cleanEmail = email.trim().toLowerCase();

    if (_isWeb) {
      final prefs = await SharedPreferences.getInstance();
      final usersMap = _getWebRegisteredUsers(prefs);
      if (usersMap.containsKey(cleanEmail)) {
        final data = usersMap[cleanEmail] as Map<String, dynamic>;
        return data['password'] == password;
      }
      return false;
    }

    await init();
    final results = await _database!.query(
      'users',
      columns: ['password_hash'],
      where: 'LOWER(email) = ?',
      whereArgs: [cleanEmail],
    );

    if (results.isNotEmpty) {
      return results.first['password_hash'] == password;
    }
    return false;
  }

  Future<void> updateUserProfile(UserModel user) async {
    if (_isWeb) {
      final prefs = await SharedPreferences.getInstance();
      final usersMap = _getWebRegisteredUsers(prefs);
      if (usersMap.containsKey(user.email.toLowerCase())) {
        final data = usersMap[user.email.toLowerCase()] as Map<String, dynamic>;
        data['user'] = user.toMap();
        await prefs.setString('summonmitra_web_users_db', json.encode(usersMap));
      }
      return;
    }

    await init();
    await _database!.update(
      'users',
      {
        'name': user.name,
        'photo_url': user.photoUrl,
        'department': user.department,
        'role': user.role,
        'badge_number': user.badgeNumber,
      },
      where: 'id = ?',
      whereArgs: [user.id],
    );
  }

  // ================= SUMMONS OPERATIONS =================

  Future<List<SummonModel>> getSummonsForUser(String userId) async {
    if (_isWeb) {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString('summonmitra_web_summons_$userId');
      if (raw != null && raw.isNotEmpty) {
        final List list = json.decode(raw);
        return list.map((e) => SummonModel.fromMap(e as Map<String, dynamic>)).toList();
      }
      return [];
    }

    await init();
    final results = await _database!.query(
      'summons',
      where: 'user_id = ?',
      whereArgs: [userId],
      orderBy: 'hearing_date ASC',
    );

    return results.map((row) {
      return SummonModel(
        id: row['id'] as String,
        userId: row['user_id'] as String,
        firNumber: row['fir_number'] as String,
        subjectName: row['subject_name'] as String,
        courtName: row['court_name'] as String,
        scheduledTime: row['scheduled_time'] as String,
        assignedOfficer: row['assigned_officer'] as String,
        urgency: UrgencyLevel.values[(row['urgency'] as int?) ?? 0],
        status: SummonStatus.values[(row['status'] as int?) ?? 0],
        caseSection: (row['case_section'] as String?) ?? '',
        policeStation: (row['police_station'] as String?) ?? '',
        deliveryAddress: (row['delivery_address'] as String?) ?? '',
        hearingDate: DateTime.tryParse((row['hearing_date'] as String?) ?? '') ?? DateTime.now(),
        notes: (row['notes'] as String?) ?? '',
      );
    }).toList();
  }

  Future<void> insertSummon(SummonModel summon) async {
    if (_isWeb) {
      final list = await getSummonsForUser(summon.userId);
      list.insert(0, summon);
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('summonmitra_web_summons_${summon.userId}', json.encode(list.map((s) => s.toMap()).toList()));
      return;
    }

    await init();
    await _database!.insert(
      'summons',
      {
        'id': summon.id,
        'user_id': summon.userId,
        'fir_number': summon.firNumber,
        'subject_name': summon.subjectName,
        'court_name': summon.courtName,
        'scheduled_time': summon.scheduledTime,
        'assigned_officer': summon.assignedOfficer,
        'urgency': summon.urgency.index,
        'status': summon.status.index,
        'case_section': summon.caseSection,
        'police_station': summon.policeStation,
        'delivery_address': summon.deliveryAddress,
        'hearing_date': summon.hearingDate.toIso8601String(),
        'notes': summon.notes,
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<void> updateSummonStatus(String id, SummonStatus status, String userId) async {
    if (_isWeb) {
      final list = await getSummonsForUser(userId);
      final idx = list.indexWhere((s) => s.id == id);
      if (idx != -1) {
        list[idx] = list[idx].copyWith(status: status);
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('summonmitra_web_summons_$userId', json.encode(list.map((s) => s.toMap()).toList()));
      }
      return;
    }

    await init();
    await _database!.update(
      'summons',
      {'status': status.index},
      where: 'id = ? AND user_id = ?',
      whereArgs: [id, userId],
    );
  }

  Future<void> deleteSummon(String id, String userId) async {
    if (_isWeb) {
      final list = await getSummonsForUser(userId);
      list.removeWhere((s) => s.id == id);
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('summonmitra_web_summons_$userId', json.encode(list.map((s) => s.toMap()).toList()));
      return;
    }

    await init();
    await _database!.delete(
      'summons',
      where: 'id = ? AND user_id = ?',
      whereArgs: [id, userId],
    );
  }

  // ================= ALERTS OPERATIONS =================

  Future<List<AlertModel>> getAlertsForUser(String userId) async {
    if (_isWeb) {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString('summonmitra_web_alerts_$userId');
      if (raw != null && raw.isNotEmpty) {
        final List list = json.decode(raw);
        return list.map((e) => AlertModel.fromMap(e as Map<String, dynamic>)).toList();
      }
      return [];
    }

    await init();
    final results = await _database!.query(
      'alerts',
      where: 'user_id = ?',
      whereArgs: [userId],
      orderBy: 'timestamp DESC',
    );

    return results.map((row) {
      return AlertModel(
        id: row['id'] as String,
        userId: row['user_id'] as String,
        title: row['title'] as String,
        message: row['message'] as String,
        timestamp: row['timestamp'] as String,
        urgency: UrgencyLevel.values[(row['urgency'] as int?) ?? 0],
        isRead: (row['is_read'] as int? ?? 0) == 1,
      );
    }).toList();
  }

  Future<void> insertAlert(AlertModel alert) async {
    if (_isWeb) {
      final list = await getAlertsForUser(alert.userId);
      list.insert(0, alert);
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('summonmitra_web_alerts_${alert.userId}', json.encode(list.map((a) => a.toMap()).toList()));
      return;
    }

    await init();
    await _database!.insert(
      'alerts',
      {
        'id': alert.id,
        'user_id': alert.userId,
        'title': alert.title,
        'message': alert.message,
        'timestamp': alert.timestamp,
        'urgency': alert.urgency.index,
        'is_read': alert.isRead ? 1 : 0,
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Map<String, dynamic> _getWebRegisteredUsers(SharedPreferences prefs) {
    final raw = prefs.getString('summonmitra_web_users_db');
    if (raw == null || raw.isEmpty) return {};
    try {
      return Map<String, dynamic>.from(json.decode(raw));
    } catch (_) {
      return {};
    }
  }
}
