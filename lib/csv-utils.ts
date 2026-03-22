import Papa from 'papaparse';
import { TemplateField } from './types';

const SAMPLE_VALUES: Record<TemplateField['type'], string> = {
  text: 'Ejemplo texto',
  textarea: 'Ejemplo de párrafo de texto',
  date: '2026-03-17',
  time: '09:00',
  number: '1',
  email: 'ejemplo@correo.com',
};

/**
 * Genera un CSV con los encabezados de los campos de la plantilla y una fila de ejemplo.
 */
export function generateCsvTemplate(fields: TemplateField[]): string {
  const headers = fields.map((f) => f.name);
  const exampleRow = fields.map((f) => SAMPLE_VALUES[f.type] ?? '');
  return Papa.unparse([exampleRow], { columns: headers });
}

/**
 * Descarga una cadena como archivo CSV en el navegador.
 */
export function downloadCsvFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface ParseCsvResult {
  rows: Record<string, string>[];
  errors: string[];
}

/**
 * Parsea un archivo CSV y valida que los campos requeridos estén presentes.
 * Retorna filas válidas + mensajes de error por fila con problemas.
 */
export async function parseCsvFile(file: File, fields: TemplateField[]): Promise<ParseCsvResult> {
  return new Promise((resolve) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete(result) {
        const rows: Record<string, string>[] = [];
        const errors: string[] = [];

        result.data.forEach((row, index) => {
          const rowNum = index + 2; // fila 1 = encabezados
          const missingRequired = fields
            .filter((f) => f.required && !row[f.name]?.trim())
            .map((f) => f.label || f.name);

          if (missingRequired.length > 0) {
            errors.push(`Fila ${rowNum}: campos requeridos faltantes — ${missingRequired.join(', ')}`);
          } else {
            rows.push(row);
          }
        });

        if (result.errors.length > 0) {
          result.errors.forEach((e) => {
            errors.push(`Error de parseo en fila ${(e.row ?? 0) + 2}: ${e.message}`);
          });
        }

        resolve({ rows, errors });
      },
      error(error) {
        resolve({ rows: [], errors: [`Error al leer el archivo: ${error.message}`] });
      },
    });
  });
}
