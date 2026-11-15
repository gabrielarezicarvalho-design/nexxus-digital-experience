import { test } from "node:test";
import assert from "node:assert/strict";
import { isProviderNoticeEnabled } from "./provider-notice";

test("desligar o aviso impede sua exibição", () => {
  assert.equal(isProviderNoticeEnabled({ enabled: false }), false);
});

test("ligar o aviso permite sua exibição", () => {
  assert.equal(isProviderNoticeEnabled({ enabled: true }), true);
});

test("sem configuração o aviso fica desligado", () => {
  assert.equal(isProviderNoticeEnabled(null), false);
});