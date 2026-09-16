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
      color: '#B9C7E4',
      bgActive: 'border-info-text bg-card-hover',
      badgeBg: 'bg-muted text-foreground',
    },
    {
      id: 'metric-pending',
      filter: 'Pending' as const,
      label: 'Pending Service',
      count: metrics.pending,
      icon: Clock,
      color: '#FFB77D',
      bgActive: 'border-warning bg-warning-muted/40',
      badgeBg: 'bg-warning-muted/50 text-warning',
    },
    {
      id: 'metric-upcoming',
      filter: 'Upcoming' as const,
      label: 'Upcoming Court',
      count: metrics.upcoming,
      icon: Calendar,
      color: '#ADC8F5',
      bgActive: 'border-primary-text bg-card',
      badgeBg: 'bg-info-muted/60 text-primary-text',
    },
    {
      id: 'metric-completed',
      filter: 'Completed' as const,
      label: 'Served & Closed',
      count: metrics.completed,
      icon: CheckCircle2,
      color: '#34D399',
      bgActive: 'border-success bg-success-muted/30',
      badgeBg: 'bg-success-muted/60 text-success',
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
            className={`text-left p-4 rounded-xl border card-premium relative overflow-hidden ${
              isSelected
                ? `${card.bgActive} shadow-lg ring-1 ring-white/10`
                : 'bg-card border-border hover:border-primary-btn/30 hover:bg-card-hover'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
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
              <div className="mt-2 text-[10px] font-mono text-primary-text flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ADC8F5]"></span>
                Filtering active
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};
