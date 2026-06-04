import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlanStore } from '../store/usePlanStore';
import { uid } from '../utils/id';
import { buildSuggestions } from '../data/exerciseLibrary';
import type { TrainingPlan, TrainingDay, PlannedExercise, SetDefinition } from '../types';

const allSetsEqual = (sets: SetDefinition[]) =>
  sets.length > 0 && sets.every((s) => s.reps === sets[0].reps && s.weight === sets[0].weight);

export default function PlanBuilder() {
  const navigate = useNavigate();
  const {
    plans, activePlanId, addPlan, deletePlan, setActivePlan,
    addDay, deleteDay, duplicateDay, duplicateWeek,
    addExercise, updateExercise, deleteExercise, reorderExercises,
  } = usePlanStore();

  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(activePlanId ?? plans[0]?.id ?? null);
  const [newPlanName, setNewPlanName] = useState('');
  const [expandedDayId, setExpandedDayId] = useState<string | null>(null);
  const [editingExercise, setEditingExercise] = useState<{ dayId: string; ex: PlannedExercise } | null>(null);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) ?? null;

  // All exercise names already used across every plan — feeds the autocomplete.
  const usedNames = useMemo(
    () => plans.flatMap((p) => p.days.flatMap((d) => d.exercises.map((e) => e.name))),
    [plans]
  );
  const suggestions = useMemo(() => buildSuggestions(usedNames), [usedNames]);

  // Group the selected plan's days by week.
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

  return (
    <div className="max-w-lg mx-auto min-h-screen flex flex-col">
      {/* Sticky header */}
      <header className="sticky top-0 z-20 bg-slate-900/90 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="w-9 h-9 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors active:scale-90"
        >
          ←
        </button>
        <h1 className="text-xl font-bold text-white">Le tue schede</h1>
      </header>

      <div className="p-4 pb-28 flex flex-col gap-5">
        {/* Plan selector + new plan */}
        <section className="flex flex-col gap-3">
          {plans.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {plans.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPlanId(p.id)}
                  className={`shrink-0 px-3.5 py-2 rounded-xl text-sm font-medium transition-all active:scale-95 ${
                    selectedPlanId === p.id
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {p.name}
                  {activePlanId === p.id && <span className="ml-1.5 text-emerald-400">●</span>}
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
              className="flex-1 bg-slate-800 text-white rounded-xl px-3.5 py-2.5 text-sm outline-none border border-slate-700 focus:border-indigo-500 transition-colors"
            />
            <button
              onClick={handleCreatePlan}
              disabled={!newPlanName.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white px-4 rounded-xl text-sm font-semibold transition-all active:scale-95"
            >
              + Crea
            </button>
          </div>
        </section>

        {!selectedPlan && plans.length === 0 && (
          <div className="text-center py-16 text-slate-500">
            <div className="text-5xl mb-3">📋</div>
            <p>Crea la tua prima scheda per iniziare.</p>
          </div>
        )}

        {selectedPlan && (
          <section className="flex flex-col gap-4">
            {/* Plan title + actions */}
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-white truncate">{selectedPlan.name}</h2>
              <div className="flex gap-2 shrink-0">
                {activePlanId !== selectedPlan.id && (
                  <button
                    onClick={() => setActivePlan(selectedPlan.id)}
                    className="text-xs text-emerald-400 hover:bg-emerald-950 border border-emerald-800 px-2.5 py-1.5 rounded-lg transition-colors active:scale-95"
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
                  className="text-xs text-red-400 hover:bg-red-950 border border-red-900 px-2.5 py-1.5 rounded-lg transition-colors active:scale-95"
                >
                  Elimina
                </button>
              </div>
            </div>

            {selectedPlan.days.length === 0 && (
              <p className="text-slate-500 text-sm text-center py-4">
                Nessun giorno. Aggiungine uno qui sotto 👇
              </p>
            )}

            {/* Weeks */}
            {weeks.map(({ week, days }) => (
              <div key={week} className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Settimana {week}
                  </h3>
                  <button
                    onClick={() => duplicateWeek(selectedPlan.id, week)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors active:scale-95"
                  >
                    ⧉ Duplica settimana
                  </button>
                </div>

                {days.map((dayObj) => (
                  <DayCard
                    key={dayObj.id}
                    day={dayObj}
                    expanded={expandedDayId === dayObj.id}
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

            <button
              onClick={handleAddDay}
              className="w-full bg-slate-800/60 hover:bg-slate-800 text-slate-300 border border-dashed border-slate-600 rounded-xl py-3.5 text-sm font-medium transition-all active:scale-[0.98]"
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
    </div>
  );
}

function DayCard({
  day, expanded, onToggle, onDelete, onDuplicate, onAddExercise, onEditExercise, onDeleteExercise, onMoveExercise,
}: {
  day: TrainingDay;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onAddExercise: () => void;
  onEditExercise: (ex: PlannedExercise) => void;
  onDeleteExercise: (id: string) => void;
  onMoveExercise: (id: string, dir: -1 | 1) => void;
}) {
  return (
    <div className={`bg-slate-800 rounded-2xl overflow-hidden transition-shadow ${expanded ? 'shadow-lg shadow-black/30' : ''}`}>
      <button onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3.5 text-left active:bg-slate-700/40 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-300 font-bold flex items-center justify-center text-sm">
            G{day.day}
          </div>
          <div>
            <span className="text-white font-semibold">Giorno {day.day}</span>
            {day.label && <span className="text-slate-400 ml-2 text-sm">{day.label}</span>}
            <p className="text-slate-500 text-xs">
              {day.exercises.length === 0 ? 'nessun esercizio' : `${day.exercises.length} esercizi`}
            </p>
          </div>
        </div>
        <span className={`text-slate-400 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {/* Smooth height animation via grid-rows trick */}
      <div className={`grid transition-all duration-300 ease-out ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <div className="px-4 pb-4 flex flex-col gap-2">
            {day.exercises.map((ex, idx) => (
              <div key={ex.id} className="bg-slate-700/40 rounded-xl p-3 flex justify-between items-center gap-2">
                {/* Reorder arrows */}
                <div className="flex flex-col">
                  <button
                    onClick={() => onMoveExercise(ex.id, -1)}
                    disabled={idx === 0}
                    className="text-slate-500 hover:text-white disabled:opacity-20 text-xs leading-none p-0.5 transition-colors"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => onMoveExercise(ex.id, 1)}
                    disabled={idx === day.exercises.length - 1}
                    className="text-slate-500 hover:text-white disabled:opacity-20 text-xs leading-none p-0.5 transition-colors"
                  >
                    ▼
                  </button>
                </div>

                <button onClick={() => onEditExercise(ex)} className="flex-1 text-left min-w-0">
                  <p className="text-white font-medium text-sm truncate">{ex.name || '—'}</p>
                  <p className="text-slate-400 text-xs mt-0.5">
                    {ex.sets.length} × {ex.sets[0]?.reps} reps · {ex.sets[0]?.weight}kg · pausa {ex.restSeconds}s
                    {!allSetsEqual(ex.sets) && <span className="text-amber-400/80 ml-1">· variabile</span>}
                  </p>
                </button>

                <button onClick={() => onDeleteExercise(ex.id)} className="text-red-500/70 hover:text-red-400 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-950/50 transition-colors">
                  ✕
                </button>
              </div>
            ))}

            <button
              onClick={onAddExercise}
              className="text-sm text-indigo-300 hover:text-white hover:bg-indigo-600/20 border border-dashed border-indigo-700/60 rounded-xl py-2.5 transition-all active:scale-[0.98] font-medium"
            >
              + Aggiungi esercizio
            </button>

            <div className="flex justify-between mt-1 pt-1">
              <button onClick={onDuplicate} className="text-xs text-slate-400 hover:text-white transition-colors active:scale-95">
                ⧉ Duplica giorno
              </button>
              <button onClick={onDelete} className="text-xs text-red-500/70 hover:text-red-400 transition-colors active:scale-95">
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

  // Quick mode state
  const [qSets, setQSets] = useState(exercise.sets.length || 3);
  const [qReps, setQReps] = useState(exercise.sets[0]?.reps ?? 10);
  const [qWeight, setQWeight] = useState(exercise.sets[0]?.weight ?? 20);

  // Advanced mode state
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
    <div className="fixed inset-0 bg-black/70 flex items-end justify-center z-50 animate-[fadeIn_0.15s_ease-out]" onClick={onCancel}>
      <div
        className="bg-slate-900 w-full max-w-lg rounded-t-3xl p-6 flex flex-col gap-5 max-h-[92vh] overflow-y-auto animate-[slideUp_0.25s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-white font-bold text-lg">{isNew ? 'Nuovo esercizio' : 'Modifica esercizio'}</h3>
          <button onClick={onCancel} className="text-slate-500 hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-800 transition-colors">✕</button>
        </div>

        {/* Name with suggestions */}
        <div className="relative">
          <label className="text-slate-400 text-xs mb-1.5 block">Esercizio</label>
          <input
            ref={nameRef}
            value={name}
            onChange={(e) => { setName(e.target.value); setShowSug(true); }}
            onFocus={() => setShowSug(true)}
            onBlur={() => setTimeout(() => setShowSug(false), 150)}
            placeholder="es. Squat, Panca piana…"
            className="w-full bg-slate-800 text-white rounded-xl px-3.5 py-2.5 outline-none border border-slate-700 focus:border-indigo-500 transition-colors"
          />
          {showSug && filteredSug.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-10 overflow-hidden max-h-52 overflow-y-auto">
              {filteredSug.map((s) => (
                <button
                  key={s}
                  onMouseDown={(e) => { e.preventDefault(); setName(s); setShowSug(false); }}
                  className="w-full text-left px-3.5 py-2 text-sm text-slate-200 hover:bg-indigo-600 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Mode toggle */}
        <div className="flex bg-slate-800 rounded-xl p-1 text-sm">
          <button
            onClick={mode === 'advanced' ? switchToQuick : undefined}
            className={`flex-1 py-2 rounded-lg font-medium transition-all ${mode === 'quick' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
          >
            Serie uguali
          </button>
          <button
            onClick={mode === 'quick' ? switchToAdvanced : undefined}
            className={`flex-1 py-2 rounded-lg font-medium transition-all ${mode === 'advanced' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
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
              <span className="text-slate-400 text-xs">Configura ogni serie</span>
              <button onClick={addAdvSet} className="text-xs text-indigo-400 hover:text-indigo-300">+ serie</button>
            </div>
            <div className="flex flex-col gap-2">
              {sets.map((s, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-slate-800/60 rounded-lg p-2">
                  <span className="text-slate-500 text-xs w-6 text-center font-bold">{idx + 1}</span>
                  <label className="flex items-center gap-1.5 flex-1">
                    <span className="text-slate-500 text-xs">reps</span>
                    <input type="number" value={s.reps} onChange={(e) => updateAdvSet(idx, 'reps', Number(e.target.value))}
                      className="bg-slate-700 text-white rounded-lg px-2 py-1.5 w-full text-sm outline-none border border-transparent focus:border-indigo-500" />
                  </label>
                  <label className="flex items-center gap-1.5 flex-1">
                    <span className="text-slate-500 text-xs">kg</span>
                    <input type="number" value={s.weight} onChange={(e) => updateAdvSet(idx, 'weight', Number(e.target.value))}
                      className="bg-slate-700 text-white rounded-lg px-2 py-1.5 w-full text-sm outline-none border border-transparent focus:border-indigo-500" />
                  </label>
                  {sets.length > 1 && (
                    <button onClick={() => removeAdvSet(idx)} className="text-red-500/70 hover:text-red-400 w-7 h-7 rounded-lg hover:bg-red-950/50">✕</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rest */}
        <Stepper label="Pausa tra serie (secondi)" value={restSeconds} step={15} onChange={(v) => setRestSeconds(Math.max(0, v))} wide />

        <div className="flex gap-3 pt-1">
          <button onClick={onCancel} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-xl font-medium transition-all active:scale-[0.98]">
            Annulla
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white py-3 rounded-xl font-semibold transition-all active:scale-[0.98]"
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
      <span className="text-slate-400 text-xs">{label}</span>
      <div className={`flex items-center bg-slate-800 rounded-xl ${wide ? 'justify-between px-2' : 'justify-center'} py-1.5 gap-1`}>
        <button
          onClick={() => onChange(value - step)}
          className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold flex items-center justify-center transition-colors active:scale-90 shrink-0"
        >
          −
        </button>
        <span className="text-white font-bold text-lg tabular-nums flex-1 text-center min-w-10">
          {value % 1 === 0 ? value : value.toFixed(1)}
        </span>
        <button
          onClick={() => onChange(value + step)}
          className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold flex items-center justify-center transition-colors active:scale-90 shrink-0"
        >
          +
        </button>
      </div>
    </div>
  );
}
