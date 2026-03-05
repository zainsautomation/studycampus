import { Search, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { MCQResultsFilters } from '@/hooks/useMCQResults';

interface ResultsFilterBarProps {
  filters: MCQResultsFilters;
  onFilterChange: (filters: MCQResultsFilters) => void;
  tests: { id: string; title: string; is_published: boolean }[];
}

const statusOptions = [
  { value: 'all', label: 'All' },
  { value: 'completed', label: 'Completed' },
  { value: 'in_progress', label: 'In Progress' },
] as const;

export function ResultsFilterBar({ filters, onFilterChange, tests }: ResultsFilterBarProps) {
  return (
    <div className="space-y-3">
      {/* Row 1: Test select + Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select
          value={filters.testId}
          onValueChange={(v) => onFilterChange({ ...filters, testId: v })}
        >
          <SelectTrigger className="sm:w-[240px]">
            <SelectValue placeholder="All Tests" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tests</SelectItem>
            {tests.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search student..."
            value={filters.studentSearch}
            onChange={(e) => onFilterChange({ ...filters, studentSearch: e.target.value })}
            className="pl-10"
          />
        </div>
      </div>

      {/* Row 2: Status chips + Sort */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2">
          {statusOptions.map((opt) => (
            <Badge
              key={opt.value}
              variant={filters.status === opt.value ? 'default' : 'outline'}
              className="cursor-pointer select-none"
              onClick={() => onFilterChange({ ...filters, status: opt.value as MCQResultsFilters['status'] })}
            >
              {opt.label}
            </Badge>
          ))}
        </div>

        <Select
          value={filters.sortBy}
          onValueChange={(v) => onFilterChange({ ...filters, sortBy: v as MCQResultsFilters['sortBy'] })}
        >
          <SelectTrigger className="w-[160px]">
            <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date_desc">Newest First</SelectItem>
            <SelectItem value="date_asc">Oldest First</SelectItem>
            <SelectItem value="score_desc">Highest Score</SelectItem>
            <SelectItem value="score_asc">Lowest Score</SelectItem>
            <SelectItem value="name_asc">Name A-Z</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
