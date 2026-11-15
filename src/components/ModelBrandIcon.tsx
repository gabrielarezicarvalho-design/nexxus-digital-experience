import { Layers } from 'lucide-react';
import { modelFamily } from '@/lib/model-family';
import { usagePriceModel } from '@/lib/client-usage-pricing';
import claudeIcon from '@/assets/client-claude-symbol.svg.asset.json';
import gptIcon from '@/assets/client-gpt-symbol.png.asset.json';

/** Logo do Gemini (estrela de quatro pontas), usada para Gemini e GLM. */
function GeminiIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id="gemini-logo-gradient" x1="0" y1="24" x2="24" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#1C7DFF" />
          <stop offset="0.52" stopColor="#1C69FF" />
          <stop offset="1" stopColor="#F0DCD6" />
        </linearGradient>
      </defs>
      <path fill="url(#gemini-logo-gradient)" d="M12 24A14.3 14.3 0 0 0 0 12 14.3 14.3 0 0 0 12 0a14.3 14.3 0 0 0 12 12 14.3 14.3 0 0 0-12 12Z" />
    </svg>
  );
}

export function isGeminiStyleModel(id: string) {
  const v = id.toLowerCase();
  return v.includes('gemini') || v.includes('glm');
}

/** Ícone da família do modelo; aceita nomes crus do histórico (ex.: anthropic/claude-haiku-5.5, nexa-sonnet-5). */
export function ModelBrandIcon({ id, className }: { id: string; className?: string }) {
  const resolved = usagePriceModel(id) ?? id;
  if (isGeminiStyleModel(id) || isGeminiStyleModel(resolved)) return <GeminiIcon className={className ?? 'client-models-brand-icon'} />;
  if (resolved.startsWith('claude-')) return <img className={className ?? 'client-models-brand-icon'} src={claudeIcon.url} alt="" />;
  if (modelFamily(resolved) === 'openai') return <span className={`client-models-gpt-icon ${className ?? ''}`} style={{ maskImage: `url(${gptIcon.url})`, ...(className ? { display: 'block', background: 'currentColor', maskSize: 'contain', maskRepeat: 'no-repeat', maskPosition: 'center' } : {}) }} aria-hidden="true" />;
  return <Layers />;
}
