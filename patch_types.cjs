const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');

const notifType = `
export type NotificationType = 'HEARING_TODAY' | 'HEARING_TOMORROW' | 'HEARING_UPCOMING' | 'HEARING_OVERDUE';

export interface AppNotification {
  id: string;
  userId: string;
  summonsId: string;
  type: NotificationType;
  title: string;
  message: string;
  hearingDate: string;
  isRead: boolean;
  createdAt: string;
}
`;

if (!code.includes('NotificationType')) {
  code = code + '\n' + notifType;
  fs.writeFileSync('src/types.ts', code);
}
