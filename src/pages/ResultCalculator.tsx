import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, Plus, Trash2, Download, Save, FilePlus2, Copy, History, GraduationCap, Loader2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { toast } from 'sonner';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/useAuth';
import { useGpaResults, useSaveGpaResult, useDeleteGpaResult, type GpaResult } from '@/hooks/useGpaResults';
import {
  GRADE_SCALE, MAX_SEMESTERS, MAX_SUBJECTS, newSemester, newSubject, overallStats, remarks,
  subjectResult, uid, validateAll, type Semester, type StudentDetails, type Subject,
} from '@/lib/gpa';
import { cn } from '@/lib/utils';

const DRAFT_KEY = 'gpa-draft-v1';
const emptyDetails: StudentDetails = { name: '', rollNo: '', program: '', university: '', session: '' };

interface Draft { id?: string; title: string; details: StudentDetails; semesters: Semester[] }

function freshDraft(name = ''): Draft {
  return { title: 'My Result', details: { ...emptyDetails, name }, semesters: [newSemester(1)] };
}

export default function ResultCalculator() {
  const { user } = useAuth();
  const defaultName = (user?.user_metadata?.full_name as string) || '';
  const [draft, setDraft] = useState<Draft>(() => {
    try { const s = localStorage.getItem(DRAFT_KEY); if (s) return JSON.parse(s); } catch { /* ignore */ }
    return freshDraft(defaultName);
  });
  const [showErrors, setShowErrors] = useState(false);
  const [tab, setTab] = useState('calc');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const { data: history, isLoading: historyLoading } = useGpaResults();
  const save = useSaveGpaResult();
  const del = useDeleteGpaResult();

  useEffect(() => { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); }, [draft]);

  const stats = useMemo(() => overallStats(draft.semesters), [draft.semesters]);
  const errors = useMemo(() => validateAll(draft.details, draft.semesters), [draft]);
  const isValid = Object.keys(errors).length === 0;
  const err = (k: string) => (showErrors ? errors[k] : undefined);

  const setDetails = (k: keyof StudentDetails, v: string) => setDraft(d => ({ ...d, details: { ...d.details, [k]: v } }));
  const updateSem = (id: string, fn: (s: Semester) => Semester) =>
    setDraft(d => ({ ...d, semesters: d.semesters.map(s => (s.id === id ? fn(s) : s)) }));
  const updateSub = (semId: string, subId: string, patch: Partial<Subject>) =>
    updateSem(semId, s => ({ ...s, subjects: s.subjects.map(x => (x.id === subId ? { ...x, ...patch } : x)) }));

  const requireValid = () => {
    if (!isValid) { setShowErrors(true); toast.error('Please fix the highlighted fields'); return false; }
    return true;
  };

  const handleSave = async () => {
    if (!requireValid()) return;
    try {
      const saved = await save.mutateAsync({
        id: draft.id, title: draft.title.trim() || 'My Result', student_details: draft.details,
        semesters: draft.semesters, cgpa: stats.cgpa, total_credits: stats.credits,
      });
      setDraft(d => ({ ...d, id: saved.id }));
      toast.success(draft.id ? 'Result updated' : 'Result saved');
      import('@/lib/analytics').then(({ trackEvent }) => trackEvent('gpa_result_saved', { cgpa: stats.cgpa }));
    } catch (e: any) { toast.error(e.message || 'Could not save'); }
  };

  const handleDownload = async (d: Draft = draft) => {
    if (d === draft && !requireValid()) return;
    setDownloading(true);
    try {
      const { downloadTranscript } = await import('@/lib/gpaPdf');
      await downloadTranscript(d.details, d.semesters, d.title);
      import('@/lib/analytics').then(({ trackEvent }) => trackEvent('gpa_pdf_downloaded', {}));
    } catch { toast.error('Could not create PDF'); } finally { setDownloading(false); }
  };

  const fromResult = (r: GpaResult): Draft => ({ id: r.id, title: r.title, details: r.student_details, semesters: r.semesters });

  return (
    <MainLayout>
      <div className="container px-4 py-6 md:py-8 max-w-6xl mx-auto pb-28">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl bg-primary/10"><Calculator className="w-6 h-6 text-primary" /></div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">Result Calculator</h1>
            <p className="text-sm text-muted-foreground">GPA & CGPA on the HEC 4.0 scale</p>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-2 max-w-sm mb-6">
            <TabsTrigger value="calc" className="gap-1.5"><Calculator className="w-4 h-4" />Calculator</TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5"><History className="w-4 h-4" />Saved{history?.length ? ` (${history.length})` : ''}</TabsTrigger>
          </TabsList>

          <TabsContent value="calc">
            <div className="grid lg:grid-cols-[1fr_340px] gap-6 items-start">
              <div className="space-y-5 min-w-0">
                {/* Details */}
                <Card className="border-border/50">
                  <CardHeader className="pb-3 flex-row items-center justify-between space-y-0 gap-2">
                    <CardTitle className="text-base flex items-center gap-2"><GraduationCap className="w-4 h-4 text-primary" />Student Details</CardTitle>
                    <Button variant="ghost" size="sm" className="gap-1" onClick={() => { setDraft(freshDraft(defaultName)); setShowErrors(false); }}>
                      <FilePlus2 className="w-4 h-4" />New
                    </Button>
                  </CardHeader>
                  <CardContent className="grid sm:grid-cols-2 gap-3">
                    <Field label="Result title" value={draft.title} onChange={v => setDraft(d => ({ ...d, title: v }))} placeholder="e.g. BS CS Result" />
                    <Field label="Full name *" value={draft.details.name} onChange={v => setDetails('name', v)} error={err('details.name')} />
                    <Field label="Roll number" value={draft.details.rollNo} onChange={v => setDetails('rollNo', v)} />
                    <Field label="Program / Degree" value={draft.details.program} onChange={v => setDetails('program', v)} placeholder="e.g. BS Computer Science" />
                    <Field label="University" value={draft.details.university} onChange={v => setDetails('university', v)} />
                    <Field label="Session" value={draft.details.session} onChange={v => setDetails('session', v)} placeholder="e.g. 2023–2027" />
                  </CardContent>
                </Card>

                {/* Semesters */}
                <AnimatePresence initial={false}>
                  {draft.semesters.map((sem, si) => {
                    const s = stats.per[si];
                    return (
                      <motion.div key={sem.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}>
                        <Card className="border-border/50">
                          <CardHeader className="pb-3 flex-row items-center gap-2 space-y-0">
                            <Input value={sem.name} onChange={e => updateSem(sem.id, x => ({ ...x, name: e.target.value }))}
                              className="h-9 font-semibold max-w-[200px]" maxLength={40} aria-label="Semester name" />
                            <div className="ml-auto flex items-center gap-2 shrink-0">
                              <span className="text-xs text-muted-foreground hidden sm:inline">{s.credits} cr</span>
                              <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-sm font-bold tabular-nums">GPA {s.gpa.toFixed(2)}</span>
                              {draft.semesters.length > 1 && (
                                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Remove semester"
                                  onClick={() => setDraft(d => ({ ...d, semesters: d.semesters.filter(x => x.id !== sem.id) }))}>
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <div className="hidden sm:grid grid-cols-[1fr_80px_90px_90px_60px_32px] gap-2 text-xs text-muted-foreground px-1">
                              <span>Subject</span><span>Credits</span><span>Marks</span><span>or Grade</span><span className="text-center">Result</span><span />
                            </div>
                            {sem.subjects.map(sub => (
                              <SubjectRow key={sub.id} sub={sub} err={(k) => err(`${sub.id}.${k}`)}
                                onChange={p => updateSub(sem.id, sub.id, p)}
                                onRemove={sem.subjects.length > 1 ? () => updateSem(sem.id, x => ({ ...x, subjects: x.subjects.filter(y => y.id !== sub.id) })) : undefined} />
                            ))}
                            <Button variant="outline" size="sm" className="gap-1 w-full sm:w-auto" disabled={sem.subjects.length >= MAX_SUBJECTS}
                              onClick={() => updateSem(sem.id, x => ({ ...x, subjects: [...x.subjects, newSubject()] }))}>
                              <Plus className="w-4 h-4" />Add subject
                            </Button>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                <Button variant="secondary" className="w-full gap-2" disabled={draft.semesters.length >= MAX_SEMESTERS}
                  onClick={() => setDraft(d => ({ ...d, semesters: [...d.semesters, newSemester(d.semesters.length + 1)] }))}>
                  <Plus className="w-4 h-4" />Add semester
                </Button>
              </div>

              {/* Summary */}
              <div className="lg:sticky lg:top-20 space-y-4">
                <SummaryPanel stats={stats} semesters={draft.semesters} />
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={handleSave} disabled={save.isPending} className="gap-2">
                    {save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {draft.id ? 'Update' : 'Save'}
                  </Button>
                  <Button variant="outline" onClick={() => handleDownload()} disabled={downloading} className="gap-2">
                    {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}PDF
                  </Button>
                </div>
                {showErrors && !isValid && <p className="text-xs text-destructive text-center">Some fields need attention.</p>}
                <GradeLegend />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history">
            {historyLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : !history?.length ? (
              <Card className="border-dashed"><CardContent className="py-12 text-center text-muted-foreground">
                <History className="w-8 h-8 mx-auto mb-3 opacity-50" />No saved results yet. Calculate and tap Save.
              </CardContent></Card>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {history.map(r => (
                  <Card key={r.id} className="border-border/50">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold truncate">{r.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{r.student_details?.name} · {r.semesters?.length} semester(s)</p>
                          <p className="text-xs text-muted-foreground">{new Date(r.updated_at).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-2xl font-bold text-primary tabular-nums">{Number(r.cgpa).toFixed(2)}</p>
                          <p className="text-[10px] uppercase text-muted-foreground">CGPA</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <Button size="sm" variant="secondary" onClick={() => { setDraft(fromResult(r)); setTab('calc'); }}>Open</Button>
                        <Button size="sm" variant="ghost" className="gap-1" onClick={() => { setDraft({ ...fromResult(r), id: undefined, title: `${r.title} (copy)` }); setTab('calc'); toast.success('Copied — save to keep it'); }}>
                          <Copy className="w-3.5 h-3.5" />Duplicate
                        </Button>
                        <Button size="sm" variant="ghost" aria-label="Download PDF" onClick={() => handleDownload(fromResult(r))}><Download className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" aria-label="Delete" className="ml-auto" onClick={() => setDeleteId(r.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this result?</AlertDialogTitle>
            <AlertDialogDescription>This can't be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              if (!deleteId) return;
              await del.mutateAsync(deleteId).catch(() => toast.error('Could not delete'));
              if (draft.id === deleteId) setDraft(d => ({ ...d, id: undefined }));
              setDeleteId(null); toast.success('Deleted');
            }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}

function Field({ label, value, onChange, error, placeholder }: { label: string; value: string; onChange: (v: string) => void; error?: string; placeholder?: string }) {
  const id = useMemo(uid, []);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs">{label}</Label>
      <Input id={id} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} maxLength={150}
        className={cn(error && 'border-destructive')} aria-invalid={!!error} />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function SubjectRow({ sub, onChange, onRemove, err }: { sub: Subject; onChange: (p: Partial<Subject>) => void; onRemove?: () => void; err: (k: string) => string | undefined }) {
  const r = subjectResult(sub);
  const e = err('name') || err('credits') || err('marks');
  return (
    <div className="rounded-xl border border-border/50 p-2 sm:p-1 sm:border-0">
      <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_80px_90px_90px_60px_32px] gap-2 items-center">
        <Input value={sub.name} onChange={x => onChange({ name: x.target.value })} placeholder="Subject name" maxLength={100}
          className={cn('h-9 col-span-2 sm:col-span-1', err('name') && 'border-destructive')} aria-label="Subject name" />
        <div className="col-span-2 sm:contents grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-2 items-center">
          <Input type="number" inputMode="numeric" min={1} max={6} value={sub.credits} aria-label="Credit hours"
            onChange={x => onChange({ credits: x.target.value === '' ? '' : Number(x.target.value) })}
            className={cn('h-9', err('credits') && 'border-destructive')} placeholder="Cr" />
          <Input type="number" inputMode="decimal" min={0} max={100} value={sub.grade ? '' : sub.marks} disabled={!!sub.grade} aria-label="Marks"
            onChange={x => onChange({ marks: x.target.value === '' ? '' : Number(x.target.value) })}
            className={cn('h-9', err('marks') && 'border-destructive')} placeholder="Marks" />
          <Select value={sub.grade ?? 'marks'} onValueChange={v => onChange({ grade: v === 'marks' ? undefined : v })}>
            <SelectTrigger className="h-9" aria-label="Grade"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="marks">Use marks</SelectItem>
              {GRADE_SCALE.map(g => <SelectItem key={g.grade} value={g.grade}>{g.grade} ({g.points.toFixed(2)})</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="text-center min-w-[52px]">
            {r ? (<><p className={cn('text-sm font-bold', r.points === 0 ? 'text-destructive' : 'text-primary')}>{r.grade}</p>
              <p className="text-[10px] text-muted-foreground tabular-nums">{r.points.toFixed(2)}</p></>) : <span className="text-muted-foreground">—</span>}
          </div>
          {onRemove ? (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRemove} aria-label="Remove subject"><Trash2 className="w-4 h-4 text-muted-foreground" /></Button>
          ) : <span className="w-8" />}
        </div>
      </div>
      {e && <p className="text-xs text-destructive mt-1 px-1">{e}</p>}
    </div>
  );
}

function SummaryPanel({ stats, semesters }: { stats: ReturnType<typeof overallStats>; semesters: Semester[] }) {
  const pct = Math.min(100, (stats.cgpa / 4) * 100);
  const C = 2 * Math.PI * 52;
  const chart = semesters.map((s, i) => ({ name: `S${i + 1}`, gpa: stats.per[i].gpa }));
  return (
    <Card className="border-border/50 overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center gap-5">
          <div className="relative w-32 h-32 shrink-0">
            <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" strokeWidth="10" fill="none" className="stroke-muted" />
              <motion.circle cx="60" cy="60" r="52" strokeWidth="10" fill="none" strokeLinecap="round" className="stroke-primary"
                strokeDasharray={C} animate={{ strokeDashoffset: C - (pct / 100) * C }} initial={{ strokeDashoffset: C }} transition={{ duration: 0.6 }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold tabular-nums">{stats.cgpa.toFixed(2)}</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">CGPA / 4.00</span>
            </div>
          </div>
          <div className="space-y-2 min-w-0">
            <Stat label="Credit hours" value={String(stats.credits)} />
            <Stat label="Avg. marks" value={stats.percentage !== null ? `${stats.percentage}%` : '—'} />
            <Stat label="Semesters" value={String(semesters.length)} />
          </div>
        </div>
        <p className="mt-4 text-sm font-medium text-center px-2 py-2 rounded-lg bg-muted/50">{remarks(stats.cgpa)}</p>
        {chart.length > 1 && (
          <div className="h-28 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chart} margin={{ top: 5, right: 10, bottom: 0, left: -25 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis domain={[0, 4]} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="gpa" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div><p className="text-[11px] text-muted-foreground">{label}</p><p className="font-semibold tabular-nums">{value}</p></div>
);

function GradeLegend() {
  return (
    <details className="rounded-xl border border-border/50 p-3 text-sm">
      <summary className="cursor-pointer font-medium">HEC grading scale</summary>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
        {GRADE_SCALE.map((g, i) => (
          <div key={g.grade} className="flex justify-between">
            <span>{g.min}–{i === 0 ? 100 : GRADE_SCALE[i - 1].min - 1}</span>
            <span className="font-medium text-foreground">{g.grade} · {g.points.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </details>
  );
}
