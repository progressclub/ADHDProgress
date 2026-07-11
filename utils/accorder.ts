export function accorder(masculin: string, feminin: string, neutre: string, genre: string): string {
  if (genre === 'Féminin') return feminin;
  if (genre === 'Neutre') return neutre;
  return masculin;
}
