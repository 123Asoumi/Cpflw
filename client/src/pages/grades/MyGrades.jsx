import { useState } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, ChevronDown, ChevronRight, Info } from 'lucide-react';
import { useApi } from '../../lib/useApi.js';
import { EVAL_TYPES, formatDate, formatGrade, gradeTone } from '../../lib/format.js';
import { PageHeader, StatLine, SkeletonRows, ErrorState, EmptyState, Badge, Meter, Section } from '../../components/ui/index.js';

function mention(avg) {
  if (avg === null) return null;
  if (avg >= 16) return ['Très bien', 'green'];
  if (avg >= 14) return ['Bien', 'green'];
  if (avg >= 12) return ['Assez bien', 'blue'];
  if (avg >= 10) return ['Passable', 'gray'];
  return ['Non validé', 'red'];
}

export default function MyGrades() {
  const { data, loading, error, refresh } = useApi('/grades/me');
  const [open, setOpen] = useState({});

  if (loading && !data) return <SkeletonRows rows={8} />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;
  const m = mention(data.generalAverage);
  const best = data.courses.filter((c) => c.average !== null).sort((a, b) => b.average - a.average)[0];
  const weakest = data.courses.filter((c) => c.average !== null).sort((a, b) => a.average - b.average)[0];

  return (
    <>
      <PageHeader icon={GraduationCap} title="Mes notes" description="Vos résultats par cours et votre moyenne générale pondérée." />

      <StatLine items={[
        { label: 'Moyenne générale', value: formatGrade(data.generalAverage), tone: gradeTone(data.generalAverage), hint: m?.[0] },
        { label: 'Crédits validés', value: `${data.creditsEarned} / ${data.creditsTotal}` },
        best && { label: 'Meilleur cours', value: best.code, hint: formatGrade(best.average) },
        weakest && { label: 'À renforcer', value: weakest.code, hint: formatGrade(weakest.average) },
      ]} />

      <div className="mb-6 flex items-start gap-2 rounded-lg bg-side px-3 py-2.5 text-xs text-ink-soft">
        <Info size={14} className="mt-0.5 shrink-0" />
        <span>
          Moyenne d’un cours = Σ(note × poids de l’évaluation) / Σ(poids). Moyenne générale = Σ(moyenne du cours × coefficient) / Σ(coefficients des cours notés).
          Un cours est validé (crédits acquis) à partir de 10/20.
        </span>
      </div>

      <Section title="Résultats par cours">
        {!data.courses.length ? <EmptyState icon={GraduationCap} title="Aucun cours" /> : (
          <div className="border-y border-line divide-y divide-line">
            {data.courses.map((c) => {
              const isOpen = open[c.courseId];
              const cm = mention(c.average);
              return (
                <div key={c.courseId}>
                  <button
                    type="button"
                    onClick={() => setOpen((o) => ({ ...o, [c.courseId]: !o[c.courseId] }))}
                    className="flex w-full items-center gap-3 px-1 py-3 text-left hover:bg-[#FAFAF9]"
                    aria-expanded={!!isOpen}
                  >
                    {isOpen ? <ChevronDown size={15} className="text-ink-soft" /> : <ChevronRight size={15} className="text-ink-soft" />}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge>{c.code}</Badge>
                        <span className="truncate text-sm font-medium">{c.title}</span>
                      </div>
                      <div className="mt-0.5 text-xs text-ink-soft">Coef. {c.coefficient} · {c.credits} crédits · {c.professor || 'Professeur à assigner'}</div>
                    </div>
                    <div className="hidden sm:block w-28"><Meter value={c.average ?? 0} max={20} tone={c.average === null ? 'brand' : c.average >= 10 ? 'green' : 'red'} /></div>
                    {cm && <Badge tone={cm[1]} className="hidden md:inline-flex">{cm[0]}</Badge>}
                    <span className={`w-14 text-right text-sm font-semibold tabular-nums ${gradeTone(c.average)}`}>{formatGrade(c.average)}</span>
                  </button>
                  {isOpen && (
                    <div className="pl-8 pr-1 pb-3">
                      {c.evaluations.length ? (
                        <table className="w-full text-sm">
                          <thead><tr className="text-xs text-ink-soft"><th className="py-1 text-left font-medium">Évaluation</th><th className="py-1 text-left font-medium hidden sm:table-cell">Date</th><th className="py-1 text-right font-medium">Poids</th><th className="py-1 text-right font-medium">Note</th></tr></thead>
                          <tbody>
                            {c.evaluations.map((e) => (
                              <tr key={e.id} className="border-t border-line">
                                <td className="py-1.5">{e.title} <span className="text-ink-soft">· {EVAL_TYPES[e.type]}</span></td>
                                <td className="py-1.5 text-ink-soft hidden sm:table-cell">{formatDate(e.date)}</td>
                                <td className="py-1.5 text-right text-ink-soft">{e.weight}</td>
                                <td className={`py-1.5 text-right font-medium tabular-nums ${gradeTone(e.value)}`}>{e.value === null ? 'Non noté' : `${formatGrade(e.value)}/20`}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : <p className="text-sm text-ink-soft py-1">Aucune évaluation pour ce cours.</p>}
                      <Link to={`/courses/${c.courseId}`} className="mt-2 inline-block text-xs text-ink-soft hover:text-ink">Voir le cours →</Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </>
  );
}
