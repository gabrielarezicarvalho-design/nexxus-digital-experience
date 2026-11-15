import { Button } from "@/components/ui/button";
import { promotionSecondsRemaining } from "@/lib/token-promotion";
import { isConfiguredPromotionOpen, promotionText } from "@/lib/promotion-rules";
import { tokenOfferQuery } from "@/lib/promotion-query";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n";
import type { getTokenOffer } from "@/lib/promotion.functions";

export function TokenPromotion({ onBuy, initialData }: { initialData: Awaited<ReturnType<typeof getTokenOffer>>; onBuy: (plan: { code: string; name: string; title: string | null; price_cents: number; kind: string }) => void }) {
  const { t } = useLang();
  const { data } = useQuery({ ...tokenOfferQuery, initialData });
  const offer = data?.offer;
  const plan = data?.plan;
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);
  if (!offer?.enabled || !plan?.active || !plan.token_limit || !plan.code) return null;
  const seconds = promotionSecondsRemaining(Date.parse(offer.ends_at), now ?? Date.parse(offer.starts_at));
  const open = now !== null && isConfiguredPromotionOpen(offer, now);
  const upcoming = now !== null && now < Date.parse(offer.starts_at);
  const millions = plan.token_limit / 1_000_000;
  const [reais, centavos] = (plan.price_cents / 100).toFixed(2).split(".");
  const renderText = (text: string) => promotionText(t(text), plan.token_limit ?? 0, plan.price_cents);
  return <article className="token-promotion" aria-label={`${t("PROMOÇÃO")}: ${millions} ${t("milhões de tokens")}`}>
    <div className="token-promotion-banner">
      <span className="token-promotion-label"><i aria-hidden="true" /> {t("OFERTA ESPECIAL")}</span>
      <div className="token-promotion-countdown">
        <span className="token-promotion-clock" role="timer" aria-label={t("Tempo restante da promoção")}><strong>{String(Math.floor(seconds / 3600)).padStart(2, "0")}</strong><small>H</small><strong>{String(Math.floor((seconds % 3600) / 60)).padStart(2, "0")}</strong><small>MIN</small><strong>{String(seconds % 60).padStart(2, "0")}</strong><small>S</small></span>
        <span className="token-promotion-term">{upcoming ? t("Em breve") : now !== null && seconds > 0 ? `${t("Termina em")} ${new Date(offer.ends_at).toLocaleString()}` : seconds === 0 ? t("promoção encerrada") : ""}</span>
      </div>
    </div>
    <div className="token-promotion-body">
      <div className="token-promotion-quantity"><strong>{millions}</strong><span>{t("MILHÕES")}<br />{t("DE TOKENS")}</span></div>
      <div className="token-promotion-copy">
        <div className="token-promotion-badges"><span>{renderText(offer.badge)}</span><span>{t("PROMOÇÃO")}</span></div>
        <h3>{renderText(offer.headline)}</h3>
        <p>{renderText(offer.description)}</p>
      </div>
      <div className="token-promotion-checkout">
        <div className="token-promotion-price" aria-label={`R$ ${reais},${centavos}`}><small>R$</small><strong>{reais}</strong><span>,{centavos}</span></div>
        <Button className="token-promotion-button" disabled={!open} onClick={() => onBuy({ ...plan, code: offer.plan_code })}>{upcoming ? t("Em breve") : seconds > 0 ? renderText(offer.button_label) : t("PROMOÇÃO ENCERRADA")}</Button>
      </div>
    </div>
  </article>;
}