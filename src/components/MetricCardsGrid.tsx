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
      bgActive: 'border-[#B9C7E4] bg-[#171F33]',
      badgeBg: 'bg-[#1E293B] text-[#DAE2FD]',
    },
    {
      id: 'metric-pending',
      filter: 'Pending' as const,
      label: 'Pending Service',
      count: metrics.pending,
      icon: Clock,
      color: '#FFB77D',
      bgActive: 'border-[#FFB77D] bg-[#2B1300]/40',
      badgeBg: 'bg-[#4D2600]/50 text-[#FFB77D]',
    },
    {
      id: 'metric-upcoming',
      filter: 'Upcoming' as const,
      label: 'Upcoming Court',
      count: metrics.upcoming,
      icon: Calendar,
      color: '#ADC8F5',
      bgActive: 'border-[#ADC8F5] bg-[#131B2E]',
      badgeBg: 'bg-[#133155]/60 text-[#ADC8F5]',
    },
    {
      id: 'metric-completed',
      filter: 'Completed' as const,
      label: 'Served & Closed',
      count: metrics.completed,
      icon: CheckCircle2,
      color: '#34D399',
      bgActive: 'border-[#34D399] bg-[#064E3B]/30',
      badgeBg: 'bg-[#064E3B]/60 text-[#34D399]',
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
            className={`text-left p-4 rounded-xl border transition-all duration-200 relative overflow-hidden ${
              isSelected
                ? `${card.bgActive} shadow-lg ring-1 ring-white/10`
                : 'bg-[#131B2E] border-[#222A3D] hover:border-[#39475F] hover:bg-[#171F33]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-[#8F9097] uppercase tracking-wider">
                {card.label}
              </span>
              <div className={`p-1.5 rounded-lg ${card.badgeBg}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold font-mono text-white">
                {card.count}
              </span>
              <span className="text-[11px] text-[#8F9097]">records</span>
            </div>
            {isSelected && (
              <div className="mt-2 text-[10px] font-mono text-[#ADC8F5] flex items-center gap-1">
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
