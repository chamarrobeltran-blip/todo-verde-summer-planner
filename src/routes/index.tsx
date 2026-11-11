import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, CalendarDays, Check, Clock, Download, MapPin, Plus, Sun, Sunset, TreePine, Trash2, UserCheck } from "lucide-react";
import { PARENTESCOS, autorizadosValidos, cargar, confirmarLocal, enviarConfirmacionSimulada, guardar, reiniciar, type Autorizado, type Catalogo } from "@/lib/demo-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  CUOTA, PRECIO_CUATRO, calcularTotal, cupoSede, edadAlCorte, fechaCorta, filtrarExtrasPorTurno, generarIcs,
  grupoPorEdad, lugaresLibres, pesos, quitarQuincena, subtotalQuincenas,
  type Extra, type ExtraElegido, type Grupo, type Quincena, type Sede,
} from "@/lib/colonia";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Colonia Todo Verde — Inscripción verano 2027" },
      { name: "description", content: "Elegí turno, quincenas y extras, y calculá el precio de la temporada 2027 en la Colonia Todo Verde." },
      { property: "og:title", content: "Colonia Todo Verde — Inscripción verano 2027" },
      { property: "og:description", content: "Elegí turno, quincenas y extras, y calculá el precio de la temporada 2027." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Datos = { nino: string; nacimiento: string; adulto: string; telefono: string; email: string };
const PASOS = ["Datos", "Turno", "Quincenas", "Resumen"];

function Index() {
  const [cat, setCat] = useState<Catalogo | null>(null);
  useEffect(() => { setCat(cargar()); }, []);
  const isLoading = !cat;
  const [paso, setPaso] = useState(0);
  const [datos, setDatos] = useState<Datos>({ nino: "", nacimiento: "", adulto: "", telefono: "", email: "" });
  const [autorizados, setAutorizados] = useState<Autorizado[]>([{ nombre: "", parentesco: "", dni: "" }]);
  const [grupoId, setGrupoId] = useState<string | null>(null);
  const [sedeId, setSedeId] = useState<string | null>(null);
  const [quincenas, setQuincenas] = useState<number[]>([]);
  const [extras, setExtras] = useState<ExtraElegido[]>([]);
  const [bajoDeCuatro, setBajoDeCuatro] = useState(false);
  const [confirmarBaja, setConfirmarBaja] = useState<number | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [confirmada, setConfirmada] = useState<{ total: number } | null>(null);

  useEffect(() => { window.scrollTo({ top: 0 }); }, [paso, confirmada]);

  const grupo = cat?.grupos.find((g) => g.id === grupoId) ?? null;
  const sede = cat?.sedes.find((s) => s.id === sedeId) ?? null;

  const libres = (q: number) => {
    if (!cat || !grupo || !sedeId) return 0;
    const ins = cat.cupos.find((c) => c.quincena === q && c.grupo === grupo.id && c.sede === sedeId)?.inscriptos ?? 0;
    return lugaresLibres(cupoSede(grupo, sedeId), ins);
  };
  const extraLibres = (extra: Extra, q: number) =>
    lugaresLibres(extra.cupo, cat?.extrasOcup.find((o) => o.extra === extra.id && o.quincena === q)?.inscriptos ?? 0);

  const total = cat ? calcularTotal(quincenas.length, extras, cat.extras) : 0;

  function elegirSede(id: string) {
    if (!cat || id === sedeId) return;
    const nueva = cat.sedes.find((s) => s.id === id)!;
    const { ok, quitados } = filtrarExtrasPorTurno(extras, cat.extras, nueva.turno);
    if (quitados.length) {
      const nombres = [...new Set(quitados.map((q) => cat.extras.find((e) => e.id === q.extra)?.nombre))].join(", ");
      toast.warning(`Sacamos ${nombres}: no se ofrece en el turno ${nueva.turno}.`);
    }
    setExtras(ok);
    // Las quincenas sin lugar en la nueva sede se dan de baja
    if (grupo) {
      const sinLugar = quincenas.filter((q) => {
        const ins = cat.cupos.find((c) => c.quincena === q && c.grupo === grupo.id && c.sede === id)?.inscriptos ?? 0;
        return lugaresLibres(cupoSede(grupo, id), ins) === 0;
      });
      if (sinLugar.length) {
        toast.warning(`En ${nueva.nombre} no hay lugar en la quincena ${sinLugar.join(", ")}. La sacamos.`);
        setQuincenas(quincenas.filter((q) => !sinLugar.includes(q)));
      }
    }
    setSedeId(id);
  }

  function quitar(q: number) {
    const r = quitarQuincena(quincenas, extras, q);
    if (quincenas.length === 4) setBajoDeCuatro(true);
    setQuincenas(r.quincenas);
    setExtras(r.extras);
  }

  function toggleQuincena(q: number) {
    if (quincenas.includes(q)) {
      if (quincenas.length === 4) setConfirmarBaja(q);
      else quitar(q);
    } else {
      const nuevas = [...quincenas, q].sort();
      if (nuevas.length === 4) setBajoDeCuatro(false);
      setQuincenas(nuevas);
    }
  }

  function toggleExtra(extra: string, q: number) {
    setExtras((prev) =>
      prev.some((e) => e.extra === extra && e.quincena === q)
        ? prev.filter((e) => !(e.extra === extra && e.quincena === q))
        : [...prev, { extra, quincena: q }],
    );
  }

  async function confirmar() {
    if (!sede) return;
    setEnviando(true);
    try {
      const r = confirmarLocal(cat!, { nino: datos.nino, nacimiento: datos.nacimiento, adulto: datos.adulto, telefono: datos.telefono, email: datos.email, sede: sede.id, quincenas, extras, autorizados });
      guardar(r.cat);
      setCat(r.cat);
      enviarConfirmacionSimulada(r.inscripcion);
      setConfirmada({ total: r.inscripcion.total });
      toast.success(`Le mandamos la confirmación a ${datos.email} (simulado).`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  function nuevaInscripcion() {
    setPaso(0); setDatos({ nino: "", nacimiento: "", adulto: "", telefono: "", email: "" });
    setAutorizados([{ nombre: "", parentesco: "", dni: "" }]);
    setGrupoId(null); setSedeId(null); setQuincenas([]); setExtras([]); setBajoDeCuatro(false); setConfirmada(null);
  }

  function reiniciarDemo() {
    setCat(reiniciar());
    nuevaInscripcion();
    toast.success("Datos de ejemplo reiniciados.");
  }

  function descargarIcs() {
    if (!cat || !sede) return;
    const ics = generarIcs({ nino: datos.nino, sede, quincenas: cat.quincenas.filter((q) => quincenas.includes(q.numero)) });
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "colonia-todo-verde-2027.ics";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <Header sede={paso > 0 ? sede : null} />
      <main className="mx-auto w-full max-w-3xl px-4 pb-32 pt-4 sm:px-6">
        {isLoading && <p className="py-20 text-center text-muted-foreground">Cargando la temporada…</p>}
        {cat && !iniciado(paso) && <Inicio onStart={() => setPaso(0.5)} inscriptas={cat.inscripciones.filter((i) => i.estado === "activa").length} onReset={reiniciarDemo} />}
        {cat && iniciado(paso) && !confirmada && (
          <>
            <Stepper paso={Math.floor(paso)} />
            {paso === 0.5 && (
              <PasoDatos
                datos={datos} setDatos={setDatos} grupos={cat.grupos}
                autorizados={autorizados} setAutorizados={setAutorizados}
                onNext={(g) => { setGrupoId(g.id); setPaso(1); }}
                grupoFijo={grupo}
              />
            )}
            {paso === 1 && (
              <PasoTurno sedes={cat.sedes} sedeId={sedeId} onPick={elegirSede}
                onBack={() => setPaso(0.5)} onNext={() => setPaso(2)} />
            )}
            {paso === 2 && grupo && sede && (
              <section className="space-y-4">
                <Titulo t="Quincenas y extras" s={`${datos.nino.split(" ")[0]} va al grupo ${grupo.nombre}. Marcá las quincenas que quieras.`} />
                <div className="rounded-2xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm font-semibold">
                  🌳 Con las cuatro quincenas ahorrás {pesos(CUOTA * 4 - PRECIO_CUATRO)}
                </div>
                {cat.quincenas.map((q) => {
                  const lib = libres(q.numero);
                  const sel = quincenas.includes(q.numero);
                  const disponibles = cat.extras.filter((e) => e.turno === sede.turno);
                  return (
                    <article key={q.numero} className={cn("rounded-2xl border bg-card p-4 transition sm:p-5", sel ? "border-primary shadow-md ring-1 ring-primary" : "border-border")}>
                      <label className={cn("flex items-start gap-3", lib === 0 && !sel ? "cursor-not-allowed opacity-60" : "cursor-pointer")}>
                        <Checkbox checked={sel} disabled={lib === 0 && !sel} onCheckedChange={() => toggleQuincena(q.numero)} className="mt-1 size-5" aria-label={`Quincena ${q.numero}`} />
                        <div className="flex-1">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <h3 className="font-display text-lg font-semibold">Quincena {q.numero} · {q.tematica}</h3>
                            <span className="font-bold">{pesos(q.cuota)}</span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            <span className="inline-flex items-center gap-1"><CalendarDays className="size-4" />{fechaCorta(q.fecha_inicio)} al {fechaCorta(q.fecha_fin)}/2027</span>
                            {lib === 0 ? (
                              <span className="rounded-full bg-muted px-2 py-0.5 font-bold text-muted-foreground">Sin lugar</span>
                            ) : (
                              <span className="font-semibold text-primary">{lib} lugares libres</span>
                            )}
                          </div>
                        </div>
                      </label>
                      {sel && disponibles.length > 0 && (
                        <div className="mt-4 space-y-2 border-t border-dashed pt-3">
                          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Extras de esta quincena</p>
                          {disponibles.map((e) => {
                            const excluido = e.grupos_excluidos.includes(grupo.id);
                            const el = extraLibres(e, q.numero);
                            const elegido = extras.some((x) => x.extra === e.id && x.quincena === q.numero);
                            const off = (excluido || el === 0) && !elegido;
                            return (
                              <label key={e.id} className={cn("flex items-center gap-3 rounded-xl px-3 py-2", off ? "cursor-not-allowed bg-muted text-muted-foreground" : "cursor-pointer bg-secondary/60")}>
                                <Checkbox checked={elegido} disabled={off} onCheckedChange={() => toggleExtra(e.id, q.numero)} />
                                <span className="flex-1 text-sm font-semibold">{e.nombre}</span>
                                <span className="text-xs">{excluido ? "No es para su grupo" : el === 0 ? "Sin lugar" : `${el} lugares`}</span>
                                <span className="text-sm font-bold">{pesos(e.precio)}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </article>
                  );
                })}
                <Nav onBack={() => setPaso(1)} onNext={() => setPaso(3)} nextDisabled={quincenas.length === 0} nextLabel="Ver resumen" />
              </section>
            )}
            {paso === 3 && grupo && sede && (
              <section className="space-y-4">
                <Titulo t="Resumen" s="Revisá que esté todo bien antes de confirmar." />
                {bajoDeCuatro && quincenas.length === 3 && (
                  <div role="alert" className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
                    <strong>Ojo:</strong> diste de baja una de las cuatro quincenas. Perdés el precio de {pesos(PRECIO_CUATRO)} y pagás {pesos(subtotalQuincenas(3))} por tres.
                  </div>
                )}
                <div className="divide-y rounded-2xl border bg-card">
                  <Fila k="Niño/a" v={`${datos.nino} · grupo ${grupo.nombre}`} />
                  <Fila k="Adulto responsable" v={`${datos.adulto} · ${datos.telefono}`} />
                  <Fila k="Pueden retirarlo/a" v={autorizadosValidos(autorizados).map((a) => `${a.nombre} (${a.parentesco})`).join(", ")} />
                  <Fila k="Sede" v={`${sede.nombre} · turno ${sede.turno}, ${sede.horario_inicio} a ${sede.horario_fin}`} />
                  {cat.quincenas.filter((q) => quincenas.includes(q.numero)).map((q) => (
                    <div key={q.numero} className="px-4 py-3">
                      <div className="flex justify-between gap-2 text-sm">
                        <span className="font-semibold">Quincena {q.numero} · {fechaCorta(q.fecha_inicio)} al {fechaCorta(q.fecha_fin)}</span>
                        <span>{quincenas.length === 4 ? "—" : pesos(q.cuota)}</span>
                      </div>
                      {extras.filter((x) => x.quincena === q.numero).map((x) => {
                        const e = cat.extras.find((c) => c.id === x.extra)!;
                        return <div key={x.extra} className="flex justify-between pl-3 text-sm text-muted-foreground"><span>+ {e.nombre}</span><span>{pesos(e.precio)}</span></div>;
                      })}
                    </div>
                  ))}
                  {quincenas.length === 4 && <Fila k="Temporada completa" v={pesos(PRECIO_CUATRO)} />}
                  <div className="flex items-baseline justify-between bg-primary px-4 py-4 text-primary-foreground">
                    <span className="font-semibold">Total</span>
                    <span className="font-display text-2xl font-extrabold">{pesos(total)}</span>
                  </div>
                </div>
                <Nav onBack={() => setPaso(2)} onNext={confirmar} nextDisabled={enviando} nextLabel={enviando ? "Confirmando…" : "Confirmar inscripción"} accent />
              </section>
            )}
          </>
        )}
        {confirmada && sede && (
          <section className="space-y-5 py-10 text-center">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground"><Check className="size-8" /></div>
            <h2 className="font-display text-3xl font-extrabold">¡Listo, {datos.nino.split(" ")[0]} está adentro!</h2>
            <p className="text-muted-foreground">Te esperamos en {sede.nombre}, de {sede.horario_inicio} a {sede.horario_fin}. Total: <strong className="text-foreground">{pesos(confirmada.total)}</strong>.</p>
            <Button size="lg" onClick={descargarIcs} className="bg-accent text-accent-foreground hover:bg-accent/90"><Download /> Agendá las fechas (.ics)</Button>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button asChild variant="outline" size="lg"><Link to="/mi-inscripcion">Ver mi inscripción</Link></Button>
              <Button variant="outline" size="lg" onClick={nuevaInscripcion}>Inscribir a otro niño/a</Button>
            </div>
          </section>
        )}
      </main>

      {cat && paso >= 1 && !confirmada && (
        <div className="fixed inset-x-0 bottom-0 border-t bg-card/95 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
            <span className="text-sm text-muted-foreground">{quincenas.length} quincena{quincenas.length === 1 ? "" : "s"} · {extras.length} extra{extras.length === 1 ? "" : "s"}</span>
            <span className="font-display text-xl font-extrabold">{pesos(total)}</span>
          </div>
        </div>
      )}

      <AlertDialog open={confirmarBaja !== null} onOpenChange={(o) => !o && setConfirmarBaja(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Das de baja una quincena?</AlertDialogTitle>
            <AlertDialogDescription>
              Con las cuatro pagás {pesos(PRECIO_CUATRO)}. Con tres pasás a {pesos(subtotalQuincenas(3))}, y se liberan los extras de esa quincena.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Mejor no</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (confirmarBaja) quitar(confirmarBaja); setConfirmarBaja(null); }}>Sí, darla de baja</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const iniciado = (p: number) => p > 0;

function Header({ sede }: { sede: Sede | null }) {
  return (
    <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2 font-display text-lg font-extrabold text-primary"><TreePine className="size-6" />Todo Verde</div>
        <div className="flex items-center gap-2">
          {sede && <span className="hidden sm:block"><SedeChip sede={sede} /></span>}
          <Link to="/mi-inscripcion" className="rounded-full border px-3 py-1.5 text-xs font-bold text-primary hover:bg-secondary">Mi inscripción</Link>
        </div>
      </div>
    </header>
  );
}

function SedeChip({ sede }: { sede: Sede }) {
  const barda = sede.id === "barda";
  return (
    <div className={cn("flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold", barda ? "bg-barda-soft text-barda" : "bg-confluencia-soft text-confluencia")}>
      <MapPin className="size-3.5" />{sede.nombre} · {sede.horario_inicio}–{sede.horario_fin}
    </div>
  );
}

function Inicio({ onStart, inscriptas, onReset }: { onStart: () => void; inscriptas: number; onReset: () => void }) {
  return (
    <section className="flex min-h-[75vh] flex-col justify-center py-10">
      <p className="mb-3 text-sm font-bold uppercase tracking-widest text-accent">Verano 2027 · Alto Valle</p>
      <h1 className="font-display text-5xl font-extrabold leading-[1.05] text-primary sm:text-7xl">Colonia<br />Todo Verde</h1>
      <p className="mt-6 max-w-xl text-lg text-muted-foreground">
        Álamos, río y mucho juego. Elegí el turno, sumá las quincenas que quieras y mirá el precio al toque. Te lleva cinco minutos.
      </p>
      <div className="mt-6 grid max-w-xl gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-barda-soft p-4 text-barda"><Sun className="mb-1 size-5" /><p className="font-bold">Mañana · Sede Barda</p><p className="text-sm">9:00 a 13:00</p></div>
        <div className="rounded-2xl bg-confluencia-soft p-4 text-confluencia"><Sunset className="mb-1 size-5" /><p className="font-bold">Tarde · Sede Confluencia</p><p className="text-sm">13:30 a 17:30</p></div>
      </div>
      <Button size="lg" onClick={onStart} className="mt-8 h-14 w-full max-w-xs bg-accent text-base font-bold text-accent-foreground hover:bg-accent/90 sm:w-auto">
        Empezar inscripción <ArrowRight />
      </Button>
      <div className="mt-8 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <Link to="/mi-inscripcion" className="font-semibold text-primary underline underline-offset-4">Ver mis inscripciones ({inscriptas})</Link>
        <button type="button" onClick={onReset} className="font-semibold text-primary underline underline-offset-4">Reiniciar datos de ejemplo</button>
      </div>
    </section>
  );
}

function Stepper({ paso }: { paso: number }) {
  return (
    <ol className="mb-6 flex gap-2">
      {PASOS.map((p, i) => (
        <li key={p} className="flex-1">
          <div className={cn("h-1.5 rounded-full", i <= paso ? "bg-primary" : "bg-border")} />
          <span className={cn("mt-1 block text-xs font-semibold", i === paso ? "text-primary" : "text-muted-foreground")}>{p}</span>
        </li>
      ))}
    </ol>
  );
}

function Titulo({ t, s }: { t: string; s: string }) {
  return (
    <div className="mb-2">
      <h2 className="font-display text-3xl font-extrabold">{t}</h2>
      <p className="mt-1 text-muted-foreground">{s}</p>
    </div>
  );
}

function Fila({ k, v }: { k: string; v: string }) {
  return <div className="flex flex-col gap-0.5 px-4 py-3 text-sm sm:flex-row sm:justify-between"><span className="text-muted-foreground">{k}</span><span className="font-semibold sm:text-right">{v}</span></div>;
}

function Nav({ onBack, onNext, nextDisabled, nextLabel = "Seguir", accent }: { onBack?: () => void; onNext: () => void; nextDisabled?: boolean; nextLabel?: string; accent?: boolean }) {
  return (
    <div className="flex gap-3 pt-4">
      {onBack && <Button variant="outline" size="lg" onClick={onBack} className="h-12"><ArrowLeft /> Volver</Button>}
      <Button size="lg" onClick={onNext} disabled={nextDisabled} className={cn("h-12 flex-1 font-bold", accent && "bg-accent text-accent-foreground hover:bg-accent/90")}>
        {nextLabel} <ArrowRight />
      </Button>
    </div>
  );
}

function PasoDatos({ datos, setDatos, grupos, onNext, grupoFijo, autorizados, setAutorizados }: {
  datos: Datos; setDatos: (d: Datos) => void; grupos: Grupo[]; onNext: (g: Grupo) => void; grupoFijo: Grupo | null;
  autorizados: Autorizado[]; setAutorizados: (a: Autorizado[]) => void;
}) {
  const [tocado, setTocado] = useState(false);
  const edad = datos.nacimiento ? edadAlCorte(datos.nacimiento) : null;
  const grupo = edad !== null ? grupoPorEdad(edad, grupos) : null;
  const errores = useMemo(() => {
    const e: Partial<Record<keyof Datos, string>> = {};
    if (!datos.nino.trim()) e.nino = "Contanos cómo se llama";
    if (!datos.nacimiento) e.nacimiento = "Falta la fecha";
    if (!datos.adulto.trim()) e.adulto = "Falta el nombre del adulto";
    if (!/^[\d\s+()-]{6,30}$/.test(datos.telefono.trim())) e.telefono = "Revisá el teléfono";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(datos.email.trim())) e.email = "Revisá el email";
    return e;
  }, [datos]);
  const autOk = autorizadosValidos(autorizados).length > 0;
  const autIncompleto = autorizados.some((a) => (a.nombre.trim() || a.dni.trim()) && !a.parentesco) || autorizados.some((a) => a.parentesco && !a.nombre.trim());
  const setAut = (i: number, k: keyof Autorizado, v: string) => setAutorizados(autorizados.map((a, j) => (j === i ? { ...a, [k]: v } : a)));
  const fuera = edad !== null && !grupo;
  const campo = (k: keyof Datos, label: string, type = "text", extra?: Record<string, string>) => (
    <div className="space-y-1.5">
      <Label htmlFor={k}>{label}</Label>
      <Input id={k} type={type} maxLength={k === "email" ? 255 : 100} value={datos[k]} onChange={(ev) => setDatos({ ...datos, [k]: ev.target.value })} className="h-12 bg-card text-base" {...extra} />
      {tocado && errores[k] && <p className="text-sm text-destructive">{errores[k]}</p>}
    </div>
  );
  // Si ya se fijó un grupo, el grupo se mantiene toda la temporada: la fecha queda bloqueada.
  return (
    <section className="space-y-4">
      <Titulo t="Datos del niño/a" s="Con la fecha de nacimiento armamos su grupo." />
      {campo("nino", "Nombre y apellido")}
      {campo("nacimiento", "Fecha de nacimiento", "date", grupoFijo ? { disabled: "true" } : { min: "2010-01-01", max: "2025-12-31" })}
      {fuera && <div role="alert" className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">No entra en ninguno de nuestros grupos</div>}
      {grupo && (
        <div className="rounded-2xl bg-secondary px-4 py-3 text-sm">
          Al 4/1/2027 tiene <strong>{edad} años</strong>: va al grupo <strong>{grupo.nombre}</strong> ({grupo.edad_min} a {grupo.edad_max}) toda la temporada.
        </div>
      )}
      {campo("adulto", "Nombre del adulto responsable")}
      {campo("telefono", "Teléfono", "tel")}
      {campo("email", "Email", "email")}
      <fieldset className="space-y-3 rounded-2xl border bg-card p-4">
        <legend className="flex items-center gap-1.5 px-1 font-display text-lg font-semibold"><UserCheck className="size-5 text-primary" />Personas autorizadas a retirar</legend>
        <p className="text-sm text-muted-foreground">Solo estas personas pueden buscarlo/a. Cargá al menos una.</p>
        {autorizados.map((a, i) => (
          <div key={i} className="space-y-2 rounded-xl bg-secondary/50 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Persona {i + 1}</span>
              {autorizados.length > 1 && (
                <button type="button" onClick={() => setAutorizados(autorizados.filter((_, j) => j !== i))} className="inline-flex items-center gap-1 text-xs font-semibold text-destructive" aria-label={`Quitar persona ${i + 1}`}>
                  <Trash2 className="size-3.5" />Quitar
                </button>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`aut-nombre-${i}`}>Nombre y apellido</Label>
              <Input id={`aut-nombre-${i}`} maxLength={100} value={a.nombre} onChange={(e) => setAut(i, "nombre", e.target.value)} className="h-12 bg-card text-base" />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={`aut-par-${i}`}>Parentesco</Label>
                <select id={`aut-par-${i}`} value={a.parentesco} onChange={(e) => setAut(i, "parentesco", e.target.value)}
                  className="h-12 w-full rounded-md border border-input bg-card px-3 text-base">
                  <option value="">Elegí…</option>
                  {PARENTESCOS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`aut-dni-${i}`}>DNI (opcional)</Label>
                <Input id={`aut-dni-${i}`} inputMode="numeric" maxLength={15} value={a.dni} onChange={(e) => setAut(i, "dni", e.target.value)} className="h-12 bg-card text-base" />
              </div>
            </div>
          </div>
        ))}
        {autorizados.length < 5 && (
          <Button type="button" variant="outline" onClick={() => setAutorizados([...autorizados, { nombre: "", parentesco: "", dni: "" }])}><Plus />Sumar otra persona</Button>
        )}
        {tocado && (!autOk || autIncompleto) && (
          <p role="alert" className="text-sm text-destructive">
            {!autOk ? "Cargá al menos una persona autorizada con su parentesco." : "Completá nombre y parentesco de cada persona, o quitala."}
          </p>
        )}
      </fieldset>
      <Nav onNext={() => { setTocado(true); if (Object.keys(errores).length === 0 && grupo && autOk && !autIncompleto) onNext(grupoFijo ?? grupo); }} nextDisabled={fuera} />
    </section>
  );
}

function PasoTurno({ sedes, sedeId, onPick, onBack, onNext }: { sedes: Sede[]; sedeId: string | null; onPick: (id: string) => void; onBack: () => void; onNext: () => void }) {
  const orden = [...sedes].sort((a) => (a.turno === "mañana" ? -1 : 1));
  return (
    <section className="space-y-4">
      <Titulo t="Elegí el turno" s="Cada turno tiene su sede. Podés cambiarlo cuando quieras." />
      <div className="grid gap-3 sm:grid-cols-2">
        {orden.map((s) => {
          const barda = s.id === "barda";
          const sel = s.id === sedeId;
          return (
            <button key={s.id} type="button" onClick={() => onPick(s.id)} aria-pressed={sel}
              className={cn("rounded-2xl border-2 p-5 text-left transition", barda ? "bg-barda-soft" : "bg-confluencia-soft",
                sel ? (barda ? "border-barda shadow-lg" : "border-confluencia shadow-lg") : "border-transparent hover:border-border")}>
              <div className={cn("mb-3 flex size-10 items-center justify-center rounded-full text-primary-foreground", barda ? "bg-barda" : "bg-confluencia")}>
                {barda ? <Sun className="size-5" /> : <Sunset className="size-5" />}
              </div>
              <p className="font-display text-xl font-bold">Turno {s.turno} — {s.nombre}, {s.horario_inicio} a {s.horario_fin}</p>
              <p className={cn("mt-2 flex items-center gap-1 text-sm font-semibold", barda ? "text-barda" : "text-confluencia")}><Clock className="size-4" />{s.horario_inicio} a {s.horario_fin}</p>
              {sel && <p className="mt-2 inline-flex items-center gap-1 text-sm font-bold"><Check className="size-4" />Elegido</p>}
            </button>
          );
        })}
      </div>
      <Nav onBack={onBack} onNext={onNext} nextDisabled={!sedeId} />
    </section>
  );
}
