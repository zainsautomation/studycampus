import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Plus, Trash2, Download, RotateCcw, FlaskConical, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { MAX, computeAll, computeSubject, downloadMarksPdf, invalidField, newSubject, type MarksSubject } from '@/lib/marks';
import { trackEvent } from '@/lib/analytics';

const KEY = 'marks-draft-v1';
type Info = { name: string; rollNo: string; program: string; session: string; institute: string };

export default function MarksCalculator() {
  const { user } = useAuth();
  const saved = useMemo(() => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } }, []);
  const [info, setInfo] = useState<Info>(saved?.info ?? {
    name: (user?.user_metadata?.full_name as string) || '', rollNo: '', program: '', session: '', institute: '',
  });
  const [subjects, setSubjects] = useState<MarksSubject[]>(saved?.subjects ?? [newSubject(), newSubject()]);
  const [downloading, setDownloading] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => { localStorage.setItem(KEY, JSON.stringify({ info, subjects })); }, [info, subjects]);

  const res = useMemo(() => computeAll(subjects), [subjects]);
  const complete = subjects.length > 0 && subjects.every((s) => !invalidField(s));
  const nextField = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
    const fields = Array.from(formRef.current?.querySelectorAll<HTMLInputElement>('[data-marks-field]:not(:disabled)') ?? []);
    const next = fields[fields.indexOf(event.currentTarget) + 1];
    if (next) { event.preventDefault(); next.focus(); next.select(); }
  };
  const update = (id: string, patch: Partial<MarksSubject>) =>
    setSubjects((p) => p.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const download = async () => {
    const bad = subjects.map(invalidField).find(Boolean);
    if (bad) return toast.error(`Fix marks: ${bad}`);
    if (!subjects.length) return toast.error('Add at least one subject');
    setDownloading(true);
    try {
      await downloadMarksPdf(info, subjects);
      trackEvent('marks_pdf_downloaded', { subjects: subjects.length });
      toast.success('Result sheet downloaded');
    } catch { toast.error('Could not create result sheet'); }
    finally { setDownloading(false); }
  };

  const field = (s: MarksSubject, k: 'mid' | 'sessional' | 'final' | 'practical', label: string) => {
    const v = parseFloat(s[k]);
    const err = s[k] !== '' && (!Number.isFinite(v) || v < 0 || v > MAX[k]);
    return (
      <div className="space-y-1 min-w-0">
        <Label htmlFor={`${s.id}-${k}`} className="text-xs text-muted-foreground">{label} <span className="opacity-60">/{MAX[k]}</span></Label>
        <Input type="number" inputMode="decimal" step="0.5" min={0} max={MAX[k]} value={s[k]}
          id={`${s.id}-${k}`} data-marks-field onKeyDown={nextField}
          onChange={(e) => update(s.id, { [k]: e.target.value })}
          className={err ? 'border-destructive focus-visible:ring-destructive' : ''} aria-invalid={err} aria-label={`${label} marks for ${s.name || 'subject ' + (subjects.indexOf(s) + 1)}`} />
      </div>
    );
  };

  return (
    <MainLayout>
      <div ref={formRef} className="max-w-6xl mx-auto px-4 py-6 pb-28 space-y-6 min-w-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Marks Calculator</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Enter Mid, Sessional, Final and Practical marks to get your subject grades, SGPA and result sheet.
          </p>
        </div>

        <div className="grid xl:grid-cols-[minmax(0,1fr)_300px] gap-6 items-start">
          <div className="min-w-0 space-y-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Student details</CardTitle></CardHeader>
              <CardContent className="grid sm:grid-cols-2 gap-3">
                {([['name', 'Full name'], ['rollNo', 'Roll no'], ['program', 'Program (e.g. BSCS)'],
                  ['session', 'Session (e.g. Fall 2025)'], ['institute', 'University / Institute']] as const).map(([k, l]) => (
                  <div key={k} className={k === 'institute' ? 'sm:col-span-2 space-y-1 min-w-0' : 'space-y-1 min-w-0'}>
                    <Label htmlFor={`marks-${k}`} className="text-xs">{l}</Label>
                    <Input id={`marks-${k}`} data-marks-field onKeyDown={nextField} value={info[k]} maxLength={100} onChange={(e) => setInfo({ ...info, [k]: e.target.value })} />
                  </div>
                ))}
              </CardContent>
            </Card>

            {subjects.map((s, i) => {
              const r = computeSubject(s);
              return (
                <Card key={s.id}>
                   <CardContent className="p-4 sm:p-5 space-y-4">
                     <div className="grid grid-cols-[minmax(0,1fr)_72px_36px] sm:grid-cols-[minmax(0,1fr)_96px_36px] items-end gap-3">
                       <div className="min-w-0 space-y-1"><Label htmlFor={`${s.id}-name`} className="text-xs text-muted-foreground">Subject {i + 1}</Label>
                       <Input id={`${s.id}-name`} data-marks-field onKeyDown={nextField} placeholder="Subject name" value={s.name} maxLength={80}
                         onChange={(e) => update(s.id, { name: e.target.value })} /></div>
                       <div className="min-w-0 space-y-1"><Label htmlFor={`${s.id}-credits`} className="text-xs text-muted-foreground">Credits</Label>
                       <Input id={`${s.id}-credits`} data-marks-field onKeyDown={nextField} type="number" min={1} max={6} value={s.credits} aria-label={`Credit hours for ${s.name || 'subject ' + (i + 1)}`}
                        onChange={(e) => update(s.id, { credits: Math.max(1, Math.min(6, Number(e.target.value) || 1)) })}
                         /></div>
                      <Button variant="ghost" size="icon" aria-label="Remove subject"
                        onClick={() => setSubjects((p) => p.filter((x) => x.id !== s.id))}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                     <div className={`grid gap-3 ${s.hasPractical ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
                      {field(s, 'mid', 'Mid')}
                      {field(s, 'sessional', 'Sessional')}
                      {field(s, 'final', 'Final')}
                      {s.hasPractical && field(s, 'practical', 'Practical')}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                       <label className="flex items-center gap-2 text-sm cursor-pointer">
                         <Switch checked={s.hasPractical} onCheckedChange={(v) => update(s.id, { hasPractical: v })} aria-label={`Practical for ${s.name || 'subject ' + (i + 1)}`} />
                        <FlaskConical className="w-4 h-4 text-muted-foreground" /> Has practical
                      </label>
                       <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm tabular-nums">
                        <span className="text-muted-foreground">Total</span><b>{r.total}</b>
                        <span className="text-muted-foreground">· GP</span><b>{r.gp.toFixed(2)}</b>
                        <span className="text-muted-foreground">· QP</span><b>{r.qp.toFixed(1)}</b>
                        <Badge variant={r.passed ? 'secondary' : 'destructive'}>{r.grade}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSubjects((p) => [...p, newSubject()])} disabled={subjects.length >= 12}>
                <Plus className="w-4 h-4 mr-1" /> Add subject
              </Button>
              <Button variant="ghost" onClick={() => { setSubjects([newSubject()]); toast('Cleared'); }}>
                <RotateCcw className="w-4 h-4 mr-1" /> Reset
              </Button>
            </div>
          </div>

           <div className="xl:sticky xl:top-20 min-w-0 space-y-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Result summary</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-2">
                   <div className="text-5xl font-bold text-primary">{complete ? res.sgpa.toFixed(2) : '—'}</div>
                  <div className="text-xs text-muted-foreground mt-1">SGPA · Grade {res.grade}</div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                     {[['Credits', complete ? res.credits : '—'], ['Quality pts', complete ? res.qp : '—'], ['Marks', complete ? `${res.obtained}/${res.max}` : '—'],
                       ['Percentage', complete ? `${res.percentage.toFixed(2)}%` : '—']].map(([l, v]) => (
                    <div key={l as string} className="rounded-lg bg-muted/50 p-2">
                      <div className="text-xs text-muted-foreground">{l}</div><div className="font-semibold">{v}</div>
                    </div>
                  ))}
                </div>
                 {!complete ? <p className="text-sm text-muted-foreground">Complete all subject marks to see your result.</p> : res.failed.length ? (
                  <div className="flex gap-2 text-sm text-destructive"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    Fail in: {res.failed.join(', ')}</div>
                ) : (
                  <div className="flex gap-2 text-sm text-primary"><CheckCircle2 className="w-4 h-4" /> Pass</div>
                )}
                 <Button className="w-full" onClick={download} disabled={!complete || downloading}><Download className="w-4 h-4 mr-1" /> Download result sheet</Button>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-xs text-muted-foreground space-y-1">
                <p><b>Scheme:</b> Mid {MAX.mid} + Sessional {MAX.sessional} + Final {MAX.final} = 100.</p>
                 <p>With practical: 70% of theory + 30% of practical marks (entered out of {MAX.practical}); total rounded up.</p>
                <p>A ≥85 (4.0) · B+ 80–84 · B 70–79 · C 60–69 · D 50–59 · F &lt;50.</p>
                <p>Your entries are saved on this device automatically.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
