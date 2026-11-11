import { describe, expect, it } from "vitest";
import { confirmarLocal, darDeBajaQuincena, seed } from "./demo-store";

const base = { nino: "Tomás Ríos", nacimiento: "2018-03-10", adulto: "Ana Ríos", telefono: "299 555-1234", email: "ana@mail.com", sede: "barda", autorizados: [{ nombre: "Ana Ríos", parentesco: "Madre", dni: "" }] };

describe("confirmarLocal", () => {
  it("resta un lugar en cada quincena y calcula 4 = $1.000.000 + extras", () => {
    const r = confirmarLocal(seed(), { ...base, quincenas: [1, 2, 3, 4], extras: [{ extra: "natacion", quincena: 2 }] });
    expect(r.inscripcion.total).toBe(1045000);
    expect(r.inscripcion.grupo).toBe("brotes");
    expect(r.cat.cupos.find((c) => c.quincena === 3 && c.grupo === "brotes" && c.sede === "barda")?.inscriptos).toBe(1);
    expect(r.cat.cupos.find((c) => c.quincena === 1 && c.grupo === "brotes" && c.sede === "barda")?.inscriptos).toBe(2);
  });
  it("mañana y tarde no comparten cupo", () => {
    // Brotes Q1 está lleno en Confluencia pero no en Barda
    expect(() => confirmarLocal(seed(), { ...base, sede: "confluencia", quincenas: [1], extras: [] })).toThrow();
    expect(confirmarLocal(seed(), { ...base, quincenas: [1], extras: [] }).inscripcion.total).toBe(290000);
  });
  it("rechaza extras de otro turno", () => {
    expect(() => confirmarLocal(seed(), { ...base, quincenas: [1], extras: [{ extra: "kayak", quincena: 1 }] })).toThrow();
  });
});

describe("personas autorizadas", () => {
  it("no confirma sin al menos una persona autorizada con parentesco", () => {
    expect(() => confirmarLocal(seed(), { ...base, quincenas: [1], extras: [], autorizados: [] })).toThrow();
    expect(() => confirmarLocal(seed(), { ...base, quincenas: [1], extras: [], autorizados: [{ nombre: "Ana Ríos", parentesco: "", dni: "" }] })).toThrow();
  });
});

describe("darDeBajaQuincena", () => {
  it("devuelve el lugar a la sede y grupo, libera extras y recalcula", () => {
    const r1 = confirmarLocal(seed(), { ...base, quincenas: [1, 2, 3, 4], extras: [{ extra: "natacion", quincena: 2 }] });
    const r = darDeBajaQuincena(r1.cat, r1.inscripcion.id, 2);
    expect(r.perdioBeneficio).toBe(true);
    expect(r.totalAnterior).toBe(1045000);
    expect(r.totalNuevo).toBe(870000);
    expect(r.cat.cupos.find((c) => c.quincena === 2 && c.grupo === "brotes" && c.sede === "barda")?.inscriptos).toBe(1);
    expect(r.cat.extrasOcup.find((o) => o.extra === "natacion" && o.quincena === 2)?.inscriptos ?? 0).toBe(0);
  });
  it("de 3 a 2 no pierde beneficio; la última cancela", () => {
    const r1 = darDeBajaQuincena(seed(), "demo-1", 4);
    expect(r1.perdioBeneficio).toBe(false);
    expect(r1.totalNuevo).toBe(580000 + 45000);
    const r2 = darDeBajaQuincena(darDeBajaQuincena(r1.cat, "demo-1", 2).cat, "demo-1", 1);
    expect(r2.cancelada).toBe(true);
    expect(r2.cat.cupos.find((c) => c.quincena === 1 && c.grupo === "brotes" && c.sede === "barda")?.inscriptos).toBe(0);
  });
});
