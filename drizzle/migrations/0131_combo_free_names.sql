-- Nome de combo livre (a regra de nome de Claude/GPT/Gemini fica no servidor, que vê os modelos do combo).
ALTER TABLE public.model_combos DROP CONSTRAINT IF EXISTS model_combos_name_check;
ALTER TABLE public.model_combos ADD CONSTRAINT model_combos_name_check
  CHECK (name ~ '^[a-z0-9][a-z0-9._-]{1,63}$' AND name NOT IN ('nexa-reserva', 'suporte-queda'));
