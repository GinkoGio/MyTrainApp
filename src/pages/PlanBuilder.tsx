import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlanStore } from '../store/usePlanStore';
import { uid } from '../utils/id';
import { buildSuggestions } from '../data/exerciseLibrary';
import { serializePlan, parsePlan, planFileName, planSummary, decodePlanParam } from '../utils/planTransfer';
import { parsePlansCsv, planToCsv } from '../utils/csvImport';
import type { TrainingPlan, TrainingDay, PlannedExercise, SetDefinition } from '../types';
import BottomNav from '../components/BottomNav';
import ShareModal from '../components/ShareModal';
import { PENDING_IMPORT_KEY } from '../App';

const allSetsEqual = (sets: SetDefinition[]) =>
  sets.length > 0 && sets.every((s) => s.reps === sets[0].reps && s.weight === sets[0].weight);

export default function PlanBuilder() {
  const navigate = useNavigate();
  const {
    plans, activePlanId, addPlan, deletePlan, setActivePlan,
    addDay, deleteDay, duplicateDay, duplicateWeek, reorderDays,
    addExercise, updateExercise, deleteExercise, reorderExercises,
  } = usePlanStore();

  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(activePlanId ?? plans[0]?.id ?? null);
  const [newPlanName, setNewPlanName] = useState('');
  const [expandedDayId, setExpandedDayId] = useState<string | null>(null);
  const [editingExercise, setEditingExercise] = useState<{ dayId: string; ex: PlannedExercise } | null>(null);
  // Import da link/QR: il payload è stato salvato in sessionStorage da App.
  // Lo decodifichiamo una sola volta all'avvio (init lazy) e ripuliamo lo
  // storage in un effetto, così un refresh non re-importa.
  const [pendingImport] = useState<{ plan: TrainingPlan | null; error: string | null }>(() => {
    const param = sessionStorage.getItem(PENDING_IMPORT_KEY);
    if (!param) return { plan: null, error: null };
    try {
      return { plan: decodePlanParam(param), error: null };
    } catch (err) {
      return { plan: null, error: err instanceof Error ? err.message : 'Link non valido.' };
    }
  });

  const [importPreview, setImportPreview] = useState<TrainingPlan | null>(pendingImport.plan);
  const [importError, setImportError] = useState<string | null>(pendingImport.error);
  const [shareTarget, setShareTarget] = useState<TrainingPlan | null>(null);
  const [exportTarget, setExportTarget] = useState<TrainingPlan | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    sessionStorage.removeItem(PENDING_IMPORT_KEY);
  }, []);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) ?? null;

  const usedNames = useMemo(
    () => plans.flatMap((p) => p.days.flatMap((d) => d.exercises.map((e) => e.name))),
    [plans]
  );
  const suggestions = useMemo(() => buildSuggestions(usedNames), [usedNames]);

  const weeks = useMemo(() => {
    if (!selectedPlan) return [];
    const byWeek = new Map<number, TrainingDay[]>();
    for (const d of selectedPlan.days) {
      if (!byWeek.has(d.week)) byWeek.set(d.week, []);
      byWeek.get(d.week)!.push(d);
    }
    return [...byWeek.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([week, days]) => ({ week, days: days.sort((a, b) => a.day - b.day) }));
  }, [selectedPlan]);

  const handleCreatePlan = () => {
    if (!newPlanName.trim()) return;
    const plan: TrainingPlan = { id: uid(), name: newPlanName.trim(), days: [], createdAt: new Date().toISOString() };
    addPlan(plan);
    setSelectedPlanId(plan.id);
    setActivePlan(plan.id);
    setNewPlanName('');
  };

  const handleAddDay = () => {
    if (!selectedPlan) return;
    const maxWeek = selectedPlan.days.length ? Math.max(...selectedPlan.days.map((d) => d.week)) : 1;
    const week = maxWeek || 1;
    const day = selectedPlan.days.filter((d) => d.week === week).length + 1;
    const newDay: TrainingDay = { id: uid(), week, day, exercises: [] };
    addDay(selectedPlan.id, newDay);
    setExpandedDayId(newDay.id);
  };

  const handleSaveExercise = (dayId: string, ex: PlannedExercise) => {
    if (!selectedPlan) return;
    const day = selectedPlan.days.find((d) => d.id === dayId);
    if (!day) return;
    if (day.exercises.find((e) => e.id === ex.id)) {
      updateExercise(selectedPlan.id, dayId, ex);
    } else {
      addExercise(selectedPlan.id, dayId, ex);
    }
    setEditingExercise(null);
  };

  const handleMoveDay = (week: number, dayId: string, dir: -1 | 1) => {
    if (!selectedPlan) return;
    const weekDays = selectedPlan.days
      .filter((d) => d.week === week)
      .sort((a, b) => a.day - b.day);
    const idx = weekDays.findIndex((d) => d.id === dayId);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= weekDays.length) return;
    const reordered = [...weekDays];
    [reordered[idx], reordered[target]] = [reordered[target], reordered[idx]];
    reorderDays(selectedPlan.id, week, reordered);
  };

  const handleMoveExercise = (dayId: string, exId: string, dir: -1 | 1) => {
    if (!selectedPlan) return;
    const day = selectedPlan.days.find((d) => d.id === dayId);
    if (!day) return;
    const idx = day.exercises.findIndex((e) => e.id === exId);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= day.exercises.length) return;
    const reordered = [...day.exercises];
    [reordered[idx], reordered[target]] = [reordered[target], reordered[idx]];
    reorderExercises(selectedPlan.id, dayId, reordered);
  };

  const downloadFile = (name: string, content: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permette di re-importare lo stesso file
    if (!file) return;
    try {
      // La conferma avviene in un modale in-app, non con confirm() nativo:
      // dopo un await il contesto del gesto utente è perso e alcuni browser
      // bloccano i dialog nativi, annullando silenziosamente l'import.
      const text = (await file.text()).trimStart();
      const isJson = text.startsWith('{') || text.startsWith('[');
      let plan: TrainingPlan;
      if (isJson) {
        plan = parsePlan(text);
      } else {
        const plans = parsePlansCsv(text);
        if (plans.length > 1) {
          throw new Error('Il CSV contiene più clienti: usa Strumenti → Genera link in blocco.');
        }
        plan = plans[0];
      }
      setImportError(null);
      setImportPreview(plan);
    } catch (err) {
      setImportPreview(null);
      setImportError(err instanceof Error ? err.message : 'File non valido.');
    }
  };

  const confirmImport = () => {
    if (!importPreview) return;
    addPlan(importPreview);
    setSelectedPlanId(importPreview.id);
    setImportPreview(null);
  };

  const exportJson = (plan: TrainingPlan) => {
    downloadFile(planFileName(plan, 'json'), serializePlan(plan), 'application/json');
    setExportTarget(null);
  };
  const exportCsv = (plan: TrainingPlan) => {
    downloadFile(planFileName(plan, 'csv'), planToCsv(plan), 'text/csv');
    setExportTarget(null);
  };

  return (
    <div className="max-w-lg mx-auto min-h-screen flex flex-col">
      {/* Sticky header */}
      <header className="sticky top-0 z-20 border-b border-border px-4 py-3 flex items-center gap-3"
        style={{ background: 'linear-gradient(180deg, rgba(22,18,16,0.96), rgba(22,18,16,0.78))', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
        <button
          onClick={() => navigate('/')}
          aria-label="Torna alla home"
          className="w-9 h-9 flex items-center justify-center rounded-full text-text-2 hover:text-text-1 hover:bg-surface-2 transition-colors active:scale-90 border-none bg-transparent cursor-pointer"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h1 className="tt-display text-[22px] flex-1">Le tue schede</h1>
        <button
          onClick={() => navigate('/tools')}
          aria-label="Strumenti: genera link in blocco"
          className="text-xs text-text-2 hover:text-accent border border-border hover:border-accent-border px-2.5 py-1.5 rounded-btn transition-colors active:scale-95 font-display font-semibold bg-surface-2 cursor-pointer flex items-center gap-[5px] shrink-0"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
          Blocco
        </button>
      </header>

      <div className="p-4 pb-32 flex flex-col gap-5">
        {/* Plan chips + new plan */}
        <section className="flex flex-col gap-3">
          {plans.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {plans.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPlanId(p.id)}
                  className={`shrink-0 px-[14px] py-2 rounded-chip text-[13px] font-display font-semibold transition-all active:scale-95 flex items-center gap-[6px] border cursor-pointer ${
                    selectedPlanId === p.id
                      ? 'bg-accent text-on-accent border-transparent'
                      : 'bg-surface-2 text-text-2 border-border hover:border-accent-border'
                  }`}
                >
                  {p.name}
                  {activePlanId === p.id && (
                    <span
                      className="w-[7px] h-[7px] rounded-full shrink-0"
                      style={{
                        background: selectedPlanId === p.id ? 'var(--color-on-accent)' : 'var(--color-verde)',
                        boxShadow: selectedPlanId === p.id ? 'none' : '0 0 8px #43b074',
                      }}
                    />
                  )}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              value={newPlanName}
              onChange={(e) => setNewPlanName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreatePlan()}
              placeholder="Nome nuova scheda…"
              className="flex-1 bg-surface text-text-1 rounded-input px-3.5 py-2.5 text-sm outline-none border border-border focus:border-accent transition-colors font-body placeholder:text-text-3"
            />
            <button
              onClick={handleCreatePlan}
              disabled={!newPlanName.trim()}
              className="bg-accent-soft hover:bg-accent-soft border border-accent-border text-accent px-4 rounded-input text-sm font-display font-bold transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
            >
              + Crea
            </button>
          </div>

          {/* Import da file JSON */}
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json,text/csv,.csv"
            onChange={handleImportFile}
            className="hidden"
          />
          <button
            onClick={() => importInputRef.current?.click()}
            className="self-start text-xs text-text-2 hover:text-accent flex items-center gap-[6px] transition-colors active:scale-95 font-display font-semibold bg-transparent border-none cursor-pointer"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Importa scheda da file (JSON o CSV)
          </button>
        </section>

        {!selectedPlan && plans.length === 0 && (
          <div className="text-center py-16 text-text-3 font-body">
            <p>Crea la tua prima scheda per iniziare.</p>
          </div>
        )}

        {selectedPlan && (
          <section className="flex flex-col gap-4">
            {/* Plan title + status */}
            <div className="flex items-center justify-between gap-2">
              <h2 className="tt-display text-[22px] truncate">{selectedPlan.name}</h2>
              <div className="flex gap-2 shrink-0 items-center">
                <button
                  onClick={() => setShareTarget(selectedPlan)}
                  aria-label="Condividi scheda via QR o link"
                  className="text-xs text-text-2 hover:text-accent border border-border hover:border-accent-border px-2.5 py-1.5 rounded-btn transition-colors active:scale-95 font-display font-semibold bg-surface-2 cursor-pointer flex items-center gap-[5px]"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7" rx="1"/>
                    <rect x="14" y="3" width="7" height="7" rx="1"/>
                    <rect x="3" y="14" width="7" height="7" rx="1"/>
                    <line x1="14" y1="14" x2="14" y2="21"/>
                    <line x1="18" y1="14" x2="21" y2="14"/>
                    <line x1="21" y1="18" x2="21" y2="21"/>
                  </svg>
                  Condividi
                </button>
                <button
                  onClick={() => setExportTarget(selectedPlan)}
                  aria-label="Esporta scheda come file"
                  className="text-xs text-text-2 hover:text-accent border border-border hover:border-accent-border px-2.5 py-1.5 rounded-btn transition-colors active:scale-95 font-display font-semibold bg-surface-2 cursor-pointer flex items-center gap-[5px]"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Esporta
                </button>
                {activePlanId === selectedPlan.id ? (
                  <span className="inline-flex items-center gap-[5px] font-mono text-[11px] text-verde tracking-[0.04em]">
                    <span
                      className="w-[7px] h-[7px] rounded-full bg-verde"
                      style={{ boxShadow: '0 0 8px #43b074' }}
                    />
                    ATTIVA
                  </span>
                ) : (
                  <button
                    onClick={() => setActivePlan(selectedPlan.id)}
                    className="text-xs text-text-2 border border-border hover:border-accent-border px-2.5 py-1.5 rounded-btn transition-colors active:scale-95 font-display font-semibold bg-surface-2 cursor-pointer"
                  >
                    Rendi attiva
                  </button>
                )}
                <button
                  onClick={() => {
                    if (!confirm(`Eliminare la scheda "${selectedPlan.name}"?`)) return;
                    deletePlan(selectedPlan.id);
                    setSelectedPlanId(plans.find((p) => p.id !== selectedPlan.id)?.id ?? null);
                  }}
                  className="text-xs text-danger border border-danger/30 hover:bg-danger/10 px-2.5 py-1.5 rounded-btn transition-colors active:scale-95 font-display font-semibold cursor-pointer"
                >
                  Elimina
                </button>
              </div>
            </div>

            {selectedPlan.days.length === 0 && (
              <p className="text-text-3 text-sm text-center py-4 font-body">
                Nessun giorno. Aggiungine uno qui sotto.
              </p>
            )}

            {/* Weeks */}
            {weeks.map(({ week, days }) => (
              <div key={week} className="flex flex-col gap-[10px]">
                <div className="flex items-center justify-between">
                  <span
                    className="tt-eyebrow"
                    style={{ color: 'var(--color-text-3)' }}
                  >
                    Settimana {week}
                  </span>
                  <button
                    onClick={() => duplicateWeek(selectedPlan.id, week)}
                    className="text-xs text-accent hover:text-accent-hover flex items-center gap-1 transition-colors active:scale-95 font-display font-semibold bg-transparent border-none cursor-pointer"
                  >
                    ⧉ Duplica settimana
                  </button>
                </div>

                {days.map((dayObj, dayIdx) => (
                  <DayCard
                    key={dayObj.id}
                    day={dayObj}
                    expanded={expandedDayId === dayObj.id}
                    canMoveUp={dayIdx > 0}
                    canMoveDown={dayIdx < days.length - 1}
                    onMove={(dir) => handleMoveDay(week, dayObj.id, dir)}
                    onToggle={() => setExpandedDayId(expandedDayId === dayObj.id ? null : dayObj.id)}
                    onDelete={() => {
                      if (confirm(`Eliminare il giorno ${dayObj.day} della settimana ${dayObj.week}?`))
                        deleteDay(selectedPlan.id, dayObj.id);
                    }}
                    onDuplicate={() => duplicateDay(selectedPlan.id, dayObj.id)}
                    onAddExercise={() =>
                      setEditingExercise({
                        dayId: dayObj.id,
                        ex: {
                          id: uid(),
                          name: '',
                          sets: Array.from({ length: 3 }, () => ({ reps: 10, weight: 20 })),
                          restSeconds: 90,
                        },
                      })
                    }
                    onEditExercise={(ex) => setEditingExercise({ dayId: dayObj.id, ex })}
                    onDeleteExercise={(exId) => deleteExercise(selectedPlan.id, dayObj.id, exId)}
                    onMoveExercise={(exId, dir) => handleMoveExercise(dayObj.id, exId, dir)}
                  />
                ))}
              </div>
            ))}

            {/* Add day */}
            <button
              onClick={handleAddDay}
              className="w-full text-accent border border-dashed border-accent-border rounded-input py-[14px] text-sm font-display font-semibold transition-all active:scale-[0.98] hover:bg-accent-soft flex items-center justify-center gap-[6px] cursor-pointer bg-transparent"
            >
              + Aggiungi giorno
            </button>
          </section>
        )}
      </div>

      {editingExercise && (
        <ExerciseEditor
          dayId={editingExercise.dayId}
          exercise={editingExercise.ex}
          suggestions={suggestions}
          onSave={handleSaveExercise}
          onCancel={() => setEditingExercise(null)}
        />
      )}

      {shareTarget && (
        <ShareModal plan={shareTarget} onClose={() => setShareTarget(null)} />
      )}

      {/* Scelta formato export */}
      {exportTarget && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-6"
          style={{ background: 'rgba(10,8,7,0.6)', backdropFilter: 'blur(3px)' }}
          onClick={() => setExportTarget(null)}
        >
          <div className="tt-card p-[22px] flex flex-col gap-3 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="tt-display text-[20px]">Esporta scheda</div>
            <button
              onClick={() => exportJson(exportTarget)}
              className="tt-btn-primary py-[13px] text-[14.5px] w-full"
            >
              File JSON (backup esatto)
            </button>
            <button
              onClick={() => exportCsv(exportTarget)}
              className="bg-surface-2 border border-border text-text-1 py-[13px] rounded-btn font-display font-semibold text-[14px] w-full cursor-pointer hover:border-accent-border transition-colors"
            >
              File CSV (modificabile in Excel)
            </button>
            <p className="font-body text-[12px] text-text-3 leading-relaxed">
              JSON: formato esatto, ideale come backup. CSV: leggibile e modificabile
              in un foglio di calcolo, reimportabile da qui.
            </p>
            <button
              onClick={() => setExportTarget(null)}
              className="text-text-2 text-[13px] font-display font-semibold bg-transparent border-none cursor-pointer mt-1"
            >
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* Conferma import (modale in-app) */}
      {importPreview && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-6"
          style={{ background: 'rgba(10,8,7,0.6)', backdropFilter: 'blur(3px)' }}
          onClick={() => setImportPreview(null)}
        >
          <div className="tt-card p-[22px] flex flex-col gap-2 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="tt-display text-[20px]">Importare questa scheda?</div>
            <p className="font-display font-bold text-[15px] text-text-1">{importPreview.name}</p>
            <p className="font-mono text-[12px] text-text-3">{planSummary(importPreview)}</p>
            <p className="font-body text-[12.5px] text-text-2">Verrà aggiunta come nuova scheda.</p>
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setImportPreview(null)}
                className="flex-1 bg-surface-2 border border-border text-text-2 py-[13px] rounded-btn font-display font-semibold text-[14px] cursor-pointer"
              >
                Annulla
              </button>
              <button onClick={confirmImport} className="flex-1 tt-btn-primary py-[13px] text-[14.5px]">
                Importa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Errore import (modale in-app) */}
      {importError && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-6"
          style={{ background: 'rgba(10,8,7,0.6)', backdropFilter: 'blur(3px)' }}
          onClick={() => setImportError(null)}
        >
          <div className="tt-card p-[22px] flex flex-col gap-2 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="tt-display text-[20px]">Import non riuscito</div>
            <p className="font-body text-[13.5px] text-text-2">{importError}</p>
            <button
              onClick={() => setImportError(null)}
              className="tt-btn-primary py-[13px] text-[14.5px] mt-2"
            >
              Ho capito
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

function DayCard({
  day, expanded, canMoveUp, canMoveDown, onMove, onToggle, onDelete, onDuplicate, onAddExercise, onEditExercise, onDeleteExercise, onMoveExercise,
}: {
  day: TrainingDay;
  expanded: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (dir: -1 | 1) => void;
  onToggle: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onAddExercise: () => void;
  onEditExercise: (ex: PlannedExercise) => void;
  onDeleteExercise: (id: string) => void;
  onMoveExercise: (id: string, dir: -1 | 1) => void;
}) {
  return (
    <div className={`tt-card overflow-hidden transition-shadow ${expanded ? '' : ''}`}>
      <div className="w-full flex items-center px-[14px] py-[14px] gap-3">
        {/* Riordino giorno su/giù */}
        {(canMoveUp || canMoveDown) && (
          <div className="flex flex-col text-text-3 shrink-0">
            <button
              onClick={() => onMove(-1)}
              disabled={!canMoveUp}
              aria-label="Sposta giorno su"
              className="disabled:opacity-25 leading-none p-0.5 transition-colors hover:text-text-1 bg-transparent border-none cursor-pointer"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'rotate(180deg)' }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            <button
              onClick={() => onMove(1)}
              disabled={!canMoveDown}
              aria-label="Sposta giorno giù"
              className="disabled:opacity-25 leading-none p-0.5 transition-colors hover:text-text-1 bg-transparent border-none cursor-pointer"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
          </div>
        )}

        <button
          onClick={onToggle}
          className="flex-1 min-w-0 flex items-center justify-between text-left active:opacity-80 transition-opacity bg-transparent border-none cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-btn bg-accent-soft border border-accent-border text-accent font-mono font-bold flex items-center justify-center text-sm shrink-0">
              G{day.day}
            </div>
            <div className="min-w-0">
              <span className="text-text-1 font-display font-bold text-[15px]">
                Giorno {day.day}
                {day.label && <span className="text-text-2 font-medium"> · {day.label}</span>}
              </span>
              <p className="text-text-3 text-xs font-body mt-[1px]">
                {day.exercises.length === 0 ? 'nessun esercizio' : `${day.exercises.length} esercizi`}
              </p>
            </div>
          </div>
          <span className={`text-text-3 shrink-0 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </span>
        </button>
      </div>

      <div className={`grid transition-all duration-300 ease-out ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <div className="px-[14px] pb-[14px] flex flex-col gap-2">
            {day.exercises.map((ex, idx) => (
              <div key={ex.id} className="bg-surface-inset rounded-input p-[11px_12px] flex items-center gap-[10px]">
                <div className="flex flex-col text-text-3">
                  <button
                    onClick={() => onMoveExercise(ex.id, -1)}
                    disabled={idx === 0}
                    aria-label="Sposta esercizio su"
                    className="disabled:opacity-25 text-xs leading-none p-0.5 transition-colors hover:text-text-1 bg-transparent border-none cursor-pointer"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'rotate(180deg)' }}>
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </button>
                  <button
                    onClick={() => onMoveExercise(ex.id, 1)}
                    disabled={idx === day.exercises.length - 1}
                    aria-label="Sposta esercizio giù"
                    className="disabled:opacity-25 text-xs leading-none p-0.5 transition-colors hover:text-text-1 bg-transparent border-none cursor-pointer"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </button>
                </div>

                <button onClick={() => onEditExercise(ex)} className="flex-1 text-left min-w-0 bg-transparent border-none cursor-pointer p-0">
                  <p className="text-text-1 font-body font-semibold text-[13.5px] truncate">{ex.name || '—'}</p>
                  <p className="font-mono text-[11px] text-text-2 mt-[2px]">
                    {ex.sets.length}×{ex.sets[0]?.repsNote ?? ex.sets[0]?.reps} · {ex.sets[0]?.weightNote ?? `${ex.sets[0]?.weight}kg`} · pausa {ex.restSeconds}s
                    {!allSetsEqual(ex.sets) && (
                      <span className="text-accent ml-[5px]">· var.</span>
                    )}
                  </p>
                </button>

                <button
                  onClick={() => onDeleteExercise(ex.id)}
                  aria-label={`Elimina ${ex.name || 'esercizio'}`}
                  className="text-text-3 hover:text-danger w-7 h-7 flex items-center justify-center rounded-input hover:bg-danger/10 transition-colors bg-transparent border-none cursor-pointer"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            ))}

            <button
              onClick={onAddExercise}
              className="text-sm text-accent border border-dashed border-accent-border rounded-input py-[10px] transition-all active:scale-[0.98] font-display font-semibold hover:bg-accent-soft flex items-center justify-center gap-[6px] cursor-pointer bg-transparent"
            >
              + Aggiungi esercizio
            </button>

            <div className="flex justify-between mt-1 pt-1">
              <button
                onClick={onDuplicate}
                className="text-xs text-text-2 hover:text-text-1 transition-colors active:scale-95 font-display font-semibold flex items-center gap-1 bg-transparent border-none cursor-pointer"
              >
                ⧉ Duplica giorno
              </button>
              <button
                onClick={onDelete}
                className="text-xs text-danger hover:text-danger transition-colors active:scale-95 font-display font-semibold bg-transparent border-none cursor-pointer"
              >
                Elimina giorno
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExerciseEditor({
  dayId, exercise, suggestions, onSave, onCancel,
}: {
  dayId: string;
  exercise: PlannedExercise;
  suggestions: string[];
  onSave: (dayId: string, ex: PlannedExercise) => void;
  onCancel: () => void;
}) {
  const isNew = !exercise.name;
  const startAdvanced = !allSetsEqual(exercise.sets);

  const [name, setName] = useState(exercise.name);
  const [restSeconds, setRestSeconds] = useState(exercise.restSeconds);
  const [mode, setMode] = useState<'quick' | 'advanced'>(startAdvanced ? 'advanced' : 'quick');

  const [qSets, setQSets] = useState(exercise.sets.length || 3);
  const [qReps, setQReps] = useState(exercise.sets[0]?.reps ?? 10);
  const [qWeight, setQWeight] = useState(exercise.sets[0]?.weight ?? 20);

  const [sets, setSets] = useState<SetDefinition[]>(exercise.sets);

  const [showSug, setShowSug] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isNew) nameRef.current?.focus();
  }, [isNew]);

  const filteredSug = useMemo(() => {
    const q = name.trim().toLowerCase();
    const pool = q
      ? suggestions.filter((s) => s.toLowerCase().includes(q) && s.toLowerCase() !== q)
      : suggestions;
    return pool.slice(0, 6);
  }, [name, suggestions]);

  const switchToAdvanced = () => {
    setSets(Array.from({ length: qSets }, () => ({ reps: qReps, weight: qWeight })));
    setMode('advanced');
  };
  const switchToQuick = () => {
    setQSets(sets.length || 1);
    setQReps(sets[0]?.reps ?? 10);
    setQWeight(sets[0]?.weight ?? 20);
    setMode('quick');
  };

  const updateAdvSet = (idx: number, field: keyof SetDefinition, value: number) =>
    setSets(sets.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  const addAdvSet = () => setSets([...sets, { ...(sets[sets.length - 1] ?? { reps: 10, weight: 20 }) }]);
  const removeAdvSet = (idx: number) => setSets(sets.filter((_, i) => i !== idx));

  const handleSave = () => {
    const finalSets: SetDefinition[] =
      mode === 'quick'
        ? Array.from({ length: Math.max(1, qSets) }, () => ({ reps: qReps, weight: qWeight }))
        : sets;
    onSave(dayId, { id: exercise.id, name: name.trim(), restSeconds, sets: finalSets });
  };

  return (
    <div
      className="fixed inset-0 flex items-end justify-center z-50 animate-[fadeIn_0.15s_ease-out]"
      style={{ background: 'rgba(10,8,7,0.55)', backdropFilter: 'blur(3px)' }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-lg rounded-t-[26px] p-[22px_20px_34px] flex flex-col gap-[18px] max-h-[88vh] overflow-y-auto animate-[slideUp_0.25s_ease-out] border border-border border-b-0"
        style={{ background: '#1f1814', boxShadow: '0 -20px 60px rgba(0,0,0,0.3)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="tt-display text-[22px]">{isNew ? 'Nuovo esercizio' : 'Modifica esercizio'}</h3>
          <button
            onClick={onCancel}
            aria-label="Chiudi"
            className="text-text-3 hover:text-text-1 w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-2 transition-colors bg-transparent border-none cursor-pointer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Name with suggestions */}
        <div className="relative">
          <span
            className="tt-eyebrow block mb-[7px]"
            style={{ color: 'var(--color-text-3)' }}
          >
            Esercizio
          </span>
          <input
            ref={nameRef}
            value={name}
            onChange={(e) => { setName(e.target.value); setShowSug(true); }}
            onFocus={() => setShowSug(true)}
            onBlur={() => setTimeout(() => setShowSug(false), 150)}
            placeholder="es. Squat, Panca piana…"
            className="w-full bg-surface text-text-1 rounded-input px-[15px] py-[13px] outline-none border border-border focus:border-accent transition-colors font-body text-[15.5px] placeholder:text-text-3"
          />
          {showSug && filteredSug.length > 0 && (
            <div
              className="absolute left-0 right-0 top-full mt-[6px] border border-border rounded-input shadow-card z-10 overflow-hidden max-h-52 overflow-y-auto"
              style={{ background: '#2a211c' }}
            >
              {filteredSug.map((s) => (
                <button
                  key={s}
                  onMouseDown={(e) => { e.preventDefault(); setName(s); setShowSug(false); }}
                  className="w-full text-left px-[15px] py-[11px] text-sm text-text-1 hover:bg-accent-soft hover:text-accent transition-colors border-b border-border last:border-b-0 font-body bg-transparent cursor-pointer"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Mode toggle */}
        <div className="flex bg-surface-inset rounded-input p-1 gap-1">
          <button
            onClick={mode === 'advanced' ? switchToQuick : undefined}
            className={`flex-1 py-[10px] rounded-[4px] font-display font-bold text-[13.5px] transition-all border-none cursor-pointer ${
              mode === 'quick' ? 'bg-accent text-on-accent' : 'text-text-2 bg-transparent'
            }`}
          >
            Serie uguali
          </button>
          <button
            onClick={mode === 'quick' ? switchToAdvanced : undefined}
            className={`flex-1 py-[10px] rounded-[4px] font-display font-bold text-[13.5px] transition-all border-none cursor-pointer ${
              mode === 'advanced' ? 'bg-accent text-on-accent' : 'text-text-2 bg-transparent'
            }`}
          >
            Serie variabili
          </button>
        </div>

        {/* Quick mode */}
        {mode === 'quick' && (
          <div className="grid grid-cols-3 gap-3">
            <Stepper label="Serie" value={qSets} onChange={(v) => setQSets(Math.max(1, v))} />
            <Stepper label="Ripetizioni" value={qReps} onChange={(v) => setQReps(Math.max(1, v))} />
            <Stepper label="Peso (kg)" value={qWeight} step={2.5} onChange={(v) => setQWeight(Math.max(0, v))} />
          </div>
        )}

        {/* Advanced mode */}
        {mode === 'advanced' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span
                className="tt-eyebrow"
                style={{ color: 'var(--color-text-3)' }}
              >
                Configura ogni serie
              </span>
              <button
                onClick={addAdvSet}
                className="text-xs text-accent hover:text-accent-hover font-display font-semibold bg-transparent border-none cursor-pointer"
              >
                + serie
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {sets.map((s, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-surface-inset rounded-input p-2">
                  <span className="text-text-3 font-mono text-xs w-6 text-center font-bold">{idx + 1}</span>
                  <label className="flex items-center gap-1.5 flex-1">
                    <span className="text-text-3 text-xs font-body">reps</span>
                    <input
                      type="number"
                      value={s.reps}
                      onChange={(e) => updateAdvSet(idx, 'reps', Number(e.target.value))}
                      className="bg-surface text-text-1 rounded-input px-2 py-1.5 w-full text-sm outline-none border border-border focus:border-accent font-mono"
                    />
                  </label>
                  <label className="flex items-center gap-1.5 flex-1">
                    <span className="text-text-3 text-xs font-body">kg</span>
                    <input
                      type="number"
                      value={s.weight}
                      onChange={(e) => updateAdvSet(idx, 'weight', Number(e.target.value))}
                      className="bg-surface text-text-1 rounded-input px-2 py-1.5 w-full text-sm outline-none border border-border focus:border-accent font-mono"
                    />
                  </label>
                  {sets.length > 1 && (
                    <button
                      onClick={() => removeAdvSet(idx)}
                      aria-label={`Rimuovi serie ${idx + 1}`}
                      className="text-text-3 hover:text-danger w-7 h-7 rounded-input hover:bg-danger/10 flex items-center justify-center bg-transparent border-none cursor-pointer"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rest */}
        <Stepper
          label="Pausa tra serie (secondi)"
          value={restSeconds}
          step={15}
          onChange={(v) => setRestSeconds(Math.max(0, v))}
          wide
        />

        <div className="flex gap-3 pt-1">
          <button
            onClick={onCancel}
            className="flex-1 bg-surface-2 hover:bg-surface border border-border text-text-2 py-[14px] rounded-btn font-display font-semibold transition-all active:scale-[0.98] cursor-pointer"
          >
            Annulla
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="flex-1 tt-btn-primary py-[14px] text-[15px] disabled:opacity-40"
          >
            Salva
          </button>
        </div>
      </div>
    </div>
  );
}

function Stepper({
  label, value, onChange, step = 1, wide = false,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  wide?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-text-3 text-xs font-body">{label}</span>
      <div className={`flex items-center bg-surface rounded-input border border-border ${wide ? 'justify-between px-3' : 'justify-center'} py-2 gap-1`}>
        <button
          onClick={() => onChange(value - step)}
          aria-label={`Diminuisci ${label}`}
          className="w-8 h-8 rounded-full bg-surface-inset border border-border text-text-1 font-bold flex items-center justify-center transition-colors active:scale-90 shrink-0 hover:border-accent-border cursor-pointer"
        >
          −
        </button>
        <span className="font-mono font-bold text-[19px] tabular-nums flex-1 text-center text-text-1 min-w-10">
          {value % 1 === 0 ? value : value.toFixed(1)}
        </span>
        <button
          onClick={() => onChange(value + step)}
          aria-label={`Aumenta ${label}`}
          className="w-8 h-8 rounded-full bg-surface-inset border border-border text-text-1 font-bold flex items-center justify-center transition-colors active:scale-90 shrink-0 hover:border-accent-border cursor-pointer"
        >
          +
        </button>
      </div>
    </div>
  );
}
