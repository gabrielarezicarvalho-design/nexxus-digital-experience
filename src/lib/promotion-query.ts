import { queryOptions } from "@tanstack/react-query";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getTokenOffer } from "./promotion.functions";

export const tokenOfferQuery = queryOptions({ queryKey: ["token-offer"], queryFn: () => getTokenOffer(), staleTime: 0, refetchInterval: 5000 });
export function usePromotionRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    const refresh = () => {
      for (const key of ["token-offer", "public-plans", "admin-plans-all"]) void qc.invalidateQueries({ queryKey: [key] });
    };
    const channel = supabase.channel("token-offer-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "site_promotions" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "plans" }, refresh)
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [qc]);
}