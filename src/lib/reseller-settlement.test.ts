import { describe, expect, test } from "bun:test";
import { nextInstallmentCents, readSettlement } from "./reseller-settlement";

describe("readSettlement", () => {
  test("sem acordo quando campos são nulos", () => {
    expect(readSettlement({ settlement_total_cents: null, settlement_installments: null })).toBeNull();
    expect(readSettlement({})).toBeNull();
  });

  test("lê acordo de R$ 540 em 2x", () => {
    expect(readSettlement({ settlement_total_cents: 54000, settlement_installments: 2 }))
      .toEqual({ totalCents: 54000, installments: 2 });
  });

  test("ignora acordo inválido", () => {
    expect(readSettlement({ settlement_total_cents: 0, settlement_installments: 2 })).toBeNull();
    expect(readSettlement({ settlement_total_cents: 54000, settlement_installments: 0 })).toBeNull();
  });
});

describe("nextInstallmentCents", () => {
  const s = { totalCents: 54000, installments: 2 };

  test("primeira parcela é metade do acordo", () => {
    expect(nextInstallmentCents(s, 54000)).toBe(27000);
  });

  test("última parcela é só o que falta", () => {
    expect(nextInstallmentCents(s, 27000)).toBe(27000);
    expect(nextInstallmentCents(s, 10000)).toBe(10000);
  });

  test("nunca cobra mais que o pendente nem valor zerado", () => {
    expect(nextInstallmentCents(s, 0)).toBe(0);
    expect(nextInstallmentCents(s, 99999)).toBe(27000);
  });
});
