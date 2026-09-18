import React from 'react';
import { FileText, Clock, Calendar, CheckCircle2 } from 'lucide-react';
import { useSummons } from '../context/SummonContext';
import { SummonStatus } from '../types';

interface MetricCardsGridProps {
  activeFilter: 'All' | SummonStatus;
  onSelectFilter: (filter: 'All' | SummonStatus) => void;
}

export const MetricCardsGrid: React.FC<MetricCardsGridProps> = ({
  activeFilter,
  onSelectFilter,
}) => {
  const { metrics } = useSummons();

  const cards = [
    {
      id: 'metric-total',
      filter: 'All' as const,
      label: 'Total Summons',
      count: metrics.total,
      icon: FileText,
      color: '#2563EB',
      bgActive: 'border-[#2563EB] bg-[#EFF6FF] dark:border-primary-text dark:bg-card-hover',
      badgeBg: 'bg-[#EFF6FF] text-[#2563EB] dark:bg-muted dark:text-foreground',
    },
    {
      id: 'metric-pending',
      filter: 'Pending' as const,
      label: 'Pending Service',
      count: metrics.pending,
      icon: Clock,
      color: '#D97706',
      bgActive: 'border-amber-400 bg-amber-50/80 dark:border-warning dark:bg-warning-muted/40',
      badgeBg: 'bg-amber-100 text-amber-800 dark:bg-warning-muted/50 dark:text-warning',
    },
    {
      id: 'metric-upcoming',
      filter: 'Upcoming' as const,
      label: 'Upcoming Court',
      count: metrics.upcoming,
      icon: Calendar,
      color: '#2563EB',
      bgActive: 'border-[#2563EB] bg-[#EFF6FF] dark:border-primary-text dark:bg-card',
      badgeBg: 'bg-[#DBEAFE] text-[#1E3A8A] dark:bg-info-muted/60 dark:text-primary-text',
    },
    {
      id: 'metric-completed',
      filter: 'Completed' as const,
      label: 'Served & Closed',
      count: metrics.completed,
      icon: CheckCircle2,
      color: '#059669',
      bgActive: 'border-emerald-400 bg-emerald-50/80 dark:border-success dark:bg-success-muted/30',
      badgeBg: 'bg-emerald-100 text-emerald-800 dark:bg-success-muted/60 dark:text-success',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const isSelected = activeFilter === card.filter;

        return (
          <button
            key={card.id}
            id={card.id}
            onClick={() => onSelectFilter(card.filter)}
            className={`text-left p-4 rounded-xl border card-premium relative overflow-hidden transition-all duration-200 cursor-pointer ${
              isSelected
                ? `${card.bgActive} shadow-sm ring-2 ring-[#2563EB]/25 dark:ring-white/10`
                : 'bg-card border-border hover:border-[#60A5FA] hover:shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {card.label}
              </span>
              <div className={`p-1.5 rounded-lg ${card.badgeBg}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold font-mono text-foreground">
                {card.count}
              </span>
              <span className="text-[11px] text-muted-foreground">records</span>
            </div>
            {isSelected && (
              <div className="mt-2 text-[10px] font-mono text-primary-text flex items-center gap-1 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] dark:bg-[#ADC8F5]"></span>
                Filtering active
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};
