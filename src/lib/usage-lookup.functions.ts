import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const lookupKeyUsage = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ key: z.string().trim().min(10).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const { readKeyUsage } = await import("./key-usage.server");
    return readKeyUsage(data.key);
  });
