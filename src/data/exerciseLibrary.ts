// Common gym exercises (Italian) grouped by muscle, used for autocomplete suggestions.
export const EXERCISE_LIBRARY: string[] = [
  // Gambe
  'Squat',
  'Squat bulgaro',
  'Affondi',
  'Leg press',
  'Leg extension',
  'Leg curl',
  'Stacco da terra',
  'Stacco rumeno',
  'Hip thrust',
  'Polpacci in piedi',
  'Pressa polpacci',
  'Adduttori',
  'Abduttori',
  // Petto
  'Panca piana',
  'Panca inclinata',
  'Panca declinata',
  'Spinte con manubri',
  'Croci ai cavi',
  'Croci con manubri',
  'Chest press',
  'Dip alle parallele',
  'Pectoral machine',
  // Schiena
  'Trazioni',
  'Lat machine',
  'Rematore con bilanciere',
  'Rematore con manubrio',
  'Pulley basso',
  'Pullover',
  'Rematore T-bar',
  'Hyperextension',
  // Spalle
  'Military press',
  'Lento avanti',
  'Alzate laterali',
  'Alzate frontali',
  'Alzate posteriori',
  'Tirate al mento',
  'Arnold press',
  // Bicipiti
  'Curl con bilanciere',
  'Curl con manubri',
  'Curl a martello',
  'Curl panca Scott',
  'Curl ai cavi',
  // Tricipiti
  'French press',
  'Push down',
  'Estensioni sopra la testa',
  'Dip alle panche',
  'Kickback',
  // Addome
  'Crunch',
  'Plank',
  'Russian twist',
  'Leg raises',
  'Crunch ai cavi',
  'Mountain climber',
];

// Merge library with names already used in the user's plans (most relevant first).
export function buildSuggestions(usedNames: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const name of [...usedNames, ...EXERCISE_LIBRARY]) {
    const key = name.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(name);
  }
  return result;
}
