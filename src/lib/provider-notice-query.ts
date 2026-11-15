import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isProviderNoticeEnabled, providerNoticeQueryKey } from "./provider-notice";

export const providerNoticeQueryOptions = queryOptions({
  queryKey: providerNoticeQueryKey,
  queryFn: async () => {
    const { data, error } = await supabase.from("site_notices")
      .select("enabled").eq("id", "provider_instability").maybeSingle();
    if (error) throw error;
    return isProviderNoticeEnabled(data);
  },
  refetchInterval: 10000,
  refetchOnWindowFocus: true,
});