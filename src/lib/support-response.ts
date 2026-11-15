// Remove speech/subtitle timing artifacts, not ordinary bracketed text or code.
export function cleanSupportResponse(text: string) {
  return text.split(/(```[\s\S]*?(?:```|$)|`[^`\n]*`)/g).map((part, index) => {
    if (index % 2) return part;
    return part.replace(/\[\d+(?:\.\d+)?\s*:\s*(?:\d+(?:\.\d+)?)?\]\s*/g, "");
  }).join("");
}