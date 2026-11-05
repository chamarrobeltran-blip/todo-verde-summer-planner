import { describe, expect, it } from "vitest";
import { calcularTotal, edadAlCorte, filtrarExtrasPorTurno, grupoPorEdad, lugaresLibres, quitarQuincena, type Extra, type Grupo } from "./colonia";

const grupos: Grupo[] = [
  { id: "chispas", nombre: "Chispas", edad_min: 3, edad_max: 5, cupo_barda: 20, cupo_confluencia: 18 },
  { id: "copas", nombre: "Copas", edad_min: 12, edad_max: 13, cupo_barda: 20, cupo_confluencia: 18 },
];
const extras: Extra[] = [
  { id: "natacion", nombre: "Natación", turno: "mañana", precio: 45000, cupo: 15, grupos_excluidos: [] },
  { id: "kayak", nombre: "Kayak", turno: "tarde", precio: 55000, cupo: 10, grupos_excluidos: [] },
];

describe("colonia", () => {
  it("calcula la edad cumplida al 4/1/2027", () => {
    expect(edadAlCorte("2024-01-04")).toBe(3);
    expect(edadAlCorte("2024-01-05")).toBe(2);
  });
  it("menos de 3 o más de 13 no entra en ningún grupo", () => {
    expect(grupoPorEdad(2, grupos)).toBeNull();
    expect(grupoPorEdad(14, grupos)).toBeNull();
    expect(grupoPorEdad(13, grupos)?.id).toBe("copas");
  });
  it("1 a 3 quincenas = cuota × quincenas + extras", () => {
    expect(calcularTotal(3, [{ extra: "natacion", quincena: 1 }], extras)).toBe(870000 + 45000);
  });
  it("4 quincenas = $1.000.000 + extras", () => {
    expect(calcularTotal(4, [{ extra: "kayak", quincena: 2 }], extras)).toBe(1055000);
  });
  it("libres = cupo − inscriptos, nunca negativo", () => {
    expect(lugaresLibres(20, 12)).toBe(8);
    expect(lugaresLibres(20, 20)).toBe(0);
  });
  it("dar de baja una quincena devuelve sus extras", () => {
    const r = quitarQuincena([1, 2], [{ extra: "natacion", quincena: 1 }, { extra: "natacion", quincena: 2 }], 1);
    expect(r.quincenas).toEqual([2]);
    expect(r.extras).toEqual([{ extra: "natacion", quincena: 2 }]);
  });
  it("cambiar turno elimina extras incompatibles", () => {
    const r = filtrarExtrasPorTurno([{ extra: "natacion", quincena: 1 }, { extra: "kayak", quincena: 1 }], extras, "tarde");
    expect(r.ok.map((e) => e.extra)).toEqual(["kayak"]);
    expect(r.quitados.map((e) => e.extra)).toEqual(["natacion"]);
  });
});
