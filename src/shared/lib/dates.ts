import { format, parseISO, isToday, isYesterday, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Returns today's date string in YYYY-MM-DD format
 */
export function getTodayDateString(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

/**
 * Returns current competence in YYYY-MM format
 */
export function getCurrentCompetence(): string {
  return format(new Date(), 'yyyy-MM');
}

/**
 * Returns standard pt-BR human friendly date label: "Hoje", "Ontem", or "13/10/2026"
 */
export function formatFriendlyDate(dateStr: string): string {
  const date = parseISO(dateStr);
  if (!isValid(date)) return dateStr;

  if (isToday(date)) return 'Hoje';
  if (isYesterday(date)) return 'Ontem';

  return format(date, "dd 'de' MMMM", { locale: ptBR });
}

/**
 * Formats a competence string 'YYYY-MM' to friendly label (e.g. '2026-10' -> 'Outubro de 2026')
 */
export function formatCompetenceLabel(competence: string): string {
  try {
    const [year, month] = competence.split('-').map(Number);
    if (!year || !month) return competence;
    const date = new Date(year, month - 1, 1);
    const label = format(date, 'MMMM yyyy', { locale: ptBR });
    return label.charAt(0).toUpperCase() + label.slice(1);
  } catch {
    return competence;
  }
}

/**
 * Returns a short competence label (e.g. 'Out 26')
 */
export function formatShortCompetence(competence: string): string {
  try {
    const [year, month] = competence.split('-').map(Number);
    if (!year || !month) return competence;
    const date = new Date(year, month - 1, 1);
    const label = format(date, "MMM yy", { locale: ptBR });
    return label.charAt(0).toUpperCase() + label.slice(1);
  } catch {
    return competence;
  }
}

/**
 * Gets previous competence string (e.g. '2026-10' -> '2026-09')
 */
export function getPreviousCompetence(competence: string): string {
  const [year, month] = competence.split('-').map(Number);
  const date = new Date(year, month - 2, 1);
  return format(date, 'yyyy-MM');
}

/**
 * Gets next competence string (e.g. '2026-10' -> '2026-11')
 */
export function getNextCompetence(competence: string): string {
  const [year, month] = competence.split('-').map(Number);
  const date = new Date(year, month, 1);
  return format(date, 'yyyy-MM');
}

/**
 * Returns last N competences up to and including the current one, in chronological order
 */
export function getLastNCompetences(competence: string, count: number): string[] {
  const result: string[] = [];
  let curr = competence;
  for (let i = 0; i < count; i++) {
    result.unshift(curr);
    curr = getPreviousCompetence(curr);
  }
  return result;
}
