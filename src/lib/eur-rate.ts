/** Cotação fixa definida pelo Gabriel: R$ 1 = € 0,16. */
export const BRL_TO_EUR = 0.16;
export const brlCentsToEurCents = (brlCents: number) => Math.round(brlCents * BRL_TO_EUR);
