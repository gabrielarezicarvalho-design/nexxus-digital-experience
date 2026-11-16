-- Combos da Nexa: um nome da marca (nexa-...) que tenta, em ordem ou em rodízio, modelos de vários fornecedores.
CREATE TABLE IF NOT EXISTS public.model_combos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE CHECK (name ~ '^nexa-[a-z0-9][a-z0-9._-]{1,60}$' AND name <> 'nexa-reserva'),
  display_name text,
  description text,
  strategy text NOT NULL DEFAULT 'fallback' CHECK (strategy IN ('fallback', 'round_robin')),
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.model_combo_items (
  combo_id uuid NOT NULL REFERENCES public.model_combos(id) ON DELETE CASCADE,
  position integer NOT NULL CHECK (position >= 0),
  provider text NOT NULL,
  model text NOT NULL,
  PRIMARY KEY (combo_id, position)
);
ALTER TABLE public.model_combos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_combo_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS model_combos_admin ON public.model_combos;
CREATE POLICY model_combos_admin ON public.model_combos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS model_combo_items_admin ON public.model_combo_items;
CREATE POLICY model_combo_items_admin ON public.model_combo_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
REVOKE ALL ON public.model_combos, public.model_combo_items FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.model_combos, public.model_combo_items TO authenticated;
GRANT ALL ON public.model_combos, public.model_combo_items TO service_role;

-- Painel "Chamadas": números por fornecedor no período, só para administradores.
CREATE OR REPLACE FUNCTION public.admin_provider_live_stats(_minutes integer DEFAULT 60)
RETURNS TABLE (provider text, requests bigint, median_ms integer, p90_ms integer, errors bigint, cancelled bigint,
               prompt_tokens bigint, completion_tokens bigint, cached_tokens bigint, last_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  RETURN QUERY
  SELECT coalesce(l.provider, 'sem fornecedor'), count(*),
         (percentile_cont(0.5) WITHIN GROUP (ORDER BY l.latency_ms))::integer,
         (percentile_cont(0.9) WITHIN GROUP (ORDER BY l.latency_ms))::integer,
         count(*) FILTER (WHERE l.status_code >= 400 AND l.status_code <> 499),
         count(*) FILTER (WHERE l.status_code = 499),
         coalesce(sum(l.prompt_tokens), 0)::bigint, coalesce(sum(l.completion_tokens), 0)::bigint,
         coalesce(sum(l.cached_tokens), 0)::bigint, max(l.created_at)
  FROM public.request_logs l
  WHERE l.created_at >= now() - make_interval(mins => greatest(1, least(_minutes, 43200)))
  GROUP BY 1 ORDER BY 2 DESC;
END $$;
REVOKE ALL ON FUNCTION public.admin_provider_live_stats(integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_provider_live_stats(integer) TO authenticated;
