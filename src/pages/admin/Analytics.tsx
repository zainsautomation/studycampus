import { motion } from 'framer-motion';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import { AnalyticsStatCards } from '@/components/admin/analytics/AnalyticsStatCards';
import { TopNotesCharts } from '@/components/admin/analytics/TopNotesCharts';
import { CommunityMCQCards } from '@/components/admin/analytics/CommunityMCQCards';
import { ContentDistribution } from '@/components/admin/analytics/ContentDistribution';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

export default function Analytics() {
  const {
    stats,
    topDownloadedNotes,
    topBookmarkedNotes,
    subjectDistribution,
    isLoading,
  } = useAnalyticsData();

  return (
    <AdminLayout title="Analytics" description="Platform engagement and performance insights">
      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-80 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        </div>
      ) : (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
          <AnalyticsStatCards stats={stats} />
          <TopNotesCharts
            topDownloadedNotes={topDownloadedNotes}
            topBookmarkedNotes={topBookmarkedNotes}
          />
          <CommunityMCQCards stats={stats} />
          <ContentDistribution
            subjectDistribution={subjectDistribution}
            totalNotes={stats.totalNotes}
          />
        </motion.div>
      )}
    </AdminLayout>
  );
}
