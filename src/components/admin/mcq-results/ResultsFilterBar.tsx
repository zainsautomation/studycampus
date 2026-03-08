import { useState } from 'react';
import { Search, SlidersHorizontal, Check, ChevronsUpDown, BookOpen, FlaskConical } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { cn } from '@/lib/utils';
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
  const [testPickerOpen, setTestPickerOpen] = useState(false);

  const selectedTest = tests.find(t => t.id === filters.testId);
  const displayLabel = filters.testId === 'all' ? 'All Tests' : selectedTest?.title || 'All Tests';

  const publishedTests = tests.filter(t => t.is_published);
  const draftTests = tests.filter(t => !t.is_published);

  return (
    <div className="space-y-3">
      {/* Row 1: Test select + Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Popover open={testPickerOpen} onOpenChange={setTestPickerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={testPickerOpen}
              className="sm:w-[280px] w-full justify-between font-normal h-10"
            >
              <div className="flex items-center gap-2 truncate">
                <FlaskConical className="w-4 h-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{displayLabel}</span>
              </div>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search tests..." />
              <CommandList>
                <CommandEmpty>No tests found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="all"
                    onSelect={() => {
                      onFilterChange({ ...filters, testId: 'all' });
                      setTestPickerOpen(false);
                    }}
                  >
                    <Check className={cn('mr-2 h-4 w-4', filters.testId === 'all' ? 'opacity-100' : 'opacity-0')} />
                    <span className="font-medium">All Tests</span>
                    <Badge variant="secondary" className="ml-auto text-xs">{tests.length}</Badge>
                  </CommandItem>
                </CommandGroup>

                {publishedTests.length > 0 && (
                  <>
                    <CommandSeparator />
                    <CommandGroup heading="Published">
                      {publishedTests.map((t) => (
                        <CommandItem
                          key={t.id}
                          value={t.title}
                          onSelect={() => {
                            onFilterChange({ ...filters, testId: t.id });
                            setTestPickerOpen(false);
                          }}
                        >
                          <Check className={cn('mr-2 h-4 w-4', filters.testId === t.id ? 'opacity-100' : 'opacity-0')} />
                          <span className="truncate">{t.title}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </>
                )}

                {draftTests.length > 0 && (
                  <>
                    <CommandSeparator />
                    <CommandGroup heading="Drafts">
                      {draftTests.map((t) => (
                        <CommandItem
                          key={t.id}
                          value={t.title + ' draft'}
                          onSelect={() => {
                            onFilterChange({ ...filters, testId: t.id });
                            setTestPickerOpen(false);
                          }}
                        >
                          <Check className={cn('mr-2 h-4 w-4', filters.testId === t.id ? 'opacity-100' : 'opacity-0')} />
                          <span className="truncate text-muted-foreground">{t.title}</span>
                          <Badge variant="outline" className="ml-auto text-xs">Draft</Badge>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

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
