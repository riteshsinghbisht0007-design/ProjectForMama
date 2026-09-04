import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

enum UrgencyLevel {
  urgent,
  highPriority,
  standard,
}

enum SummonStatus {
  pending,
  dueToday,
  overdue,
  completed,
}

extension UrgencyLevelExtension on UrgencyLevel {
  String get label {
    switch (this) {
      case UrgencyLevel.urgent:
        return 'URGENT';
      case UrgencyLevel.highPriority:
        return 'HIGH PRIORITY';
      case UrgencyLevel.standard:
        return 'STANDARD';
    }
  }

  Color get color {
    switch (this) {
      case UrgencyLevel.urgent:
        return AppColors.errorUrgent;
      case UrgencyLevel.highPriority:
        return AppColors.tertiary;
      case UrgencyLevel.standard:
        return AppColors.primary;
    }
  }

  Color get containerColor {
    switch (this) {
      case UrgencyLevel.urgent:
        return AppColors.errorContainer;
      case UrgencyLevel.highPriority:
        return AppColors.tertiaryContainer;
      case UrgencyLevel.standard:
        return AppColors.primaryContainer;
    }
  }

  Color get onContainerColor {
    switch (this) {
      case UrgencyLevel.urgent:
        return AppColors.onErrorContainer;
      case UrgencyLevel.highPriority:
        return AppColors.onTertiaryContainer;
      case UrgencyLevel.standard:
        return AppColors.primary;
    }
  }

  IconData get icon {
    switch (this) {
      case UrgencyLevel.urgent:
        return Icons.gavel_rounded;
      case UrgencyLevel.highPriority:
        return Icons.assignment_late_rounded;
      case UrgencyLevel.standard:
        return Icons.description_outlined;
    }
  }
}

class SummonModel {
  final String id;
  final String userId;
  final String firNumber;
  final String subjectName;
  final String courtName;
  final String scheduledTime;
  final String assignedOfficer;
  final UrgencyLevel urgency;
  final SummonStatus status;
  final String caseSection;
  final String policeStation;
  final String deliveryAddress;
  final DateTime hearingDate;
  final String notes;

  SummonModel({
    required this.id,
    this.userId = '',
    required this.firNumber,
    required this.subjectName,
    required this.courtName,
    required this.scheduledTime,
    required this.assignedOfficer,
    required this.urgency,
    required this.status,
    required this.caseSection,
    required this.policeStation,
    required this.deliveryAddress,
    required this.hearingDate,
    required this.notes,
  });

  SummonModel copyWith({
    String? id,
    String? userId,
    String? firNumber,
    String? subjectName,
    String? courtName,
    String? scheduledTime,
    String? assignedOfficer,
    UrgencyLevel? urgency,
    SummonStatus? status,
    String? caseSection,
    String? policeStation,
    String? deliveryAddress,
    DateTime? hearingDate,
    String? notes,
  }) {
    return SummonModel(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      firNumber: firNumber ?? this.firNumber,
      subjectName: subjectName ?? this.subjectName,
      courtName: courtName ?? this.courtName,
      scheduledTime: scheduledTime ?? this.scheduledTime,
      assignedOfficer: assignedOfficer ?? this.assignedOfficer,
      urgency: urgency ?? this.urgency,
      status: status ?? this.status,
      caseSection: caseSection ?? this.caseSection,
      policeStation: policeStation ?? this.policeStation,
      deliveryAddress: deliveryAddress ?? this.deliveryAddress,
      hearingDate: hearingDate ?? this.hearingDate,
      notes: notes ?? this.notes,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'userId': userId,
      'firNumber': firNumber,
      'subjectName': subjectName,
      'courtName': courtName,
      'scheduledTime': scheduledTime,
      'assignedOfficer': assignedOfficer,
      'urgency': urgency.index,
      'status': status.index,
      'caseSection': caseSection,
      'policeStation': policeStation,
      'deliveryAddress': deliveryAddress,
      'hearingDate': hearingDate.toIso8601String(),
      'notes': notes,
    };
  }

  factory SummonModel.fromMap(Map<String, dynamic> map) {
    return SummonModel(
      id: map['id'] ?? '',
      userId: map['userId'] ?? '',
      firNumber: map['firNumber'] ?? '',
      subjectName: map['subjectName'] ?? '',
      courtName: map['courtName'] ?? '',
      scheduledTime: map['scheduledTime'] ?? '',
      assignedOfficer: map['assignedOfficer'] ?? '',
      urgency: UrgencyLevel.values[map['urgency'] ?? 0],
      status: SummonStatus.values[map['status'] ?? 0],
      caseSection: map['caseSection'] ?? '',
      policeStation: map['policeStation'] ?? '',
      deliveryAddress: map['deliveryAddress'] ?? '',
      hearingDate: map['hearingDate'] != null ? DateTime.parse(map['hearingDate']) : DateTime.now(),
      notes: map['notes'] ?? '',
    );
  }
}

class AlertModel {
  final String id;
  final String userId;
  final String title;
  final String message;
  final String timestamp;
  final UrgencyLevel urgency;
  final bool isRead;

  AlertModel({
    required this.id,
    this.userId = '',
    required this.title,
    required this.message,
    required this.timestamp,
    required this.urgency,
    this.isRead = false,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'userId': userId,
      'title': title,
      'message': message,
      'timestamp': timestamp,
      'urgency': urgency.index,
      'isRead': isRead,
    };
  }

  factory AlertModel.fromMap(Map<String, dynamic> map) {
    return AlertModel(
      id: map['id'] ?? '',
      userId: map['userId'] ?? '',
      title: map['title'] ?? '',
      message: map['message'] ?? '',
      timestamp: map['timestamp'] ?? '',
      urgency: UrgencyLevel.values[map['urgency'] ?? 0],
      isRead: map['isRead'] ?? false,
    );
  }
}
