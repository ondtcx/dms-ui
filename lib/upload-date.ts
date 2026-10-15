export function validOriginDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

export function inferredYearPreview(
  originDate: string | undefined,
  years: { name: string; startDate: string; endDate: string }[] | undefined,
  instant = new Date(),
): string {
  if (!years) return "El servidor determinará el año lectivo al cargar.";
  if (originDate && !validOriginDate(originDate))
    return "Ingresa una fecha de origen válida.";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Guayaquil",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const part = (name: string) =>
    parts.find((item) => item.type === name)!.value;
  const day = originDate || `${part("year")}-${part("month")}-${part("day")}`;
  const matches = years.filter(
    (year) =>
      year.startDate.slice(0, 10) <= day && day <= year.endDate.slice(0, 10),
  );
  const label =
    matches.length === 1
      ? `Año lectivo estimado: ${matches[0].name}.`
      : matches.length === 0
        ? "Sin año lectivo: no hay un período para esta fecha."
        : "Sin año lectivo: varios períodos coinciden con esta fecha.";
  return `${label} El servidor confirmará la asignación.`;
}
