import { describe, it, expect } from 'vitest';
import { parsePlansCsv, planToCsv } from './csvImport';
import type { TrainingPlan } from '../types';

const CSV = `cliente,settimana,giorno,etichetta,esercizio,serie,reps,peso,pausa
Mario,1,1,Push,Panca piana,5,6,60,90
Mario,1,1,Push,Squat,5,5,55,90
Mario,1,2,Pull,Stacco,5,5,80,120
Anna,1,1,Full,Squat,4,8,40,90`;

describe('parsePlansCsv', () => {
  it('raggruppa le righe per cliente in schede separate', () => {
    const plans = parsePlansCsv(CSV);
    expect(plans.map((p) => p.name)).toEqual(['Mario', 'Anna']);
  });

  it('costruisce giorni e serie corretti', () => {
    const [mario] = parsePlansCsv(CSV);
    expect(mario.days).toHaveLength(2);
    const d1 = mario.days[0];
    expect(d1.week).toBe(1);
    expect(d1.day).toBe(1);
    expect(d1.label).toBe('Push');
    expect(d1.exercises).toHaveLength(2);
    expect(d1.exercises[0].name).toBe('Panca piana');
    expect(d1.exercises[0].sets).toHaveLength(5);
    expect(d1.exercises[0].sets[0]).toEqual({ reps: 6, weight: 60 });
    expect(d1.exercises[0].restSeconds).toBe(90);
  });

  it('genera id univoci', () => {
    const [mario] = parsePlansCsv(CSV);
    const ids = mario.days.flatMap((d) => d.exercises.map((e) => e.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('supporta il delimitatore ; e la virgola decimale (Excel IT)', () => {
    const csv = `cliente;settimana;giorno;esercizio;serie;reps;peso;pausa
Luca;1;1;Squat;3;5;72,5;90`;
    const [luca] = parsePlansCsv(csv);
    expect(luca.days[0].exercises[0].sets[0].weight).toBe(72.5);
  });

  it('riconosce intestazioni con sinonimi e accenti', () => {
    const csv = `Cliente,Sett,Day,Esercizio,Sets,Ripetizioni,Kg,Recupero
Gio,2,1,Panca,3,10,40,60`;
    const [gio] = parsePlansCsv(csv);
    expect(gio.days[0].week).toBe(2);
    expect(gio.days[0].exercises[0].sets).toHaveLength(3);
    expect(gio.days[0].exercises[0].sets[0]).toEqual({ reps: 10, weight: 40 });
  });

  it('usa pausa 90s di default se la colonna manca', () => {
    const csv = `cliente,settimana,giorno,esercizio,serie,reps,peso
Gio,1,1,Squat,3,5,50`;
    expect(parsePlansCsv(csv)[0].days[0].exercises[0].restSeconds).toBe(90);
  });

  it('ordina i giorni per settimana e giorno', () => {
    const csv = `cliente,settimana,giorno,esercizio,serie,reps,peso
Gio,2,1,A,3,5,50
Gio,1,2,B,3,5,50
Gio,1,1,C,3,5,50`;
    const [gio] = parsePlansCsv(csv);
    expect(gio.days.map((d) => `${d.week}-${d.day}`)).toEqual(['1-1', '1-2', '2-1']);
  });

  it('errore chiaro se manca una colonna obbligatoria', () => {
    const csv = `cliente,settimana,esercizio,serie,reps,peso
Gio,1,Squat,3,5,50`;
    expect(() => parsePlansCsv(csv)).toThrow(/giorno/i);
  });

  it('errore con numero di riga se un valore non è numerico', () => {
    const csv = `cliente,settimana,giorno,esercizio,serie,reps,peso
Gio,1,1,Squat,tre,5,50`;
    expect(() => parsePlansCsv(csv)).toThrow(/Riga 2/);
  });

  it('accetta un peso testuale come nota (es. "1/2 peso max")', () => {
    const csv = `cliente,settimana,giorno,esercizio,serie,reps,peso
Gio,1,1,Trazioni,4,6,1/2 peso max
Gio,1,1,Squat,5,5,max`;
    const [gio] = parsePlansCsv(csv);
    const [trazioni, squat] = gio.days[0].exercises;
    expect(trazioni.sets[0].weight).toBe(0);
    expect(trazioni.sets[0].weightNote).toBe('1/2 peso max');
    expect(squat.sets[0].weightNote).toBe('max');
  });

  it('accetta reps testuali come nota (es. "max", "8-12")', () => {
    const csv = `cliente,settimana,giorno,esercizio,serie,reps,peso
Gio,1,1,Trazioni,4,max,1/2 peso max
Gio,1,1,Panca,3,8-12,40`;
    const [gio] = parsePlansCsv(csv);
    const [trazioni, panca] = gio.days[0].exercises;
    expect(trazioni.sets[0].reps).toBe(0);
    expect(trazioni.sets[0].repsNote).toBe('max');
    expect(panca.sets[0].repsNote).toBe('8-12');
    expect(panca.sets[0].reps).toBe(0);
  });

  it('espande le serie variabili (serie/reps/peso a gruppi separati da -)', () => {
    const csv = `cliente,settimana,giorno,esercizio,serie,reps,peso
Gio,1,1,Panca,2-1-1,8-7-7,12-11-9`;
    const [gio] = parsePlansCsv(csv);
    const sets = gio.days[0].exercises[0].sets;
    expect(sets).toHaveLength(4);
    expect(sets.map((s) => s.reps)).toEqual([8, 8, 7, 7]);
    expect(sets.map((s) => s.weight)).toEqual([12, 12, 11, 9]);
  });

  it('le serie variabili supportano note testuali per gruppo', () => {
    const csv = `cliente,settimana,giorno,esercizio,serie,reps,peso
Gio,1,1,Trazioni,2-1,max-8,1/2 peso max-50`;
    const [gio] = parsePlansCsv(csv);
    const sets = gio.days[0].exercises[0].sets;
    expect(sets).toHaveLength(3);
    expect(sets[0].repsNote).toBe('max');
    expect(sets[0].weightNote).toBe('1/2 peso max');
    expect(sets[2]).toMatchObject({ reps: 8, weight: 50 });
  });

  it('serie singola con lista reps di pari lunghezza → reps per serie', () => {
    const csv = `cliente,settimana,giorno,esercizio,serie,reps,peso
Gio,1,1,Panca,4,8-7-7-7,50`;
    const sets = parsePlansCsv(csv)[0].days[0].exercises[0].sets;
    expect(sets).toHaveLength(4);
    expect(sets.map((s) => s.reps)).toEqual([8, 7, 7, 7]);
    expect(sets.map((s) => s.weight)).toEqual([50, 50, 50, 50]);
  });

  it('serie singola con liste reps e peso per serie', () => {
    const csv = `cliente,settimana,giorno,esercizio,serie,reps,peso
Gio,1,1,Squat,3,5-5-3,60-65-70`;
    const sets = parsePlansCsv(csv)[0].days[0].exercises[0].sets;
    expect(sets.map((s) => s.reps)).toEqual([5, 5, 3]);
    expect(sets.map((s) => s.weight)).toEqual([60, 65, 70]);
  });

  it('serie singola con lista di lunghezza diversa resta una nota (range "8-12")', () => {
    const csv = `cliente,settimana,giorno,esercizio,serie,reps,peso
Gio,1,1,Panca,4,8-12,40`;
    const sets = parsePlansCsv(csv)[0].days[0].exercises[0].sets;
    expect(sets).toHaveLength(4);
    expect(sets.every((s) => s.repsNote === '8-12' && s.reps === 0)).toBe(true);
  });

  it('errore se i gruppi di serie/reps/peso non combaciano', () => {
    const csv = `cliente,settimana,giorno,esercizio,serie,reps,peso
Gio,1,1,Panca,2-1-1,8-7,12-11-9`;
    expect(() => parsePlansCsv(csv)).toThrow(/gruppi/i);
  });

  it('rifiuta input senza righe di dati', () => {
    expect(() => parsePlansCsv('cliente,settimana,giorno,esercizio,serie,reps,peso')).toThrow();
  });
});

describe('planToCsv — export e round-trip', () => {
  const plan: TrainingPlan = {
    id: 'p1',
    name: 'Mario Rossi',
    createdAt: '2026-01-01T00:00:00.000Z',
    days: [
      {
        id: 'd1', week: 1, day: 1, label: 'Push',
        exercises: [
          { id: 'e1', name: 'Panca piana', restSeconds: 90, sets: [{ reps: 6, weight: 60 }, { reps: 6, weight: 60 }] },
          // serie variabili + nota
          { id: 'e2', name: 'Trazioni', restSeconds: 75, sets: [
            { reps: 8, weight: 0, weightNote: '1/2 peso max' },
            { reps: 7, weight: 0, weightNote: '1/2 peso max' },
            { reps: 0, weight: 50, repsNote: 'max' },
          ] },
        ],
      },
    ],
  };

  it('comprime le serie uguali e tiene il nome scheda', () => {
    const csv = planToCsv(plan);
    expect(csv.split('\n')[0]).toBe('cliente,settimana,giorno,etichetta,esercizio,serie,reps,peso,pausa');
    // Panca: 2 serie uguali -> "2,6,60"
    expect(csv).toContain('Mario Rossi,1,1,Push,Panca piana,2,6,60,90');
  });

  it('round-trip planToCsv -> parsePlansCsv conserva le serie', () => {
    const [back] = parsePlansCsv(planToCsv(plan));
    expect(back.name).toBe('Mario Rossi');
    const [panca, trazioni] = back.days[0].exercises;
    expect(panca.sets).toHaveLength(2);
    expect(panca.sets.every((s) => s.reps === 6 && s.weight === 60)).toBe(true);
    expect(trazioni.sets).toHaveLength(3);
    expect(trazioni.sets[0]).toMatchObject({ reps: 8, weightNote: '1/2 peso max' });
    expect(trazioni.sets[2]).toMatchObject({ repsNote: 'max', weight: 50 });
  });

  it('quota i campi che contengono virgole', () => {
    const p: TrainingPlan = {
      id: 'x', name: 'Tizio, Caio', createdAt: '', days: [
        { id: 'd', week: 1, day: 1, exercises: [{ id: 'e', name: 'Squat', restSeconds: 60, sets: [{ reps: 5, weight: 50 }] }] },
      ],
    };
    expect(planToCsv(p)).toContain('"Tizio, Caio"');
  });
});
