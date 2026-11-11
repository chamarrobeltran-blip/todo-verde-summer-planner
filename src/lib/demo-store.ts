// Datos locales (localStorage). Kodarvia reemplaza esto por el backend real.
import { calcularTotal, cupoSede, edadAlCorte, grupoPorEdad, lugaresLibres, subtotalQuincenas, type Extra, type ExtraElegido, type Grupo, type Quincena, type Sede } from "./colonia";

export type Autorizado = { nombre: string; parentesco: string; dni: string };
export const PARENTESCOS = ["Madre", "Padre", "Abuela/o", "Tía/o", "Hermana/o mayor", "Otro familiar", "Persona de confianza"];

export type Inscripcion = {
  id: string; creada: string; estado: "activa" | "cancelada"; autorizados: Autorizado[]; nino: string; fecha_nacimiento: string; adulto: string; telefono: string; email: string;
  sede: string; grupo: string; quincenas: number[]; extras: ExtraElegido[]; total: number;
};
export type Catalogo = {
  sedes: Sede[]; grupos: Grupo[]; quincenas: Quincena[]; extras: Extra[];
  cupos: { quincena: number; grupo: string; sede: string; inscriptos: number }[];
  extrasOcup: { extra: string; quincena: number; inscriptos: number }[];
  inscripciones: Inscripcion[];
};

export const STORAGE_KEY = "todo-verde:v1";

export function seed(): Catalogo {
  return {
    sedes: [
      { id: "barda", nombre: "Sede Barda", turno: "mañana", horario_inicio: "9:00", horario_fin: "13:00" },
      { id: "confluencia", nombre: "Sede Confluencia", turno: "tarde", horario_inicio: "13:30", horario_fin: "17:30" },
    ],
    grupos: [
      { id: "chispas", nombre: "Chispas", edad_min: 3, edad_max: 5, cupo_barda: 20, cupo_confluencia: 18 },
      { id: "brotes", nombre: "Brotes", edad_min: 6, edad_max: 8, cupo_barda: 25, cupo_confluencia: 22 },
      { id: "ramas", nombre: "Ramas", edad_min: 9, edad_max: 11, cupo_barda: 25, cupo_confluencia: 22 },
      { id: "copas", nombre: "Copas", edad_min: 12, edad_max: 13, cupo_barda: 20, cupo_confluencia: 18 },
    ],
    quincenas: [
      { numero: 1, fecha_inicio: "2027-01-04", fecha_fin: "2027-01-15", tematica: "Exploradores del río", cuota: 290000 },
      { numero: 2, fecha_inicio: "2027-01-18", fecha_fin: "2027-01-29", tematica: "Guardianes de los álamos", cuota: 290000 },
      { numero: 3, fecha_inicio: "2027-02-01", fecha_fin: "2027-02-12", tematica: "Chacra y cosecha", cuota: 290000 },
      { numero: 4, fecha_inicio: "2027-02-15", fecha_fin: "2027-02-26", tematica: "Noche de estrellas", cuota: 290000 },
    ],
    extras: [
      { id: "natacion", nombre: "Natación en el río", turno: "mañana", precio: 45000, cupo: 15, grupos_excluidos: ["chispas"] },
      { id: "ceramica", nombre: "Taller de cerámica", turno: "mañana", precio: 35000, cupo: 12, grupos_excluidos: [] },
      { id: "kayak", nombre: "Kayak en la confluencia", turno: "tarde", precio: 55000, cupo: 10, grupos_excluidos: ["chispas", "brotes"] },
    ],
    // Ocupación de ejemplo: muestra «Sin lugar» en Chispas Q2 Barda, Brotes Q1 Confluencia, Cerámica Q3 y Kayak Q4.
    cupos: [
      { quincena: 2, grupo: "chispas", sede: "barda", inscriptos: 20 },
      { quincena: 1, grupo: "brotes", sede: "confluencia", inscriptos: 22 },
      { quincena: 1, grupo: "ramas", sede: "barda", inscriptos: 12 },
      { quincena: 3, grupo: "ramas", sede: "confluencia", inscriptos: 19 },
      { quincena: 1, grupo: "brotes", sede: "barda", inscriptos: 1 },
      { quincena: 2, grupo: "brotes", sede: "barda", inscriptos: 1 },
      { quincena: 4, grupo: "brotes", sede: "barda", inscriptos: 1 },
    ],
    extrasOcup: [
      { extra: "ceramica", quincena: 3, inscriptos: 12 },
      { extra: "kayak", quincena: 4, inscriptos: 10 },
      { extra: "natacion", quincena: 1, inscriptos: 1 },
    ],
    inscripciones: [
      {
        id: "demo-1", creada: "2026-11-02T14:20:00.000Z", estado: "activa",
        autorizados: [
          { nombre: "Lucía Quiroga", parentesco: "Madre", dni: "31.456.789" },
          { nombre: "Héctor Quiroga", parentesco: "Abuela/o", dni: "14.223.908" },
        ], nino: "Martina Quiroga", fecha_nacimiento: "2019-08-14",
        adulto: "Lucía Quiroga", telefono: "299 456-7812", email: "lucia.quiroga@gmail.com", sede: "barda", grupo: "brotes",
        quincenas: [1, 2, 4], extras: [{ extra: "natacion", quincena: 1 }], total: 915000,
      },
    ],
  };
}

export function cargar(): Catalogo {
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const c = JSON.parse(raw) as Catalogo;
      // Datos guardados con una versión anterior: completar campos nuevos.
      c.inscripciones = c.inscripciones.map((i) => ({ ...i, estado: i.estado ?? "activa", autorizados: i.autorizados ?? [] }));
      return c;
    }
  } catch { /* datos corruptos: se reinician */ }
  const s = seed();
  guardar(s);
  return s;
}
export function guardar(c: Catalogo) { localStorage.setItem(STORAGE_KEY, JSON.stringify(c)); }
export function reiniciar(): Catalogo { const s = seed(); guardar(s); return s; }

export type Solicitud = { nino: string; nacimiento: string; adulto: string; telefono: string; email: string; sede: string; quincenas: number[]; extras: ExtraElegido[]; autorizados: Autorizado[] };

/** Autorizados completos: nombre y parentesco cargados. */
export function autorizadosValidos(a: Autorizado[]) {
  return a.filter((x) => x.nombre.trim().length > 0 && x.parentesco.trim().length > 0);
}

/** Replica local de confirmar_inscripcion: recalcula grupo, lugares y total. Devuelve un catálogo nuevo. */
export function confirmarLocal(cat: Catalogo, s: Solicitud): { cat: Catalogo; inscripcion: Inscripcion } {
  const grupo = grupoPorEdad(edadAlCorte(s.nacimiento), cat.grupos);
  if (!grupo) throw new Error("No entra en ninguno de nuestros grupos");
  const sede = cat.sedes.find((x) => x.id === s.sede);
  if (!sede) throw new Error("Elegí un turno");
  const autorizados = autorizadosValidos(s.autorizados);
  if (autorizados.length === 0) throw new Error("Cargá al menos una persona autorizada a retirar, con su parentesco");
  const quincenas = [...new Set(s.quincenas)].sort();
  if (!quincenas.length) throw new Error("Elegí al menos una quincena");
  const next: Catalogo = structuredClone(cat);
  for (const q of quincenas) {
    let fila = next.cupos.find((c) => c.quincena === q && c.grupo === grupo.id && c.sede === sede.id);
    if (!fila) { fila = { quincena: q, grupo: grupo.id, sede: sede.id, inscriptos: 0 }; next.cupos.push(fila); }
    if (lugaresLibres(cupoSede(grupo, sede.id), fila.inscriptos) === 0) throw new Error(`La quincena ${q} se quedó sin lugar`);
    fila.inscriptos++;
  }
  let extrasTotal = 0;
  for (const e of s.extras) {
    const ex = next.extras.find((x) => x.id === e.extra);
    if (!ex || ex.turno !== sede.turno || ex.grupos_excluidos.includes(grupo.id) || !quincenas.includes(e.quincena)) throw new Error("Hay un extra que no corresponde");
    let fila = next.extrasOcup.find((o) => o.extra === e.extra && o.quincena === e.quincena);
    if (!fila) { fila = { extra: e.extra, quincena: e.quincena, inscriptos: 0 }; next.extrasOcup.push(fila); }
    if (lugaresLibres(ex.cupo, fila.inscriptos) === 0) throw new Error(`${ex.nombre} se quedó sin lugar en la quincena ${e.quincena}`);
    fila.inscriptos++;
    extrasTotal += ex.precio;
  }
  const inscripcion: Inscripcion = {
    id: `ins-${Date.now()}`, creada: new Date().toISOString(), estado: "activa", autorizados, nino: s.nino, fecha_nacimiento: s.nacimiento, adulto: s.adulto,
    telefono: s.telefono, email: s.email, sede: sede.id, grupo: grupo.id, quincenas, extras: s.extras,
    total: subtotalQuincenas(quincenas.length) + extrasTotal,
  };
  next.inscripciones.push(inscripcion);
  return { cat: next, inscripcion };
}

/** Envío de mail simulado: Kodarvia lo conecta al proveedor real. */
export function enviarConfirmacionSimulada(i: Inscripcion) {
  console.info("[simulado] mail de confirmación a", i.email, { id: i.id, total: i.total });
}

export type ResultadoBaja = { cat: Catalogo; totalAnterior: number; totalNuevo: number; perdioBeneficio: boolean; cancelada: boolean };

/**
 * Da de baja una quincena de una inscripción confirmada: devuelve el lugar a su sede y grupo,
 * libera los extras de esa quincena y recalcula el total. Si era la única, cancela la inscripción.
 */
export function darDeBajaQuincena(cat: Catalogo, inscripcionId: string, numero: number): ResultadoBaja {
  const next: Catalogo = structuredClone(cat);
  const ins = next.inscripciones.find((i) => i.id === inscripcionId);
  if (!ins || ins.estado === "cancelada") throw new Error("No encontramos esa inscripción");
  if (!ins.quincenas.includes(numero)) throw new Error(`La quincena ${numero} no está en la inscripción`);
  const totalAnterior = ins.total;
  const perdioBeneficio = ins.quincenas.length === 4;
  const fila = next.cupos.find((c) => c.quincena === numero && c.grupo === ins.grupo && c.sede === ins.sede);
  if (fila) fila.inscriptos = Math.max(0, fila.inscriptos - 1);
  for (const e of ins.extras.filter((x) => x.quincena === numero)) {
    const o = next.extrasOcup.find((x) => x.extra === e.extra && x.quincena === numero);
    if (o) o.inscriptos = Math.max(0, o.inscriptos - 1);
  }
  ins.quincenas = ins.quincenas.filter((q) => q !== numero);
  ins.extras = ins.extras.filter((x) => x.quincena !== numero);
  ins.total = calcularTotal(ins.quincenas.length, ins.extras, next.extras);
  const cancelada = ins.quincenas.length === 0;
  if (cancelada) ins.estado = "cancelada";
  return { cat: next, totalAnterior, totalNuevo: ins.total, perdioBeneficio, cancelada };
}
