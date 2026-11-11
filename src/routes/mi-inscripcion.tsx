import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, CalendarDays, MapPin, TreePine, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { CUOTA, PRECIO_CUATRO, calcularTotal, fechaCorta, pesos } from "@/lib/colonia";
import { cargar, darDeBajaQuincena, guardar, type Catalogo, type Inscripcion } from "@/lib/demo-store";

export const Route = createFileRoute("/mi-inscripcion")({
  head: () => ({
    meta: [
      { title: "Mi inscripción — Colonia Todo Verde 2027" },
      { name: "description", content: "Mirá tus quincenas, quiénes pueden retirar a tu hijo o hija y dá de baja una quincena si lo necesitás." },
      { property: "og:title", content: "Mi inscripción — Colonia Todo Verde 2027" },
      { property: "og:description", content: "Quincenas, extras, personas autorizadas y bajas de tu inscripción." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MiInscripcion,
});

type Baja = { ins: Inscripcion; numero: number };

function MiInscripcion() {
  const [cat, setCat] = useState<Catalogo | null>(null);
  const [baja, setBaja] = useState<Baja | null>(null);
  useEffect(() => { setCat(cargar()); }, []);

  const activas = cat?.inscripciones.filter((i) => i.estado === "activa").slice().reverse() ?? [];
  const canceladas = cat?.inscripciones.filter((i) => i.estado === "cancelada") ?? [];

  function confirmarBaja() {
    if (!cat || !baja) return;
    try {
      const r = darDeBajaQuincena(cat, baja.ins.id, baja.numero);
      guardar(r.cat);
      setCat(r.cat);
      toast.success(r.cancelada
        ? "Listo, cancelamos la inscripción. El lugar quedó libre."
        : `Quincena ${baja.numero} dada de baja. Nuevo total: ${pesos(r.totalNuevo)}.`);
    } catch (e) {
      toast.error((e as Error).message);
    }
    setBaja(null);
  }

  // Vista previa del nuevo total para el aviso
  const previa = baja && cat ? (() => {
    const q = baja.ins.quincenas.filter((n) => n !== baja.numero);
    const ex = baja.ins.extras.filter((x) => x.quincena !== baja.numero);
    return { total: calcularTotal(q.length, ex, cat.extras), pierde: baja.ins.quincenas.length === 4, ultima: q.length === 0, extrasLiberados: baja.ins.extras.length - ex.length };
  })() : null;

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-extrabold text-primary"><TreePine className="size-6" />Todo Verde</Link>
          <Link to="/" className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground"><ArrowLeft className="size-4" />Inicio</Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl space-y-5 px-4 pb-16 pt-4 sm:px-6">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Mi inscripción</h1>
          <p className="mt-1 text-muted-foreground">Las inscripciones confirmadas desde este teléfono.</p>
        </div>
        {!cat && <p className="py-16 text-center text-muted-foreground">Cargando…</p>}
        {cat && activas.length === 0 && (
          <div className="rounded-2xl border bg-card p-6 text-center">
            <p className="font-semibold">Todavía no tenés inscripciones activas.</p>
            <Button asChild className="mt-4 bg-accent text-accent-foreground hover:bg-accent/90"><Link to="/">Empezar inscripción</Link></Button>
          </div>
        )}
        {cat && activas.map((ins) => {
          const sede = cat.sedes.find((s) => s.id === ins.sede)!;
          const grupo = cat.grupos.find((g) => g.id === ins.grupo)!;
          const barda = sede.id === "barda";
          return (
            <article key={ins.id} className="overflow-hidden rounded-2xl border bg-card">
              <div className="space-y-2 p-4 sm:p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-display text-xl font-bold">{ins.nino}</h2>
                  <span className="text-sm font-semibold text-muted-foreground">Grupo {grupo.nombre}</span>
                </div>
                <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold", barda ? "bg-barda-soft text-barda" : "bg-confluencia-soft text-confluencia")}>
                  <MapPin className="size-3.5" />{sede.nombre} · turno {sede.turno}, {sede.horario_inicio} a {sede.horario_fin}
                </span>
                {ins.quincenas.length === 4 && (
                  <p className="rounded-xl bg-accent/10 px-3 py-2 text-sm font-semibold">🌳 Temporada completa: pagás {pesos(PRECIO_CUATRO)} y ahorrás {pesos(CUOTA * 4 - PRECIO_CUATRO)}.</p>
                )}
              </div>
              <ul className="divide-y border-t">
                {cat.quincenas.filter((q) => ins.quincenas.includes(q.numero)).map((q) => (
                  <li key={q.numero} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <div>
                      <p className="font-semibold">Quincena {q.numero} · {q.tematica}</p>
                      <p className="flex items-center gap-1 text-sm text-muted-foreground"><CalendarDays className="size-4" />{fechaCorta(q.fecha_inicio)} al {fechaCorta(q.fecha_fin)}/2027</p>
                      {ins.extras.filter((x) => x.quincena === q.numero).map((x) => (
                        <p key={x.extra} className="text-sm text-muted-foreground">+ {cat.extras.find((e) => e.id === x.extra)?.nombre}</p>
                      ))}
                    </div>
                    <Button variant="outline" size="sm" className="self-start border-destructive/40 text-destructive hover:bg-destructive/10 sm:self-center"
                      onClick={() => setBaja({ ins, numero: q.numero })}>
                      Dar de baja
                    </Button>
                  </li>
                ))}
              </ul>
              <div className="border-t px-4 py-3 sm:px-5">
                <p className="mb-1 flex items-center gap-1.5 text-sm font-bold"><UserCheck className="size-4 text-primary" />Pueden retirarlo/a</p>
                <ul className="text-sm text-muted-foreground">
                  {ins.autorizados.length === 0 && <li>Sin personas cargadas.</li>}
                  {ins.autorizados.map((a, i) => <li key={i}>{a.nombre} · {a.parentesco}{a.dni ? ` · DNI ${a.dni}` : ""}</li>)}
                </ul>
              </div>
              <div className="flex items-baseline justify-between bg-primary px-4 py-3 text-primary-foreground sm:px-5">
                <span className="font-semibold">Total</span>
                <span className="font-display text-2xl font-extrabold">{pesos(ins.total)}</span>
              </div>
            </article>
          );
        })}
        {canceladas.length > 0 && (
          <p className="text-sm text-muted-foreground">Inscripciones canceladas: {canceladas.map((i) => i.nino).join(", ")}.</p>
        )}
      </main>

      <AlertDialog open={baja !== null} onOpenChange={(o) => !o && setBaja(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{previa?.ultima ? "¿Cancelás la inscripción?" : `¿Das de baja la quincena ${baja?.numero}?`}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                {previa?.pierde && (
                  <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 font-semibold text-destructive">
                    Perdés el precio de temporada completa ({pesos(PRECIO_CUATRO)}). Con tres quincenas pagás {pesos(CUOTA * 3)}.
                  </p>
                )}
                {previa?.ultima && <p>Es la única quincena: la inscripción queda cancelada.</p>}
                <p>El lugar vuelve a quedar libre para el grupo en esa sede{previa && previa.extrasLiberados > 0 ? ", junto con sus extras" : ""}.</p>
                {baja && previa && <p>Total: <s>{pesos(baja.ins.total)}</s> → <strong className="text-foreground">{pesos(previa.total)}</strong></p>}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Mejor no</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarBaja} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Sí, dar de baja</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
