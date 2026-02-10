import { Info, Trophy, Clock, Target, Users, TrendingUp } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MCQTestDetail, MCQUserStat, MCQScoreDistribution } from '@/hooks/useAnalyticsData';

interface MCQDetailsDialogProps {
  testDetails: MCQTestDetail[];
  userStats: MCQUserStat[];
  scoreDistribution: MCQScoreDistribution[];
}

function formatTime(secs: number): string {
  if (secs <= 0) return '—';
  const mins = Math.floor(secs / 60);
  const s = secs % 60;
  return mins > 0 ? `${mins}m ${s}s` : `${s}s`;
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-500';
  if (score >= 60) return 'text-primary';
  if (score >= 40) return 'text-yellow-500';
  return 'text-destructive';
}

function getDistributionColor(range: string): string {
  if (range.startsWith('80')) return 'bg-emerald-500';
  if (range.startsWith('60')) return 'bg-primary';
  if (range.startsWith('40')) return 'bg-yellow-500';
  return 'bg-destructive';
}

export function MCQDetailsDialog({ testDetails, userStats, scoreDistribution }: MCQDetailsDialogProps) {
  const hasData = testDetails.length > 0 || userStats.length > 0;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="p-1 rounded-md hover:bg-muted transition-colors" title="View detailed MCQ analytics">
          <Info className="w-4 h-4 text-muted-foreground hover:text-primary" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Target className="w-5 h-5 text-purple-500" />
            MCQ Detailed Analytics
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto max-h-[60vh] -mx-1 px-1">
          {!hasData ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Target className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm">No MCQ attempt data yet</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Score Distribution */}
              {scoreDistribution.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                    Score Distribution
                  </h3>
                  <div className="space-y-2.5">
                    {scoreDistribution.map((dist) => (
                      <div key={dist.range} className="space-y-1">
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                          <span className="font-medium">{dist.range}</span>
                          <span className="text-muted-foreground">
                            {dist.count} ({dist.percentage}%)
                          </span>
                        </div>
                        <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${getDistributionColor(dist.range)}`}
                            style={{ width: `${dist.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Per-Test Breakdown */}
              {testDetails.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                    <Target className="w-4 h-4 text-muted-foreground" />
                    Per-Test Breakdown
                  </h3>
                  <div className="rounded-lg border overflow-hidden">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="text-xs whitespace-nowrap">Test</TableHead>
                            <TableHead className="text-xs text-center whitespace-nowrap">Attempts</TableHead>
                            <TableHead className="text-xs text-center whitespace-nowrap">Users</TableHead>
                            <TableHead className="text-xs text-center whitespace-nowrap">Avg</TableHead>
                            <TableHead className="text-xs text-center whitespace-nowrap">Best</TableHead>
                            <TableHead className="text-xs text-center whitespace-nowrap hidden sm:table-cell">Avg Time</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {testDetails.map((test) => (
                            <TableRow key={test.id}>
                              <TableCell className="text-xs font-medium max-w-[140px] truncate">
                                {test.title}
                              </TableCell>
                              <TableCell className="text-xs text-center">{test.attempts}</TableCell>
                              <TableCell className="text-xs text-center">{test.uniqueUsers}</TableCell>
                              <TableCell className={`text-xs text-center font-semibold ${getScoreColor(test.avgScore)}`}>
                                {test.avgScore}%
                              </TableCell>
                              <TableCell className="text-xs text-center">
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  {test.highScore}%
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-center text-muted-foreground hidden sm:table-cell">
                                <span className="flex items-center justify-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatTime(test.avgTimeSecs)}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </section>
              )}

              {/* Top Performers */}
              {userStats.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    Top Performers
                  </h3>
                  <div className="space-y-2">
                    {userStats.slice(0, 10).map((user, index) => (
                      <div
                        key={user.userId}
                        className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <span className="text-xs font-bold text-muted-foreground w-5 text-center">
                          {index + 1}
                        </span>
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={user.avatarUrl || undefined} />
                          <AvatarFallback className="text-[10px]">
                            {user.fullName?.slice(0, 2).toUpperCase() || '??'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{user.fullName}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {user.completed}/{user.attempts} completed
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-sm font-bold ${getScoreColor(user.avgScore)}`}>
                            {user.avgScore}%
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Best: {user.bestScore}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
