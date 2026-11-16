import { expect, test } from "bun:test";
import { cancelAware } from "./client-cancel";

test("a failure after the client cancelled is logged as 499, never as a site failure", () => {
  const ctrl = new AbortController();
  const req = new Request("https://x.test", { signal: ctrl.signal });
  expect(cancelAware(req, 502, { error: "AbortError" })).toEqual([502, { error: "AbortError" }]);
  ctrl.abort();
  expect(cancelAware(req, 502, { error: "AbortError", model: "m" })).toEqual([499, { error: "Cancelado pelo cliente", model: "m" }]);
  expect(cancelAware(req, 200)).toEqual([200, {}]);
});
