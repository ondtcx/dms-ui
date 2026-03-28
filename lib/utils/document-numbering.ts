/**
 * Deriva un prefijo corto a partir de un nombre, espejo de la lógica del backend.
 *
 * Reglas:
 *  - Una sola palabra  → primeras 3 letras en mayúsculas ("Planificaciones" → "PLN")
 *  - Varias palabras   → inicial de cada palabra, máx. 6 chars ("Gestión Académica" → "GA")
 *  - Nombre vacío      → cadena vacía
 *
 * Ejemplos:
 *   "Gestión Académica"        → "GA"
 *   "Gestión Administrativa"   → "GA"  (colisión resuelta manualmente por el admin)
 *   "Actas y Reuniones"        → "AYR"
 *   "Planificaciones"          → "PLN"
 *   "Financieros"              → "FIN"
 */
export function derivePrefix(name: string): string {
  if (!name.trim()) return '';

  // Quitar acentos y caracteres especiales, dejar solo letras y espacios
  const normalized = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z\s]/g, '')
    .trim();

  const words = normalized.split(/\s+/).filter(Boolean);
  if (!words.length) return '';

  if (words.length === 1) {
    return words[0].substring(0, 3).toUpperCase();
  }

  return words
    .map((w) => w[0])
    .join('')
    .substring(0, 6)
    .toUpperCase();
}

/**
 * Formatea un número de documento para mostrarlo en la UI.
 * Si es null/undefined muestra un placeholder.
 */
export function formatDocumentNumber(documentNumber: string | null | undefined): string {
  return documentNumber ?? '—';
}
