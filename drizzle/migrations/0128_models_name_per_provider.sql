-- O mesmo nome público pode existir em vários fornecedores (uma linha por fornecedor).
ALTER TABLE public.models DROP CONSTRAINT IF EXISTS models_name_key;
ALTER TABLE public.models DROP CONSTRAINT IF EXISTS models_name_provider_key;
ALTER TABLE public.models ADD CONSTRAINT models_name_provider_key UNIQUE (name, provider);
