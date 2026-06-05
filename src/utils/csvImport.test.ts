import { describe, it, expect } from 'vitest';
import { parsePlansCsv } from './csvImport';

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

  it('rifiuta input senza righe di dati', () => {
    expect(() => parsePlansCsv('cliente,settimana,giorno,esercizio,serie,reps,peso')).toThrow();
  });
});
