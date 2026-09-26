// app/(super-admin)/_components/dashboard-card.tsx

'use client';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { memo } from 'react';

interface DashboardCardProps {
  stat: {
    title: string;
    value: string;
    change: string;
    changeType: 'positive' | 'negative';
    icon: React.ReactNode; // ✅ Changed from ComponentType to ReactNode
    bgColor: string;
  };
  index: number;
}

/** HUD-style KPI readout: labelled value with an icon chip and a trend line. */
export const DashboardCard = memo(({ stat, index }: DashboardCardProps) => {
  const isPositive = stat.changeType === 'positive';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="h-full"
    >
      <Card className="h-full gap-4 px-6">
        <div className="flex items-center justify-between gap-3">
          <span
            className={cn(
              'cyber-chamfer-sm flex size-11 shrink-0 items-center justify-center rounded-lg [&_svg]:stroke-[1.5]',
              stat.bgColor
            )}
          >
            {stat.icon}
          </span>
          <div
            className={cn(
              'flex min-w-0 items-center gap-1 text-sm font-medium',
              isPositive ? 'text-success' : 'text-destructive'
            )}
            title={stat.change}
          >
            {isPositive ? <TrendingUp className="size-4 shrink-0" /> : <TrendingDown className="size-4 shrink-0" />}
            <span className="truncate">{stat.change}</span>
          </div>
        </div>
        <div>
          <h3 className="font-label text-muted-foreground text-xs tracking-[0.15em] uppercase">{stat.title}</h3>
          <p className="font-heading mt-2 text-3xl font-bold">{stat.value}</p>
        </div>
      </Card>
    </motion.div>
  );
});
DashboardCard.displayName = 'DashboardCard';
