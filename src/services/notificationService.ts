import { Summon } from '../types';

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.info('Browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

export const sendSummonAlert = (summon: Summon, titlePrefix = 'Hearing Alert'): void => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  try {
    new Notification(`${titlePrefix}: Case #${summon.caseNumber || summon.summonNumber}`, {
      body: `Summon for ${summon.personName} is due at ${summon.courtName} on ${summon.hearingDate || 'upcoming date'}.`,
      icon: '/vite.svg',
      badge: '/vite.svg',
      tag: `summon-${summon.id}`,
    });
  } catch (e) {
    console.warn('Notification dispatch warning:', e);
  }
};

export const checkUpcomingReminders = (summons: Summon[]): void => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayStr = today.toISOString().split('T')[0];
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  summons.forEach((s) => {
    if (!s.reminderEnabled || s.status === 'Completed' || !s.hearingDate) return;

    if (s.hearingDate === todayStr) {
      sendSummonAlert(s, '🚨 COURT HEARING TODAY');
    } else if (s.hearingDate === tomorrowStr) {
      sendSummonAlert(s, '⏳ Court Hearing Tomorrow');
    }
  });
};
