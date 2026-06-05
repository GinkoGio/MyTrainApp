// Parser CSV per creare in blocco le schede dei clienti da un foglio di calcolo.
// Una riga = un esercizio (con N serie uguali). La colonna "cliente" raggruppa
// le righe in schede separate. Gestisce delimitatore ; o , (Excel italiano usa
// ; e la virgola come separatore decimale) e intestazioni con sinonimi/accenti.
import { uid } from './id';
import type { TrainingPlan, TrainingDay, PlannedExercise } from '../types';

type Canon = 'cliente' | 'settimana' | 'giorno' | 'etichetta' | 'esercizio' | 'serie' | 'reps' | 'peso' | 'pausa';

const HEADER_SYNONYMS: Record<string, Canon> = {
  cliente: 'cliente', client: 'cliente', nome: 'cliente', 'nome cliente': 'cliente',
  settimana: 'settimana', sett: 'settimana', week: 'settimana', w: 'settimana',
  giorno: 'giorno', day: 'giorno', g: 'giorno',
  etichetta: 'etichetta', label: 'etichetta', 'nome giorno': 'etichetta', tipo: 'etichetta',
  esercizio: 'esercizio', exercise: 'esercizio', 'nome esercizio': 'esercizio',
  serie: 'serie', sets: 'serie', set: 'serie',
  reps: 'reps', ripetizioni: 'reps', rip: 'reps', ripetizione: 'reps',
  peso: 'peso', kg: 'peso', weight: 'peso', carico: 'peso',
  pausa: 'pausa', rest: 'pausa', recupero: 'pausa', riposo: 'pausa',
};

const REQUIRED: Canon[] = ['cliente', 'settimana', 'giorno', 'esercizio', 'serie', 'reps', 'peso'];

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // rimuove gli accenti
    .replace(/\s+/g, ' ');
}

function detectDelimiter(headerLine: string): string {
  const candidates = [';', '\t', ','];
  let best = ',';
  let bestCount = -1;
  for (const c of candidates) {
    const count = headerLine.split(c).length - 1;
    if (count > bestCount) { best = c; bestCount = count; }
  }
  return best;
}

// Divide una riga CSV rispettando le virgolette doppie ("" = virgoletta letterale).
function splitLine(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = false;
      } else cur += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delim) {
      out.push(cur); cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function toNum(raw: string, delim: string, field: string, rowNum: number): number {
  let s = raw.trim();
  if (delim !== ',') s = s.replace(',', '.'); // virgola decimale (Excel IT)
  const n = Number(s);
  if (s === '' || !Number.isFinite(n)) {
    throw new Error(`Riga ${rowNum}: "${field}" non è un numero valido (trovato "${raw}").`);
  }
  return n;
}

function toInt(raw: string, delim: string, field: string, rowNum: number): number {
  const n = toNum(raw, delim, field, rowNum);
  if (!Number.isInteger(n)) throw new Error(`Riga ${rowNum}: "${field}" deve essere un intero (trovato "${raw}").`);
  return n;
}

// Il peso può essere un numero (kg) oppure un'indicazione testuale libera
// (es. "max", "1/2 peso max"): in quel caso il carico resta 0 e il testo
// diventa una nota mostrata al posto dei kg.
function parseWeightCell(raw: string, delim: string, rowNum: number): { weight: number; weightNote?: string } {
  const s = raw.trim();
  if (s === '') throw new Error(`Riga ${rowNum}: "peso" mancante.`);
  const n = Number(delim !== ',' ? s.replace(',', '.') : s);
  if (Number.isFinite(n)) return { weight: n };
  return { weight: 0, weightNote: s };
}

/**
 * Converte il testo CSV in una lista di schede (una per "cliente"), con id nuovi.
 * Lancia Error con messaggio leggibile (incluso il numero di riga) se non valido.
 */
export function parsePlansCsv(text: string): TrainingPlan[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length < 2) throw new Error("Servono un'intestazione e almeno una riga di dati.");

  const delim = detectDelimiter(lines[0]);
  const rawHeaders = splitLine(lines[0], delim).map(normalizeHeader);
  const colIndex = {} as Record<Canon, number>;
  rawHeaders.forEach((h, i) => {
    const canon = HEADER_SYNONYMS[h];
    if (canon && !(canon in colIndex)) colIndex[canon] = i;
  });

  const missing = REQUIRED.filter((c) => !(c in colIndex));
  if (missing.length) throw new Error(`Colonne mancanti: ${missing.join(', ')}.`);

  // Mantiene l'ordine di prima comparsa di clienti / giorni.
  const plans = new Map<string, TrainingPlan>();
  const dayMaps = new Map<string, Map<string, TrainingDay>>();
  const dayKey = (w: number, d: number) => `${w}-${d}`;

  for (let i = 1; i < lines.length; i++) {
    const rowNum = i + 1; // 1-based, intestazione = riga 1
    const cells = splitLine(lines[i], delim);
    const get = (c: Canon) => (colIndex[c] !== undefined ? cells[colIndex[c]] ?? '' : '');

    const cliente = get('cliente').trim();
    const esercizio = get('esercizio').trim();
    if (!cliente && !esercizio) continue; // riga vuota di fatto
    if (!cliente) throw new Error(`Riga ${rowNum}: manca il cliente.`);
    if (!esercizio) throw new Error(`Riga ${rowNum}: manca l'esercizio.`);

    const week = toInt(get('settimana'), delim, 'settimana', rowNum);
    const day = toInt(get('giorno'), delim, 'giorno', rowNum);
    const serie = toInt(get('serie'), delim, 'serie', rowNum);
    const reps = toInt(get('reps'), delim, 'reps', rowNum);
    const { weight: peso, weightNote } = parseWeightCell(get('peso'), delim, rowNum);
    const pausaRaw = get('pausa').trim();
    const pausa = pausaRaw === '' ? 90 : toInt(pausaRaw, delim, 'pausa', rowNum);
    const etichetta = get('etichetta').trim();

    if (serie < 1 || reps < 1) throw new Error(`Riga ${rowNum}: serie e reps devono essere ≥ 1.`);

    let plan = plans.get(cliente);
    if (!plan) {
      plan = { id: uid(), name: cliente, days: [], createdAt: new Date().toISOString() };
      plans.set(cliente, plan);
      dayMaps.set(cliente, new Map());
    }
    const daysOfClient = dayMaps.get(cliente)!;
    const key = dayKey(week, day);
    let dayObj = daysOfClient.get(key);
    if (!dayObj) {
      dayObj = { id: uid(), week, day, exercises: [] };
      if (etichetta) dayObj.label = etichetta;
      daysOfClient.set(key, dayObj);
      plan.days.push(dayObj);
    } else if (etichetta && !dayObj.label) {
      dayObj.label = etichetta;
    }

    dayObj.exercises.push({
      id: uid(),
      name: esercizio,
      restSeconds: pausa,
      sets: Array.from({ length: serie }, () => ({
        reps,
        weight: peso,
        ...(weightNote ? { weightNote } : {}),
      })),
    } satisfies PlannedExercise);
  }

  const result = [...plans.values()];
  for (const plan of result) {
    plan.days.sort((a, b) => (a.week !== b.week ? a.week - b.week : a.day - b.day));
  }
  if (result.length === 0) throw new Error('Nessuna riga di dati valida trovata.');
  return result;
}

/** Contenuto del template CSV scaricabile. */
export const CSV_TEMPLATE = [
  'cliente,settimana,giorno,etichetta,esercizio,serie,reps,peso,pausa',
  'Mario Rossi,1,1,Push,Panca piana,5,6,60,90',
  'Mario Rossi,1,1,Push,Spinte manubri,4,8,22,75',
  'Mario Rossi,1,2,Pull,Stacco,5,5,80,120',
  'Mario Rossi,1,2,Pull,Trazioni,4,6,1/2 peso max,90',
  'Anna Bianchi,1,1,Full body,Squat,4,8,40,90',
  'Anna Bianchi,1,1,Full body,Lat machine,4,10,35,60',
].join('\n');
