import React from 'react';
import { ArrowRight, AlertTriangle, Clock } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

interface PriorityAlertsDashboardWidgetProps {
  onSelectSummon: (summonsId: string) => void;
}

export const PriorityAlertsDashboardWidget: React.FC<PriorityAlertsDashboardWidgetProps> = ({
  onSelectSummon,
}) => {
  const { notifications } = useNotifications();

  // Filter only unread or high priority that needs attention right now
  const priorityNotifications = notifications
    .filter(n => ['HEARING_OVERDUE', 'HEARING_TODAY', 'HEARING_TOMORROW'].includes(n.type))
    .slice(0, 3); // show up to 3 priority items

  if (priorityNotifications.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-warning" />
          Priority Alerts
        </h3>
        <span className="text-xs text-muted-foreground">
          Overdue, today, and upcoming court appearances
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {priorityNotifications.map(n => {
          const isOverdue = n.type === 'HEARING_OVERDUE';
          const isToday = n.type === 'HEARING_TODAY';

          return (
              <div
                key={n.id}
                onClick={() => onSelectSummon(n.summonsId)}
                className={`p-4 rounded-xl border card-premium cursor-pointer transition-all flex flex-col justify-between ${
                  isOverdue ? 'bg-red-50/70 border-red-200 hover:border-red-300 dark:bg-red-950/20 dark:border-red-800/40' : 
                  isToday ? 'bg-amber-50/70 border-amber-200 hover:border-amber-300 dark:bg-amber-950/20 dark:border-amber-800/40' : 
                  'bg-blue-50/70 border-blue-200 hover:border-blue-300 dark:bg-card dark:border-border'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      isOverdue ? 'bg-red-100 text-red-800 border border-red-200 dark:bg-red-900/60 dark:text-red-300' :
                      isToday ? 'bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-900/60 dark:text-amber-300' :
                      'bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900/60 dark:text-blue-300'
                    }`}>
                      {isOverdue ? '⚠️ OVERDUE' : isToday ? '🔴 TODAY' : '🟠 TOMORROW'}
                    </span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                  
                  <h4 className="text-sm font-bold text-foreground line-clamp-1">{n.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {n.message}
                  </p>
                </div>
                
                <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono font-medium">
                  <Clock className="w-3 h-3 text-primary-text" />
                  Hearing: {n.hearingDate}
                </div>
              </div>
          );
        })}
      </div>
    </div>
  );
};
