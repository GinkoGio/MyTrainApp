import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlanStore } from '../store/usePlanStore';
import { uid } from '../utils/id';
import type { TrainingPlan, TrainingDay, PlannedExercise, SetDefinition } from '../types';

export default function PlanBuilder() {
  const navigate = useNavigate();
  const { plans, activePlanId, addPlan, deletePlan, setActivePlan, addDay, deleteDay, addExercise, updateExercise, deleteExercise } = usePlanStore();

  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(activePlanId ?? plans[0]?.id ?? null);
  const [newPlanName, setNewPlanName] = useState('');
  const [expandedDayId, setExpandedDayId] = useState<string | null>(null);
  const [editingExercise, setEditingExercise] = useState<{ dayId: string; ex: PlannedExercise } | null>(null);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) ?? null;

  const sortedDays = selectedPlan
    ? [...selectedPlan.days].sort((a, b) => a.week !== b.week ? a.week - b.week : a.day - b.day)
    : [];

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
    const weeks = selectedPlan.days.map((d) => d.week);
    const maxWeek = weeks.length ? Math.max(...weeks) : 0;
    const daysInLastWeek = selectedPlan.days.filter((d) => d.week === maxWeek).length;
    const week = daysInLastWeek >= 7 ? maxWeek + 1 : maxWeek || 1;
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

  return (
    <div className="max-w-lg mx-auto p-4 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/')} className="text-slate-400 hover:text-white">←</button>
        <h1 className="text-2xl font-bold text-white">Schede</h1>
      </div>

      {/* Plan selector */}
      <div className="flex gap-2 flex-wrap mb-4">
        {plans.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedPlanId(p.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              selectedPlanId === p.id ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {p.name}
            {activePlanId === p.id && <span className="ml-1 text-emerald-400">✓</span>}
          </button>
        ))}
      </div>

      {/* New plan */}
      <div className="flex gap-2 mb-6">
        <input
          value={newPlanName}
          onChange={(e) => setNewPlanName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreatePlan()}
          placeholder="Nome nuova scheda…"
          className="flex-1 bg-slate-800 text-white rounded-lg px-3 py-2 text-sm outline-none border border-slate-700 focus:border-indigo-500"
        />
        <button
          onClick={handleCreatePlan}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Crea
        </button>
      </div>

      {selectedPlan && (
        <>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-white">{selectedPlan.name}</h2>
            <div className="flex gap-2">
              {activePlanId !== selectedPlan.id && (
                <button
                  onClick={() => setActivePlan(selectedPlan.id)}
                  className="text-xs text-emerald-400 hover:text-emerald-300 border border-emerald-700 px-2 py-1 rounded-lg"
                >
                  Usa questa
                </button>
              )}
              <button
                onClick={() => { deletePlan(selectedPlan.id); setSelectedPlanId(plans.find(p => p.id !== selectedPlan.id)?.id ?? null); }}
                className="text-xs text-red-400 hover:text-red-300 border border-red-900 px-2 py-1 rounded-lg"
              >
                Elimina
              </button>
            </div>
          </div>

          {/* Days */}
          <div className="flex flex-col gap-3">
            {sortedDays.map((dayObj) => (
              <DayCard
                key={dayObj.id}
                day={dayObj}
                expanded={expandedDayId === dayObj.id}
                onToggle={() => setExpandedDayId(expandedDayId === dayObj.id ? null : dayObj.id)}
                onDelete={() => deleteDay(selectedPlan.id, dayObj.id)}
                onAddExercise={() => setEditingExercise({
                  dayId: dayObj.id,
                  ex: { id: uid(), name: '', sets: [{ reps: 10, weight: 0 }], restSeconds: 90 },
                })}
                onEditExercise={(ex) => setEditingExercise({ dayId: dayObj.id, ex })}
                onDeleteExercise={(exId) => deleteExercise(selectedPlan.id, dayObj.id, exId)}
              />
            ))}
          </div>

          <button
            onClick={handleAddDay}
            className="mt-4 w-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-dashed border-slate-600 rounded-xl py-3 text-sm transition-colors"
          >
            + Aggiungi giorno
          </button>
        </>
      )}

      {/* Exercise editor modal */}
      {editingExercise && (
        <ExerciseEditor
          dayId={editingExercise.dayId}
          exercise={editingExercise.ex}
          onSave={handleSaveExercise}
          onCancel={() => setEditingExercise(null)}
        />
      )}
    </div>
  );
}

function DayCard({
  day, expanded, onToggle, onDelete, onAddExercise, onEditExercise, onDeleteExercise,
}: {
  day: TrainingDay;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onAddExercise: () => void;
  onEditExercise: (ex: PlannedExercise) => void;
  onDeleteExercise: (id: string) => void;
}) {
  return (
    <div className="bg-slate-800 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div>
          <span className="text-white font-medium">
            Sett. {day.week} — Giorno {day.day}
          </span>
          {day.label && <span className="text-slate-400 ml-2 text-sm">{day.label}</span>}
          <span className="text-slate-500 text-sm ml-2">({day.exercises.length} esercizi)</span>
        </div>
        <span className="text-slate-400">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 flex flex-col gap-2">
          {day.exercises.map((ex) => (
            <div key={ex.id} className="bg-slate-700/50 rounded-lg p-3 flex justify-between items-start">
              <div>
                <p className="text-white font-medium text-sm">{ex.name || '—'}</p>
                <p className="text-slate-400 text-xs mt-0.5">
                  {ex.sets.length} serie · {ex.sets[0]?.reps} reps · {ex.sets[0]?.weight}kg · pausa {ex.restSeconds}s
                </p>
                {ex.sets.some((s, i) => i > 0 && (s.reps !== ex.sets[0].reps || s.weight !== ex.sets[0].weight)) && (
                  <p className="text-slate-500 text-xs mt-0.5">Set variabili</p>
                )}
              </div>
              <div className="flex gap-2 ml-2 shrink-0">
                <button onClick={() => onEditExercise(ex)} className="text-indigo-400 text-xs hover:text-indigo-300">modifica</button>
                <button onClick={() => onDeleteExercise(ex.id)} className="text-red-500 text-xs hover:text-red-400">×</button>
              </div>
            </div>
          ))}

          <button
            onClick={onAddExercise}
            className="text-sm text-indigo-400 hover:text-indigo-300 border border-dashed border-indigo-800 rounded-lg py-2 transition-colors"
          >
            + Aggiungi esercizio
          </button>

          <button
            onClick={onDelete}
            className="text-xs text-red-500 hover:text-red-400 text-right mt-1"
          >
            Elimina giorno
          </button>
        </div>
      )}
    </div>
  );
}

function ExerciseEditor({
  dayId, exercise, onSave, onCancel,
}: {
  dayId: string;
  exercise: PlannedExercise;
  onSave: (dayId: string, ex: PlannedExercise) => void;
  onCancel: () => void;
}) {
  const [ex, setEx] = useState<PlannedExercise>(exercise);

  const updateSet = (idx: number, field: keyof SetDefinition, value: number) => {
    const sets = ex.sets.map((s, i) => i === idx ? { ...s, [field]: value } : s);
    setEx({ ...ex, sets });
  };

  const addSet = () => setEx({ ...ex, sets: [...ex.sets, { ...ex.sets[ex.sets.length - 1] }] });
  const removeSet = (idx: number) => setEx({ ...ex, sets: ex.sets.filter((_, i) => i !== idx) });

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end justify-center z-50" onClick={onCancel}>
      <div
        className="bg-slate-900 w-full max-w-lg rounded-t-2xl p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-white font-bold text-lg">
          {exercise.name ? `Modifica: ${exercise.name}` : 'Nuovo esercizio'}
        </h3>

        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-slate-400 text-xs">Nome esercizio</span>
            <input
              value={ex.name}
              onChange={(e) => setEx({ ...ex, name: e.target.value })}
              placeholder="es. Squat, Panca piana…"
              className="bg-slate-800 text-white rounded-lg px-3 py-2 outline-none border border-slate-700 focus:border-indigo-500"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-slate-400 text-xs">Pausa tra serie (secondi)</span>
            <input
              type="number"
              value={ex.restSeconds}
              onChange={(e) => setEx({ ...ex, restSeconds: Number(e.target.value) })}
              className="bg-slate-800 text-white rounded-lg px-3 py-2 outline-none border border-slate-700 focus:border-indigo-500 w-32"
            />
          </label>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-xs">Serie</span>
              <button onClick={addSet} className="text-xs text-indigo-400 hover:text-indigo-300">+ serie</button>
            </div>
            <div className="flex flex-col gap-2">
              {ex.sets.map((s, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-slate-500 text-xs w-6">{idx + 1}</span>
                  <label className="flex items-center gap-1">
                    <span className="text-slate-400 text-xs">reps</span>
                    <input
                      type="number"
                      value={s.reps}
                      onChange={(e) => updateSet(idx, 'reps', Number(e.target.value))}
                      className="bg-slate-800 text-white rounded-lg px-2 py-1 w-16 text-sm outline-none border border-slate-700 focus:border-indigo-500"
                    />
                  </label>
                  <label className="flex items-center gap-1">
                    <span className="text-slate-400 text-xs">kg</span>
                    <input
                      type="number"
                      value={s.weight}
                      onChange={(e) => updateSet(idx, 'weight', Number(e.target.value))}
                      className="bg-slate-800 text-white rounded-lg px-2 py-1 w-20 text-sm outline-none border border-slate-700 focus:border-indigo-500"
                    />
                  </label>
                  {ex.sets.length > 1 && (
                    <button onClick={() => removeSet(idx)} className="text-red-500 hover:text-red-400 text-sm">×</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-2">
          <button
            onClick={onCancel}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl font-medium transition-colors"
          >
            Annulla
          </button>
          <button
            onClick={() => onSave(dayId, ex)}
            disabled={!ex.name.trim()}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white py-2.5 rounded-xl font-medium transition-colors"
          >
            Salva
          </button>
        </div>
      </div>
    </div>
  );
}
