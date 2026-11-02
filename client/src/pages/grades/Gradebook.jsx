import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ClipboardList, Plus, Save, Undo2, MoreHorizontal, Pencil, Trash2, AlertCircle } from 'lucide-react';
import { useApi } from '../../lib/useApi.js';
import { api, errorMessage } from '../../lib/api.js';
import { useForm } from '../../lib/useForm.js';
import { useToast } from '../../context/ToastContext.jsx';
import { EVAL_TYPES, formatDate, formatGrade, gradeTone, todayISO } from '../../lib/format.js';
import {
  Select, Button, EmptyState, ErrorState, SkeletonRows, Modal, Input, Dropdown, ConfirmDialog, StatLine, Badge,
} from '../../components/ui/index.js';

const key = (evId, sId) => `${evId}:${sId}`;
const parse = (v) => (v === '' || v === null || v === undefined ? null : Number(String(v).replace(',', '.')));
const invalid = (v) => {
  if (v === '' || v === null || v === undefined) return false;
  const n = parse(v);
  return !Number.isFinite(n) || n < 0 || n > 20;
};

function EvaluationForm({ open, onClose, courseId, evaluation, onSaved }) {
  const EMPTY = { title: '', type: 'DEVOIR', weight: '1', date: todayISO() };
  const f = useForm(EMPTY, {
    validate: (v) => ({
      title: v.title.trim().length < 2 && 'L’intitulé est obligatoire.',
      weight: !(Number(v.weight) >= 0.5 && Number(v.weight) <= 10) && 'Le poids doit être entre 0,5 et 10.',
      date: !v.date && 'La date est obligatoire.',
    }),
  });
  useEffect(() => {
    if (open) f.reset(evaluation ? { title: evaluation.title, type: evaluation.type, weight: String(evaluation.weight), date: evaluation.date } : EMPTY);
  }, [open, evaluation]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (e) => {
    e.preventDefault();
    const ok = await f.submit(async (v) => {
      const body = { ...v, weight: Number(v.weight) };
      if (evaluation) await api.put(`/evaluations/${evaluation.id}`, body);
      else await api.post(`/courses/${courseId}/evaluations`, body);
    }, { success: evaluation ? 'Évaluation modifiée.' : 'Évaluation créée. Vous pouvez saisir les notes.' });
    if (ok) { onSaved(); onClose(); }
  };

  return (
    <Modal
      open={open} onClose={onClose} busy={f.saving} title={evaluation ? 'Modifier l’évaluation' : 'Nouvelle évaluation'}
      description="Le poids détermine l’importance de l’évaluation dans la moyenne du cours."
      footer={<><Button onClick={onClose} disabled={f.saving}>Annuler</Button><Button variant="primary" type="submit" form="eval-form" loading={f.saving}>Enregistrer</Button></>}
    >
      <form id="eval-form" onSubmit={save} noValidate className="grid gap-3 sm:grid-cols-2">
        <Input className="sm:col-span-2" label="Intitulé" required placeholder="Devoir 2" value={f.values.title} onChange={f.bind('title')} error={f.errors.title} />
        <Select label="Type" options={Object.entries(EVAL_TYPES).map(([value, label]) => ({ value, label }))} value={f.values.type} onChange={f.bind('type')} />
        <Input label="Poids" required type="number" min="0.5" max="10" step="0.5" value={f.values.weight} onChange={f.bind('weight')} error={f.errors.weight} />
        <Input label="Date" required type="date" value={f.values.date} onChange={f.bind('date')} error={f.errors.date} />
      </form>
    </Modal>
  );
}

export default function Gradebook() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const courseId = params.get('course') || '';
  const { data: courses, loading: loadingCourses } = useApi('/courses');
  const { data: book, loading, error, refresh } = useApi(courseId ? `/courses/${courseId}/gradebook` : null, null, { enabled: !!courseId });
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [evalModal, setEvalModal] = useState(null); // 'new' | evaluation
  const [evalDelete, setEvalDelete] = useState(null);

  // Select the first course automatically.
  useEffect(() => {
    if (!courseId && courses?.length) setParams({ course: courses[0].id }, { replace: true });
  }, [courseId, courses, setParams]);

  const original = useMemo(() => {
    const m = {};
    for (const g of book?.grades || []) m[key(g.evaluationId, g.studentId)] = String(g.value).replace('.', ',');
    return m;
  }, [book]);

  useEffect(() => { setDraft(original); }, [original]);

  const dirtyKeys = Object.keys({ ...original, ...draft }).filter((k) => (original[k] ?? '') !== (draft[k] ?? ''));
  const hasInvalid = Object.values(draft).some(invalid);

  useEffect(() => {
    if (!dirtyKeys.length) return undefined;
    const onBefore = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', onBefore);
    return () => window.removeEventListener('beforeunload', onBefore);
  }, [dirtyKeys.length]);

  const [pendingCourse, setPendingCourse] = useState(null);
  const changeCourse = (id) => {
    if (dirtyKeys.length) { setPendingCourse(id); return; }
    setParams(id ? { course: id } : {});
  };

  const save = async () => {
    if (hasInvalid) { toast.error('Corrigez les notes invalides (entre 0 et 20).'); return; }
    setSaving(true);
    try {
      const byEval = {};
      for (const k of dirtyKeys) {
        const [evId, sId] = k.split(':');
        (byEval[evId] ||= []).push({ studentId: sId, value: parse(draft[k]) });
      }
      let changed = 0;
      for (const [evId, grades] of Object.entries(byEval)) {
        const r = await api.put(`/evaluations/${evId}/grades`, { grades });
        changed += r.data.changed;
      }
      toast.success(`${changed} note${changed > 1 ? 's' : ''} enregistrée${changed > 1 ? 's' : ''}. Les étudiants ont été notifiés.`);
      await refresh({ silent: true });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally { setSaving(false); }
  };

  const deleteEval = async () => {
    try {
      await api.delete(`/evaluations/${evalDelete.id}`);
      toast.success('Évaluation supprimée.');
      refresh({ silent: true });
    } catch (err) { toast.error(errorMessage(err)); throw err; }
  };

  // Live average preview from the draft values.
  const liveAverage = (studentId) => {
    let s = 0; let w = 0;
    for (const ev of book.evaluations) {
      const v = draft[key(ev.id, studentId)];
      if (v !== undefined && v !== '' && !invalid(v)) { s += parse(v) * ev.weight; w += ev.weight; }
    }
    return w ? Math.round((s / w) * 100) / 100 : null;
  };

  if (loadingCourses) return <SkeletonRows />;
  if (!courses?.length) return <EmptyState icon={ClipboardList} title="Aucun cours à noter" message="Aucun cours ne vous est assigné pour le moment." />;

  return (
    <>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end">
        <Select
          label="Cours"
          className="sm:w-96"
          value={courseId}
          onChange={(e) => changeCourse(e.target.value)}
          options={courses.map((c) => ({ value: c.id, label: `${c.code} — ${c.title}${c.className ? ` (${c.className})` : ''}` }))}
        />
        <div className="flex flex-wrap gap-2 sm:ml-auto">
          <Button icon={Plus} onClick={() => setEvalModal('new')} disabled={!book}>Nouvelle évaluation</Button>
          <Button icon={Undo2} variant="ghost" onClick={() => setDraft(original)} disabled={!dirtyKeys.length || saving}>Annuler</Button>
          <Button icon={Save} variant="primary" onClick={save} loading={saving} disabled={!dirtyKeys.length || hasInvalid}>
            Enregistrer{dirtyKeys.length ? ` (${dirtyKeys.length})` : ''}
          </Button>
        </div>
      </div>

      {loading && !book ? <SkeletonRows /> : error ? <ErrorState message={error} onRetry={refresh} /> : book && (
        <>
          <StatLine items={[
            { label: 'Moyenne de la classe', value: formatGrade(book.stats.classAverage), tone: gradeTone(book.stats.classAverage) },
            { label: 'Étudiants ≥ 10', value: `${book.stats.passing} / ${book.stats.graded || 0}` },
            { label: 'Inscrits', value: book.stats.total },
            { label: 'Évaluations', value: book.evaluations.length },
          ]} />

          {hasInvalid && (
            <div className="mb-3 flex items-center gap-2 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
              <AlertCircle size={15} /> Certaines notes sont invalides : elles doivent être comprises entre 0 et 20.
            </div>
          )}

          {!book.students.length ? (
            <EmptyState title="Aucun étudiant inscrit à ce cours" />
          ) : !book.evaluations.length ? (
            <EmptyState icon={ClipboardList} title="Aucune évaluation" message="Créez une évaluation pour commencer la saisie des notes." action={<Button variant="primary" icon={Plus} onClick={() => setEvalModal('new')}>Nouvelle évaluation</Button>} />
          ) : (
            <div className="overflow-x-auto scrollbar-thin border-y border-line">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-line">
                    <th className="table-th sticky left-0 z-10 bg-white min-w-[180px]">Étudiant</th>
                    {book.evaluations.map((ev) => (
                      <th key={ev.id} className="table-th min-w-[120px] border-l border-line">
                        <div className="flex items-start justify-between gap-1">
                          <div>
                            <div className="text-ink font-medium">{ev.title}</div>
                            <div className="font-normal text-ink-muted">{EVAL_TYPES[ev.type]} · ×{ev.weight} · {formatDate(ev.date, { day: 'numeric', month: 'short' })}</div>
                          </div>
                          <Dropdown
                            trigger={(p) => <Button {...p} size="icon-sm" variant="ghost" icon={MoreHorizontal} aria-label={`Actions pour ${ev.title}`} />}
                            items={[
                              { label: 'Modifier', icon: Pencil, onClick: () => setEvalModal(ev) },
                              { label: 'Supprimer', icon: Trash2, danger: true, onClick: () => setEvalDelete(ev) },
                            ]}
                          />
                        </div>
                      </th>
                    ))}
                    <th className="table-th text-right border-l border-line min-w-[90px]">Moyenne</th>
                  </tr>
                </thead>
                <tbody>
                  {book.students.map((s) => {
                    const avg = liveAverage(s.id);
                    return (
                      <tr key={s.id} className="border-b border-line last:border-0 hover:bg-[#FAFAF9]">
                        <td className="table-td sticky left-0 bg-white">
                          <Link to={`/students/${s.id}`} className="font-medium hover:underline">{s.fullName}</Link>
                          <div className="text-xs text-ink-muted">{s.matricule}</div>
                        </td>
                        {book.evaluations.map((ev) => {
                          const k = key(ev.id, s.id);
                          const v = draft[k] ?? '';
                          const bad = invalid(v);
                          const dirty = (original[k] ?? '') !== v;
                          return (
                            <td key={ev.id} className="border-l border-line p-1">
                              <input
                                value={v}
                                inputMode="decimal"
                                onChange={(e) => setDraft((d) => ({ ...d, [k]: e.target.value }))}
                                onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); save(); } }}
                                placeholder="—"
                                aria-label={`Note de ${s.fullName} pour ${ev.title}`}
                                aria-invalid={bad}
                                className={`h-8 w-full rounded px-2 text-right tabular-nums outline-none transition-colors placeholder:text-ink-muted
                                  ${bad ? 'bg-danger-soft text-danger ring-1 ring-danger' : dirty ? 'bg-brand-sky/60' : 'hover:bg-hover focus:bg-white'}
                                  focus:ring-2 focus:ring-brand/40`}
                              />
                            </td>
                          );
                        })}
                        <td className={`table-td border-l border-line text-right font-semibold tabular-nums ${gradeTone(avg)}`}>{formatGrade(avg)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-2 text-xs text-ink-muted">
            Notes sur 20, décimales acceptées (ex. 13,5). Laissez vide pour « non noté ». Les cellules modifiées sont surlignées <Badge tone="blue">en bleu</Badge> jusqu’à l’enregistrement (Ctrl+S).
          </p>
        </>
      )}

      <EvaluationForm open={!!evalModal} onClose={() => setEvalModal(null)} courseId={courseId} evaluation={evalModal === 'new' ? null : evalModal} onSaved={() => refresh({ silent: true })} />
      <ConfirmDialog
        open={!!evalDelete} onClose={() => setEvalDelete(null)} onConfirm={deleteEval}
        title={`Supprimer « ${evalDelete?.title} » ?`}
        message="Toutes les notes de cette évaluation seront supprimées et les moyennes recalculées."
        confirmLabel="Supprimer"
      />
      <ConfirmDialog
        open={!!pendingCourse} onClose={() => setPendingCourse(null)}
        onConfirm={async () => { setParams({ course: pendingCourse }); }}
        title="Changer de cours ?"
        message={`${dirtyKeys.length} modification(s) non enregistrée(s) seront perdues.`}
        confirmLabel="Changer sans enregistrer"
      />
    </>
  );
}
