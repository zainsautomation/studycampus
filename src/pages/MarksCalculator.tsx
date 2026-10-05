import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Download, RotateCcw, FlaskConical, AlertTriangle, CheckCircle2, ArrowLeft, Pencil } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { useAppSettings, DEFAULT_SCHEME_TEXT } from '@/hooks/useAppSettings';
import { toast } from 'sonner';
import { MAX, computeAll, computeSubject, downloadMarksPdf, invalidField, newSubject, type MarksSubject } from '@/lib/marks';
import { trackEvent } from '@/lib/analytics';

const KEY = 'marks-draft-v1';
type Info = { name: string; rollNo: string; program: string; session: string; institute: string };

export default function MarksCalculator() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { settings: appSettings, updateSetting } = useAppSettings();
  const schemeVisible = appSettings.marks_scheme_visible;
  const schemeText = appSettings.marks_scheme_text || DEFAULT_SCHEME_TEXT;
  const [editOpen, setEditOpen] = useState(false);
  const [draftScheme, setDraftScheme] = useState('');
  const onEnterNext = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const t = e.target as HTMLElement;
    if (e.key !== 'Enter' || t.tagName !== 'INPUT') return;
    e.preventDefault();
    const inputs = Array.from(e.currentTarget.querySelectorAll<HTMLInputElement>('input:not([disabled]):not([type=hidden])'));
    const next = inputs[inputs.indexOf(t as HTMLInputElement) + 1];
    if (next) { next.focus(); next.select?.(); } else (t as HTMLInputElement).blur();
  };
  const saved = (() => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } })();
  const [info, setInfo] = useState<Info>(saved?.info ?? {
    name: (user?.user_metadata?.full_name as string) || '', rollNo: '', program: '', session: '', institute: '',
  });
  const [subjects, setSubjects] = useState<MarksSubject[]>(saved?.subjects ?? [newSubject(), newSubject()]);

  useEffect(() => { localStorage.setItem(KEY, JSON.stringify({ info, subjects })); }, [info, subjects]);

  const res = useMemo(() => computeAll(subjects), [subjects]);
  const update = (id: string, patch: Partial<MarksSubject>) =>
    setSubjects((p) => p.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const download = async () => {
    const bad = subjects.map(invalidField).find(Boolean);
    if (bad) return toast.error(`Fix marks: ${bad}`);
    if (!subjects.length) return toast.error('Add at least one subject');
    await downloadMarksPdf(info, subjects);
    trackEvent('marks_pdf_downloaded', { subjects: subjects.length });
    toast.success('Result sheet downloaded');
  };

  const field = (s: MarksSubject, k: 'mid' | 'sessional' | 'final' | 'practical', label: string) => {
    const v = parseFloat(s[k]);
    const err = Number.isFinite(v) && (v < 0 || v > MAX[k]);
    return (
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">{label} <span className="opacity-60">/{MAX[k]}</span></Label>
        <Input type="number" inputMode="decimal" step="0.5" min={0} max={MAX[k]} value={s[k]}
          onChange={(e) => update(s.id, { [k]: e.target.value })}
          className={err ? 'border-destructive focus-visible:ring-destructive' : ''} aria-label={`${label} marks`} />
      </div>
    );
  };

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6" onKeyDown={onEnterNext}>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" aria-label="Go back" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Marks Calculator</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Enter Mid, Sessional, Final and Practical marks to get your subject grades, SGPA and result sheet.
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Student details</CardTitle></CardHeader>
              <CardContent className="grid sm:grid-cols-2 gap-3">
                {([['name', 'Full name'], ['rollNo', 'Roll no'], ['program', 'Program (e.g. BSCS)'],
                  ['session', 'Session (e.g. Fall 2025)'], ['institute', 'University / Institute']] as const).map(([k, l]) => (
                  <div key={k} className={k === 'institute' ? 'sm:col-span-2 space-y-1' : 'space-y-1'}>
                    <Label className="text-xs">{l}</Label>
                    <Input value={info[k]} maxLength={100} onChange={(e) => setInfo({ ...info, [k]: e.target.value })} />
                  </div>
                ))}
              </CardContent>
            </Card>

            {subjects.map((s, i) => {
              const r = computeSubject(s);
              return (
                <Card key={s.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground w-6">{i + 1}.</span>
                      <Input placeholder="Subject name" value={s.name} maxLength={80}
                        onChange={(e) => update(s.id, { name: e.target.value })} className="flex-1" />
                      <Input type="number" min={1} max={6} value={s.credits} aria-label="Credit hours"
                        onChange={(e) => update(s.id, { credits: Math.max(1, Math.min(6, Number(e.target.value) || 1)) })}
                        className="w-16" />
                      <span className="text-xs text-muted-foreground">Cr</span>
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
                      <label className="flex items-center gap-2 text-sm">
                        <Switch checked={s.hasPractical} onCheckedChange={(v) => update(s.id, { hasPractical: v })} />
                        <FlaskConical className="w-4 h-4 text-muted-foreground" /> Has practical
                      </label>
                      <div className="flex items-center gap-2 text-sm">
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

          <div className="lg:sticky lg:top-20 h-fit space-y-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Result summary</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-2">
                  <div className="text-5xl font-bold text-primary">{res.sgpa.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground mt-1">SGPA · Grade {res.grade}</div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {[['Credits', res.credits], ['Quality pts', res.qp], ['Marks', `${res.obtained}/${res.max}`],
                    ['Percentage', `${res.percentage.toFixed(2)}%`]].map(([l, v]) => (
                    <div key={l as string} className="rounded-lg bg-muted/50 p-2">
                      <div className="text-xs text-muted-foreground">{l}</div><div className="font-semibold">{v}</div>
                    </div>
                  ))}
                </div>
                {res.failed.length ? (
                  <div className="flex gap-2 text-sm text-destructive"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    Fail in: {res.failed.join(', ')}</div>
                ) : (
                  <div className="flex gap-2 text-sm text-primary"><CheckCircle2 className="w-4 h-4" /> Pass</div>
                )}
                <Button className="w-full" onClick={download}><Download className="w-4 h-4 mr-1" /> Download result sheet</Button>
              </CardContent>
            </Card>
            {schemeVisible && <Card>
              <CardContent className="p-4 text-xs text-muted-foreground space-y-1 relative">
                {isAdmin && (
                  <Button variant="ghost" size="icon" aria-label="Edit scheme text"
                    className="absolute top-2 right-2 h-7 w-7"
                    onClick={() => { setDraftScheme(schemeText); setEditOpen(true); }}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                )}
                {schemeText.split('\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
                <p>Your entries are saved on this device automatically.</p>
              </CardContent>
            </Card>}
          </div>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit scheme text</DialogTitle></DialogHeader>
          <Textarea value={draftScheme} onChange={(e) => setDraftScheme(e.target.value)}
            rows={6} maxLength={500} aria-label="Scheme text" />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDraftScheme(DEFAULT_SCHEME_TEXT)}>Reset to default</Button>
            <Button disabled={updateSetting.isPending || !draftScheme.trim()}
              onClick={() => updateSetting.mutate({ key: 'marks_scheme_text', value: draftScheme.trim() }, {
                onSuccess: () => { setEditOpen(false); toast.success('Scheme text updated'); },
                onError: () => toast.error('Could not save'),
              })}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
