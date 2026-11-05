export const FECHA_CORTE = "2027-01-04";
export const CUOTA = 290000;
export const PRECIO_CUATRO = 1000000;

export type Grupo = { id: string; nombre: string; edad_min: number; edad_max: number; cupo_barda: number; cupo_confluencia: number };
export type Sede = { id: string; nombre: string; turno: string; horario_inicio: string; horario_fin: string };
export type Quincena = { numero: number; fecha_inicio: string; fecha_fin: string; tematica: string; cuota: number };
export type Extra = { id: string; nombre: string; turno: string; precio: number; cupo: number; grupos_excluidos: string[] };
export type ExtraElegido = { extra: string; quincena: number };

/** Edad cumplida al 4/1/2027 (fecha ISO yyyy-mm-dd). */
export function edadAlCorte(nacimiento: string): number {
  const [y = 0, m = 0, d = 0] = nacimiento.split("-").map(Number);
  const [cy = 0, cm = 0, cd = 0] = FECHA_CORTE.split("-").map(Number);
  let edad = cy - y;
  if (cm < m || (cm === m && cd < d)) edad--;
  return edad;
}

export function grupoPorEdad(edad: number, grupos: Grupo[]): Grupo | null {
  return grupos.find((g) => edad >= g.edad_min && edad <= g.edad_max) ?? null;
}

export function cupoSede(grupo: Grupo, sede: string) {
  return sede === "barda" ? grupo.cupo_barda : grupo.cupo_confluencia;
}

export function lugaresLibres(cupo: number, inscriptos: number) {
  return Math.max(0, cupo - inscriptos);
}

export function subtotalQuincenas(cantidad: number) {
  if (cantidad <= 0) return 0;
  return cantidad === 4 ? PRECIO_CUATRO : CUOTA * cantidad;
}

export function calcularTotal(cantidadQuincenas: number, extras: ExtraElegido[], catalogo: Extra[]) {
  const extrasTotal = extras.reduce((s, e) => s + (catalogo.find((c) => c.id === e.extra)?.precio ?? 0), 0);
  return subtotalQuincenas(cantidadQuincenas) + extrasTotal;
}

/** Al dar de baja una quincena se devuelven también sus extras. */
export function quitarQuincena(quincenas: number[], extras: ExtraElegido[], numero: number) {
  return { quincenas: quincenas.filter((q) => q !== numero), extras: extras.filter((e) => e.quincena !== numero) };
}

/** Extras compatibles con el turno elegido. */
export function filtrarExtrasPorTurno(extras: ExtraElegido[], catalogo: Extra[], turno: string) {
  const ok: ExtraElegido[] = [];
  const quitados: ExtraElegido[] = [];
  for (const e of extras) {
    (catalogo.find((c) => c.id === e.extra)?.turno === turno ? ok : quitados).push(e);
  }
  return { ok, quitados };
}

export const pesos = (n: number) => "$" + n.toLocaleString("es-AR");

export function fechaCorta(iso: string) {
  const [, m, d] = iso.split("-");
  return `${Number(d)}/${Number(m)}`;
}

export function generarIcs(opts: { nino: string; sede: Sede; quincenas: Quincena[] }) {
  const pad = (s: string) => s.replace(":", "").padStart(4, "0") + "00";
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Colonia Todo Verde//ES", "CALSCALE:GREGORIAN"];
  for (const q of opts.quincenas) {
    const start = q.fecha_inicio.replaceAll("-", "");
    const end = q.fecha_fin.replaceAll("-", "");
    lines.push(
      "BEGIN:VEVENT",
      `UID:tv-${q.numero}-${start}@coloniatodoverde`,
      `DTSTAMP:20270101T000000Z`,
      `DTSTART;TZID=America/Argentina/Buenos_Aires:${start}T${pad(opts.sede.horario_inicio)}`,
      `DTEND;TZID=America/Argentina/Buenos_Aires:${start}T${pad(opts.sede.horario_fin)}`,
      `RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;UNTIL=${end}T235959Z`,
      `SUMMARY:Colonia Todo Verde — Quincena ${q.numero}: ${q.tematica}`,
      `LOCATION:${opts.sede.nombre}`,
      `DESCRIPTION:${opts.nino} · Turno ${opts.sede.turno}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
