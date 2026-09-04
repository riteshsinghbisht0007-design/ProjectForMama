import 'dart:convert';

class UserModel {
  final String id;
  final String name;
  final String email;
  final String? photoUrl;
  final String department;
  final String role;
  final String badgeNumber;
  final DateTime createdAt;
  final bool isFirstLogin;

  UserModel({
    required this.id,
    required this.name,
    required this.email,
    this.photoUrl,
    this.department = 'Central Precinct #4',
    this.role = 'Inspector / Duty Officer',
    this.badgeNumber = '4092',
    required this.createdAt,
    this.isFirstLogin = false,
  });

  String get firstName {
    final parts = name.trim().split(' ');
    return parts.isNotEmpty ? parts.first : name;
  }

  UserModel copyWith({
    String? id,
    String? name,
    String? email,
    String? photoUrl,
    String? department,
    String? role,
    String? badgeNumber,
    DateTime? createdAt,
    bool? isFirstLogin,
  }) {
    return UserModel(
      id: id ?? this.id,
      name: name ?? this.name,
      email: email ?? this.email,
      photoUrl: photoUrl ?? this.photoUrl,
      department: department ?? this.department,
      role: role ?? this.role,
      badgeNumber: badgeNumber ?? this.badgeNumber,
      createdAt: createdAt ?? this.createdAt,
      isFirstLogin: isFirstLogin ?? this.isFirstLogin,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'photoUrl': photoUrl,
      'department': department,
      'role': role,
      'badgeNumber': badgeNumber,
      'createdAt': createdAt.toIso8601String(),
      'isFirstLogin': isFirstLogin,
    };
  }

  factory UserModel.fromMap(Map<String, dynamic> map) {
    return UserModel(
      id: map['id'] ?? '',
      name: map['name'] ?? '',
      email: map['email'] ?? '',
      photoUrl: map['photoUrl'],
      department: map['department'] ?? 'Central Precinct #4',
      role: map['role'] ?? 'Inspector / Duty Officer',
      badgeNumber: map['badgeNumber'] ?? '4092',
      createdAt: map['createdAt'] != null ? DateTime.parse(map['createdAt']) : DateTime.now(),
      isFirstLogin: map['isFirstLogin'] ?? false,
    );
  }

  String toJson() => json.encode(toMap());

  factory UserModel.fromJson(String source) => UserModel.fromMap(json.decode(source));
}
