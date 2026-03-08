import { motion } from 'framer-motion';
import { Trophy, TrendingUp, Target, Award } from 'lucide-react';
import KPICard from './KPICard';

/**
 * KPISection - Grid of KPI cards with staggered animations
 * Displays 4 key metrics: Total Tests, Rank Percentile, Overall Improvement, Best Scoring Topic
 */
export default function KPISection({ metrics, loading = false }) {
  const kpis = [
    {
      title: 'Total Tests Completed',
      value: metrics?.totalTests || 0,
      unit: '',
      icon: Trophy,
      trend: null
    },
    {
      title: 'Rank Percentile',
      value: metrics?.percentileRank || 0,
      unit: '%',
      icon: Award,
      trend: null
    },
    {
      title: 'Overall Improvement',
      value: metrics?.overallImprovement || 0,
      unit: '%',
      icon: TrendingUp,
      trend: metrics?.overallImprovement
    },
    {
      title: 'Best Scoring Topic',
      value: metrics?.bestScoringTopic?.accuracy || 0,
      unit: '%',
      icon: Target,
      trend: null,
      subtitle: metrics?.bestScoringTopic?.name || 'N/A'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {kpis.map((kpi, index) => (
        <motion.div
          key={kpi.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            duration: 0.5, 
            delay: index * 0.1,
            ease: 'easeOut' 
          }}
        >
          <KPICard {...kpi} loading={loading} />
          {kpi.subtitle && !loading && (
            <p className="text-xs text-gray-500 mt-2 text-center">{kpi.subtitle}</p>
          )}
        </motion.div>
      ))}
    </div>
  );
}
