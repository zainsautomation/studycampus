import { useState } from 'react';
import { ClipboardList, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResultsFilterBar } from '@/components/admin/mcq-results/ResultsFilterBar';
import { ResultsSummary } from '@/components/admin/mcq-results/ResultsSummary';
import { ResultCard } from '@/components/admin/mcq-results/ResultCard';
import { AttemptDetailSheet } from '@/components/admin/mcq-results/AttemptDetailSheet';
import { useMCQResults, type AttemptWithDetails } from '@/hooks/useMCQResults';

export default function MCQResults() {
  const { filters, setFilters, tests, filteredResults, isLoading, summary } = useMCQResults();
  const [selectedAttempt, setSelectedAttempt] = useState<AttemptWithDetails | null>(null);

  const handleExportCSV = () => {
    const headers = ['Student', 'Email', 'Test', 'Score (%)', 'Correct', 'Total', 'Status', 'Time (s)', 'Date'];
    const rows = filteredResults.map(r => [
      r.student_name, r.student_email, r.test_title,
      r.score !== null ? Number(r.score).toFixed(1) : '',
      r.correct_answers, r.total_questions, r.status,
      r.time_taken_secs ?? '', r.started_at,
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mcq-results-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
            <ClipboardList className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">MCQ Results</h1>
            <p className="text-sm text-muted-foreground">Student-by-test results explorer</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={filteredResults.length === 0}>
          <Download className="w-4 h-4 mr-1.5" />
          <span className="hidden sm:inline">Export CSV</span>
        </Button>
      </div>

      {/* Summary */}
      <ResultsSummary {...summary} />

      {/* Filters */}
      <ResultsFilterBar filters={filters} onFilterChange={setFilters} tests={tests} />

      {/* Results List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredResults.length === 0 ? (
        <div className="text-center py-16">
          <ClipboardList className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">No results found</p>
          <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredResults.map((attempt) => (
            <ResultCard key={attempt.id} attempt={attempt} onClick={() => setSelectedAttempt(attempt)} />
          ))}
        </div>
      )}

      {/* Detail Sheet */}
      <AttemptDetailSheet
        attempt={selectedAttempt}
        open={!!selectedAttempt}
        onOpenChange={(open) => !open && setSelectedAttempt(null)}
      />
    </div>
  );
}
