const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const notifCode = `
  // --- Notifications Endpoints ---
  app.get('/api/notifications', requireAuth, async (req: any, res: any) => {
    if (!db) return res.status(503).json({ error: 'Database disconnected' });
    try {
      const { today, upcomingDays = 7 } = req.query;
      if (!today) return res.status(400).json({ error: 'Missing today parameter (YYYY-MM-DD)' });
      
      const userId = req.user.uid;
      
      const summons = await db.collection('summons').find({ userId, status: { $ne: 'Completed' } }).toArray();
      
      const todayDate = new Date(today);
      const bulkOps = [];
      
      for (const summon of summons) {
        if (!summon.hearingDate) continue;
        const hearing = new Date(summon.hearingDate);
        const diffTime = hearing.getTime() - todayDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let type = null;
        let title = '';
        let message = '';
        
        if (diffDays < 0) {
          type = 'HEARING_OVERDUE';
          title = 'Overdue Hearing';
          message = \`Hearing date for \${summon.personName} (\${summon.summonNumber || summon.caseNumber}) has passed.\`;
        } else if (diffDays === 0) {
          type = 'HEARING_TODAY';
          title = 'Hearing Today';
          message = \`Hearing scheduled for today: \${summon.personName} (\${summon.summonNumber || summon.caseNumber}).\`;
        } else if (diffDays === 1) {
          type = 'HEARING_TOMORROW';
          title = 'Hearing Tomorrow';
          message = \`Hearing scheduled for tomorrow: \${summon.personName} (\${summon.summonNumber || summon.caseNumber}).\`;
        } else if (diffDays > 1 && diffDays <= parseInt(upcomingDays)) {
          type = 'HEARING_UPCOMING';
          title = 'Upcoming Hearing';
          message = \`Hearing in \${diffDays} days for \${summon.personName} (\${summon.summonNumber || summon.caseNumber}).\`;
        }
        
        if (type) {
          const uniqueKey = \`\${userId}_\${summon._id}_\${type}_\${summon.hearingDate}\`;
          bulkOps.push({
            updateOne: {
              filter: { uniqueKey },
              update: {
                $setOnInsert: {
                  userId,
                  summonsId: summon._id.toString(),
                  type,
                  title,
                  message,
                  hearingDate: summon.hearingDate,
                  isRead: false,
                  createdAt: new Date().toISOString()
                }
              },
              upsert: true
            }
          });
        }
      }
      
      if (bulkOps.length > 0) {
        await db.collection('notifications').bulkWrite(bulkOps, { ordered: false });
      }
      
      const notifications = await db.collection('notifications')
        .find({ userId })
        .sort({ createdAt: -1 })
        .toArray();
        
      res.json(notifications.map((n: any) => ({ ...n, id: n._id.toString() })));
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/notifications/:id/read', requireAuth, async (req: any, res: any) => {
    if (!db) return res.status(503).json({ error: 'Database disconnected' });
    try {
      const { id } = req.params;
      const { ObjectId } = require('mongodb');
      await db.collection('notifications').updateOne(
        { _id: new ObjectId(id), userId: req.user.uid },
        { $set: { isRead: true } }
      );
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
  
  app.put('/api/notifications/read-all', requireAuth, async (req: any, res: any) => {
    if (!db) return res.status(503).json({ error: 'Database disconnected' });
    try {
      await db.collection('notifications').updateMany(
        { userId: req.user.uid, isRead: false },
        { $set: { isRead: true } }
      );
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/notifications/cleanup/:summonsId', requireAuth, async (req: any, res: any) => {
    if (!db) return res.status(503).json({ error: 'Database disconnected' });
    try {
      const { summonsId } = req.params;
      await db.collection('notifications').deleteMany({ userId: req.user.uid, summonsId });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
`;

code = code.replace("  // Serve Frontend Assets: Vite middleware in Development", notifCode + "\n  // Serve Frontend Assets: Vite middleware in Development");
fs.writeFileSync('server.ts', code);
