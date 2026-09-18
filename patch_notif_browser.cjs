const fs = require('fs');
let code = fs.readFileSync('src/context/NotificationContext.tsx', 'utf8');

const hookLogic = `
  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    if (unreadCount > 0 && Notification.permission === 'granted') {
      const latestUnread = notifications.find(n => !n.isRead);
      if (latestUnread) {
        // Prevent spamming the same notification repeatedly using sessionStorage
        const shownKey = 'notif_shown_' + latestUnread.id;
        if (!sessionStorage.getItem(shownKey)) {
          sessionStorage.setItem(shownKey, 'true');
          new Notification(latestUnread.title, {
            body: latestUnread.message,
            icon: '/favicon.ico'
          });
        }
      }
    }
  }, [unreadCount, notifications]);
`;

code = code.replace(
  "const unreadCount = notifications.filter(n => !n.isRead).length;",
  hookLogic
);

fs.writeFileSync('src/context/NotificationContext.tsx', code);
