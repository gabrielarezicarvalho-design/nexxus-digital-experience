import { describe, expect, test } from "bun:test";
import type { UIMessage } from "ai";
import { assistantImageError, hasAssistantUserContent } from "./assistant-attachments";

const pixel = "data:image/png;base64,iVBORw0KGgo=";
const message = (parts: UIMessage["parts"]): UIMessage => ({ id: "1", role: "user", parts });

describe("assistant image attachments", () => {
  test("accepts an image-only message and a supported data URL", () => {
    const input = message([{ type: "file", mediaType: "image/png", url: pixel, filename: "print.png" }]);
    expect(hasAssistantUserContent(input)).toBe(true);
    expect(assistantImageError([input])).toBeNull();
  });

  test("rejects files that are not uploaded image data", () => {
    const input = message([{ type: "file", mediaType: "application/pdf", url: "data:application/pdf;base64,AAAA" }]);
    expect(assistantImageError([input])).toBe("Envie somente imagens PNG, JPG, WEBP ou GIF.");
  });

  test("enforces four images and five MB per image", () => {
    const file = { type: "file" as const, mediaType: "image/png", url: pixel };
    expect(assistantImageError([message(Array.from({ length: 5 }, () => file))])).toBe("Envie no máximo 4 imagens por mensagem.");
    const huge = `data:image/png;base64,${"A".repeat(7_000_000)}`;
    expect(assistantImageError([message([{ ...file, url: huge }])])).toBe("Cada imagem pode ter no máximo 5 MB.");
  });
});
