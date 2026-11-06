import { describe, expect, it } from "vitest";
import { confirmarLocal, seed } from "./demo-store";

const base = { nino: "Tomás Ríos", nacimiento: "2018-03-10", adulto: "Ana Ríos", telefono: "299 555-1234", email: "ana@mail.com", sede: "barda" };

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
