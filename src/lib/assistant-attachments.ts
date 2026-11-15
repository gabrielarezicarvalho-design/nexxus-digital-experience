import type { UIMessage } from "ai";

export const ASSISTANT_IMAGE_LIMIT = 4;
export const ASSISTANT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const IMAGE_DATA_URL = /^data:(image\/(?:png|jpeg|webp|gif));base64,([a-z0-9+/]+={0,2})$/i;

export function assistantImageError(messages: UIMessage[]): string | null {
  for (const message of messages) {
    const files = message.parts.filter((part) => part.type === "file");
    if (files.length > ASSISTANT_IMAGE_LIMIT) return `Envie no máximo ${ASSISTANT_IMAGE_LIMIT} imagens por mensagem.`;
    for (const file of files) {
      if (file.type !== "file") continue;
      const match = IMAGE_DATA_URL.exec(file.url);
      if (!match || file.mediaType !== match[1]?.toLowerCase()) {
        return "Envie somente imagens PNG, JPG, WEBP ou GIF.";
      }
      const base64 = match[2] ?? "";
      const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
      const bytes = Math.floor((base64.length * 3) / 4) - padding;
      if (bytes > ASSISTANT_IMAGE_MAX_BYTES) return "Cada imagem pode ter no máximo 5 MB.";
    }
  }
  return null;
}

export function hasAssistantUserContent(message: UIMessage | undefined): boolean {
  if (!message || message.role !== "user") return false;
  return message.parts.some((part) =>
    (part.type === "text" && Boolean(part.text.trim()))
    || (part.type === "file" && part.mediaType.startsWith("image/") && Boolean(part.url)),
  );
}
