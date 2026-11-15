import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { filterAdminClients, isFullApiKeySearch, visibleKeysForSearch } from "./admin-client-search";

const rows = [
  {
    id: "client-1",
    name: "Cliente Um",
    email: "um@example.com",
    company: null,
    api_keys: [{ key_prefix: "sk-nx-abcdef" }],
  },
  {
    id: "client-2",
    name: "Cliente Dois",
    email: "dois@example.com",
    company: "NEXA",
    api_keys: [{ key_prefix: "sk-nx-zxywvu" }],
  },
];

describe("busca de clientes e chaves do administrador", () => {
  it("encontra o dono quando a chave completa foi confirmada no servidor", () => {
    const fullKey = "sk-nx-abcdef1234567890";
    assert.equal(isFullApiKeySearch(fullKey), true);
    assert.deepEqual(filterAdminClients(rows, fullKey, "client-1").map((row) => row.id), ["client-1"]);
  });

  it("continua encontrando pelo começo visível da chave", () => {
    assert.deepEqual(filterAdminClients(rows, "SK-NX-ZXYWVU").map((row) => row.id), ["client-2"]);
  });

  it("ignora espaços nas pontas ao buscar nome, email ou empresa", () => {
    assert.deepEqual(filterAdminClients(rows, "  nexa  ").map((row) => row.id), ["client-2"]);
    assert.deepEqual(filterAdminClients(rows, " UM@EXAMPLE.COM ").map((row) => row.id), ["client-1"]);
  });
});

describe("visibleKeysForSearch", () => {
  const keys = [{ id: "a", key_prefix: "sk-nx-AAAA11" }, { id: "b", key_prefix: "sk-nx-BBBB22" }];
  it("mostra só a chave exata encontrada", () => {
    assert.deepEqual(visibleKeysForSearch(keys, "sk-nx-BBBB22xyzxyzxyz", "b").map((k) => k.id), ["b"]);
  });
  it("filtra pelo começo da chave", () => {
    assert.deepEqual(visibleKeysForSearch(keys, "sk-nx-AAAA", null).map((k) => k.id), ["a"]);
  });
  it("busca por nome mantém todas as chaves", () => {
    assert.equal(visibleKeysForSearch(keys, "joao", null).length, 2);
  });
});
