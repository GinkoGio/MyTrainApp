// Serializzazione e import/export di una scheda come file JSON.
// L'import valida la struttura e rigenera tutti gli id, così una scheda
// importata non entra mai in conflitto con quelle esistenti.
import LZString from 'lz-string';
import { uid } from './id';
import type { TrainingPlan, TrainingDay, PlannedExercise, SetDefinition } from '../types';

const FORMAT = 'mytrainapp-plan';
const VERSION = 1;

interface PlanFile {
  format: typeof FORMAT;
  version: number;
  plan: TrainingPlan;
}

/** Produce il contenuto JSON (con wrapper format/version) da scaricare. */
export function serializePlan(plan: TrainingPlan): string {
  const file: PlanFile = { format: FORMAT, version: VERSION, plan };
  return JSON.stringify(file, null, 2);
}

/** Nome file suggerito per il download, derivato dal nome della scheda. */
export function planFileName(plan: TrainingPlan): string {
  const slug = plan.name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${slug || 'scheda'}.json`;
}

/** Riassunto breve per il prompt di conferma import. */
export function planSummary(plan: TrainingPlan): string {
  const weeks = new Set(plan.days.map((d) => d.week)).size;
  const days = plan.days.length;
  const exercises = plan.days.reduce((a, d) => a + d.exercises.length, 0);
  return `${weeks} sett · ${days} giorni · ${exercises} esercizi`;
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
type Obj = Record<string, unknown>;

/**
 * Analizza il testo di un file e ne ricava una TrainingPlan valida con id nuovi.
 * Accetta sia il formato con wrapper ({ format, plan }) sia un piano "nudo".
 * Lancia un Error con messaggio leggibile se la struttura non è valida.
 */
export function parsePlan(text: string): TrainingPlan {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Il file non è un JSON valido.');
  }

  if (!data || typeof data !== 'object') throw new Error('Struttura non riconosciuta.');
  const root = data as Obj;
  const raw = (root.format === FORMAT && root.plan ? root.plan : root) as Obj;

  if (!raw || typeof raw !== 'object') throw new Error('Struttura della scheda non riconosciuta.');
  if (!isStr(raw.name) || !raw.name.trim()) throw new Error('Manca il nome della scheda.');
  if (!Array.isArray(raw.days)) throw new Error("Manca l'elenco dei giorni.");

  const days: TrainingDay[] = raw.days.map((dRaw, di) => {
    const d = dRaw as Obj;
    if (!isNum(d.week) || !isNum(d.day)) {
      throw new Error(`Giorno ${di + 1}: settimana o giorno non validi.`);
    }
    if (!Array.isArray(d.exercises)) {
      throw new Error(`Giorno ${di + 1}: elenco esercizi mancante.`);
    }

    const exercises: PlannedExercise[] = d.exercises.map((eRaw, ei) => {
      const e = eRaw as Obj;
      const where = `Giorno ${di + 1}, esercizio ${ei + 1}`;
      if (!isStr(e.name)) throw new Error(`${where}: nome mancante.`);
      if (!isNum(e.restSeconds)) throw new Error(`${where}: pausa non valida.`);
      if (!Array.isArray(e.sets) || e.sets.length === 0) throw new Error(`${where}: serie mancanti.`);

      const sets: SetDefinition[] = e.sets.map((sRaw, si) => {
        const s = sRaw as Obj;
        if (!isNum(s.reps) || !isNum(s.weight)) {
          throw new Error(`${where}, serie ${si + 1}: ripetizioni o peso non validi.`);
        }
        const set: SetDefinition = { reps: s.reps, weight: s.weight };
        if (isStr(s.weightNote) && s.weightNote.trim()) set.weightNote = s.weightNote.trim();
        return set;
      });

      return { id: uid(), name: e.name.trim(), restSeconds: e.restSeconds, sets };
    });

    return {
      id: uid(),
      week: d.week,
      day: d.day,
      label: isStr(d.label) && d.label.trim() ? d.label.trim() : undefined,
      exercises,
    };
  });

  return { id: uid(), name: raw.name.trim(), days, createdAt: new Date().toISOString() };
}

// ── Condivisione compatta (QR / link) ─────────────────────────────
// Versione "magra" della scheda senza id/createdAt (rigenerati all'import):
// riduce i byte da far entrare in un QR.
function compactPlan(plan: TrainingPlan) {
  return {
    name: plan.name,
    days: plan.days.map((d) => ({
      week: d.week,
      day: d.day,
      ...(d.label ? { label: d.label } : {}),
      exercises: d.exercises.map((e) => ({
        name: e.name,
        restSeconds: e.restSeconds,
        sets: e.sets.map((s) => ({
          reps: s.reps,
          weight: s.weight,
          ...(s.weightNote ? { weightNote: s.weightNote } : {}),
        })),
      })),
    })),
  };
}

/** Codifica una scheda in una stringa compressa e URL-safe (per QR/link). */
export function encodePlanParam(plan: TrainingPlan): string {
  return LZString.compressToEncodedURIComponent(JSON.stringify(compactPlan(plan)));
}

/** Decodifica una stringa prodotta da encodePlanParam in una scheda validata. */
export function decodePlanParam(param: string): TrainingPlan {
  const json = LZString.decompressFromEncodedURIComponent(param);
  if (!json) throw new Error('Codice non valido o danneggiato.');
  return parsePlan(json);
}

/** Link condivisibile auto-contenuto (i dati viaggiano nell'hash dell'URL). */
export function buildShareLink(plan: TrainingPlan): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}#import=${encodePlanParam(plan)}`;
}
