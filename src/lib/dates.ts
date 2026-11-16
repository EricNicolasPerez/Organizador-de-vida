/** Today's date in the device's local time zone, as YYYY-MM-DD. */
export function localToday(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

export function dayLabel(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const wd = new Date(y, m - 1, d).toLocaleDateString("es-AR", { weekday: "short" });
  return `${wd} ${d} de ${MONTHS[m - 1]}`;
}
