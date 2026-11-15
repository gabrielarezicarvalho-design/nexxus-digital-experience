import { test } from "node:test";
import assert from "node:assert/strict";
import { outageMinutesBetween, outagesBetween, rangeUptime, buildObservationBars, deliveryObservationState, latestDeliveryState, buildAvailabilityDays, buildAvailabilityHours, buildDayBars, buildDeliveryBars, coveragePercent, dayState, failurePercent, formatPercent, formatStamp, liveState, uptimePercent } from "./status-rules";

test("uptime é verificações certas dividido por verificações feitas", () => {
  assert.equal(uptimePercent(9938, 10077), 98.62);
  assert.equal(uptimePercent(100, 100), 100);
  assert.equal(uptimePercent(0, 0), null);
});

test("cobertura mostra quanto do período foi medido", () => {
  assert.equal(coveragePercent(10077, 10080), 99.97);
  assert.equal(coveragePercent(40023, 43200), 92.65);
  assert.equal(coveragePercent(0, 1440), null);
});

test("dia sem medição não conta como disponibilidade", () => {
  assert.equal(dayState(0, 0, 1440), "none");
  assert.equal(dayState(1440, 1440, 1440), "ok");
  assert.equal(dayState(1440, 1439, 1440), "fail");
  assert.equal(dayState(300, 300, 1440), "partial");
});

test("gráfico traz 30 dias e marca como sem dados quem não foi medido", () => {
  const bars = buildDayBars([{ day: "2026-10-21", checks: 1440, ok: 1440 }], new Date("2026-10-21T23:59:00Z"));
  assert.equal(bars.length, 30);
  const hoje = bars[29];
  const primeira = bars[0];
  assert.ok(hoje);
  assert.ok(primeira);
  assert.equal(hoje.day, "2026-10-21");
  assert.equal(hoje.state, "ok");
  assert.equal(primeira.day, "2026-09-22");
  assert.equal(primeira.state, "none");
});

test("hoje só é coberto até o minuto atual", () => {
  const cedo = buildDayBars([{ day: "2026-10-21", checks: 60, ok: 60 }], new Date("2026-10-21T01:00:00Z"))[29];
  assert.ok(cedo);
  assert.equal(cedo.state, "ok");
  const atrasado = buildDayBars([{ day: "2026-10-21", checks: 60, ok: 60 }], new Date("2026-10-21T23:00:00Z"))[29];
  assert.ok(atrasado);
  assert.equal(atrasado.state, "partial");
});

test("percentual aparece com vírgula e sem medição aparece riscado", () => {
  assert.equal(formatPercent(98.62), "98,62%");
  assert.equal(formatPercent(null), "—");
});

test("data aparece no fuso de São Paulo", () => {
  assert.match(formatStamp("2026-10-21T23:42:00Z"), /21\/10\/2026/);
  assert.equal(formatStamp(null), "—");
});

test("indicador fica vermelho quando nenhum fornecedor responde, mesmo com monitor verde", () => {
  const ok = { checkedAt: "2026-10-22T00:00:00Z", ok: true, dbOk: true, gatewayOk: true, latencyMs: 400, note: null };
  assert.equal(liveState(ok, true), "down");
  assert.equal(liveState(ok, false), "up");
  assert.equal(liveState({ ...ok, ok: false }, false), "down");
  assert.equal(liveState(null, false), "wait");
});

test("taxa de falha é pedidos com erro dividido por pedidos feitos", () => {
  assert.equal(failurePercent(5, 200), 2.5);
  assert.equal(failurePercent(0, 10), 0);
  assert.equal(failurePercent(0, 0), null);
});

test("barras de entrega só ficam vermelhas acima de 20 falhas", () => {
  const bars = buildDeliveryBars([
    { day: "2026-10-21", requests: 500, failures: 21 },
    { day: "2026-10-20", requests: 500, failures: 20 },
    { day: "2026-10-19", requests: 500, failures: 0 },
  ], new Date("2026-10-21T12:00:00Z"));
  assert.equal(bars.length, 30);
  assert.equal(bars[29]?.state, "fail");
  assert.equal(bars[28]?.state, "ok");
  assert.equal(bars[27]?.state, "ok");
  assert.equal(bars[26]?.state, "none");
});

test("dia com muitas falhas soltas, sem queda longa, não fica vermelho", () => {
  const bars = buildAvailabilityDays([{ day: "2026-10-22", checks: 1440, ok: 1440 }], [{ day: "2026-10-22", requests: 1000, failures: 300 }], [], new Date("2026-10-22T23:59:00Z"));
  assert.equal(bars[29]?.state, "ok");
  assert.equal(bars[29]?.failures, 300);
  assert.equal(bars[0]?.state, "none");
});

test("dia só fica vermelho quando o site ou fornecedor parou mais de 10 minutos", () => {
  const dias = [{ day: "2026-10-22", checks: 1440, ok: 1440 }];
  const agora = new Date("2026-10-22T23:59:00Z");
  const queda = buildAvailabilityDays(dias, [], [{ start: "2026-10-22T10:00:00Z", end: "2026-10-22T10:11:00Z" }], agora);
  assert.equal(queda[29]?.state, "fail");
  assert.equal(queda[29]?.outageMinutes, 11);
  assert.equal(buildAvailabilityDays(dias, [], [], agora)[29]?.state, "ok");
});

test("queda que atravessa a meia-noite conta em cada dia só os minutos dele", () => {
  const o = [{ start: "2026-10-21T23:55:00Z", end: "2026-10-22T00:10:00Z" }];
  const d21 = Date.parse("2026-10-21T00:00:00Z");
  const d22 = Date.parse("2026-10-22T00:00:00Z");
  assert.equal(outageMinutesBetween(o, d21, d22), 5);
  assert.equal(outageMinutesBetween(o, d22, d22 + 864e5), 10);
  assert.equal(outagesBetween(o, d22, d22 + 864e5), 1);
});

test("uptime do período desconta só os minutos de queda longa", () => {
  assert.equal(rangeUptime(1440, 0), 100);
  assert.equal(rangeUptime(1440, 144), 90);
  assert.equal(rangeUptime(0, 0), null);
});

test("hora fica vermelha só acima de 20 falhas", () => {
  const bars = buildAvailabilityHours([
    { hour: "2026-10-22T21:00:00Z", checks: 60, ok: 60, requests: 100, failures: 21 },
    { hour: "2026-10-22T22:00:00Z", checks: 60, ok: 60, requests: 50, failures: 20 },
  ], new Date("2026-10-22T23:30:00Z"));
  assert.equal(bars.length, 24);
  assert.equal(bars[21]?.state, "fail");
  assert.equal(bars[22]?.state, "ok");
  assert.equal(bars[23]?.state, "none");
});

test("falhas de entrega sem queda longa não marcam vermelho no dia", () => {
  assert.equal(buildAvailabilityDays([], [{ day: "2026-10-22", requests: 30, failures: 21 }], [], new Date("2026-10-22T23:30:00Z"))[29]?.state, "ok");
  assert.equal(buildAvailabilityHours([{ hour: "2026-10-22T23:00:00Z", checks: 0, ok: 0, requests: 30, failures: 21 }], new Date("2026-10-22T23:30:00Z"))[23]?.state, "fail");
});

test("nova verificação com entregas boas volta a verde sem apagar falha anterior", () => {
  const bars = buildObservationBars([
    { checkedAt: '2026-10-23T00:46:10Z', state: deliveryObservationState(true, 3, 0, 3), requests: 3, successes: 0, failures: 3 },
    { checkedAt: '2026-10-23T00:47:10Z', state: deliveryObservationState(true, 5, 5, 0), requests: 5, successes: 5, failures: 0 },
  ], new Date('2026-10-23T00:47:30Z'));
  assert.equal(bars.length, 1440);
  assert.equal(bars[0]?.checkedAt, '2026-10-22T00:48:00.000Z');
  assert.equal(bars[1438]?.state, 'down');
  assert.equal(bars[1439]?.state, 'up');
});

test("erro isolado com outras entregas funcionando é parcial, não queda total", () => {
  assert.equal(deliveryObservationState(true, 100, 99, 1), 'partial');
  assert.equal(deliveryObservationState(true, 100, 100, 0), 'up');
});

test("sem pedidos não prova funcionamento dos fornecedores", () => {
  assert.equal(deliveryObservationState(true, 0, 0, 0), 'wait');
  assert.equal(deliveryObservationState(false, 0, 0, 0), 'down');
});

test("monitoramento atrasado não mantém indicação verde", () => {
  const last = { checkedAt: '2026-10-23T00:47:00Z', ok: true, dbOk: true, gatewayOk: true, latencyMs: 200, note: null, deliveryState: 'up' as const, requests: 2, successes: 2, failures: 0 };
  assert.equal(latestDeliveryState(last, new Date('2026-10-23T00:48:00Z')), 'up');
  assert.equal(latestDeliveryState(last, new Date('2026-10-23T00:51:00Z')), 'wait');
});
