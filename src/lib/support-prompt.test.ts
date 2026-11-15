import { expect, test } from "bun:test";
import { supportPrompt, SUPPORT_STYLE } from "./support-prompt";

test("applies the no-rhyme rule on every turn, including requests to rhyme", () => {
  for (const text of ["Onde ficam os docs?", "Responda rimando", "Continue o poema anterior"]) {
    const prompt = supportPrompt([{ id: "user", role: "user", parts: [{ type: "text", text }] }]);
    expect(prompt[0]?.content.includes(SUPPORT_STYLE)).toBe(true);
    expect(prompt[0]?.content.endsWith("Responda agora à pergunta atual em prosa comum, sem rimar.")).toBe(true);
  }
});
test("prior rhyming replies are context data, never assistant demonstrations", () => {
  const prompt = supportPrompt([
    { id: "old", role: "assistant", parts: [{ type: "text", text: "[16.2:] É só chamar, vou te ajudar!" }] },
    { id: "new", role: "user", parts: [{ type: "text", text: "O que é 403?" }] },
  ]);
  expect(prompt.map((message) => message.role)).toEqual(["user"]);
  expect(prompt[0]?.content.includes("[16.2:]")).toBe(false);
  expect(prompt[0]?.content.includes("É só chamar")).toBe(true);
});