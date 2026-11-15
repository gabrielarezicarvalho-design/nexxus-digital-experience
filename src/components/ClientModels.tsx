import { useMemo, useState } from 'react';
import { ArrowDownAZ, ArrowRight, Check, Copy, Layers, Search, Sparkles, Terminal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { asFamily, familyAllows } from '@/lib/model-family';
import { cheapestClientModel, clientCatalogFamily, displayedModelPrice, filterClientCatalog, modelDisplayPrices, type ModelPriceCatalog } from '@/lib/client-model-pricing';
import { ModelBrandIcon as ModelIcon } from '@/components/ModelBrandIcon';
import { uniqueCatalogModels } from '@/lib/model-catalog';
import './client-models.css';

type ModelKey = { id: string; plano: string | null; model_family: string; api_key: string };
const usd = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 3 }).format(value);
const brl = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
function ModelPrices({ id, prices }: { id: string; prices: ModelPriceCatalog }) {
  const price = displayedModelPrice(id, prices);
  return <div className="client-models-facts"><div><small>ENTRADA</small><strong>{price ? brl(price.inputBrl) : 'A confirmar'}</strong><span>{price ? usd(price.input) + ' USD' : 'Sem referência'}</span><span>por 1.000.000 tokens de entrada</span></div><div><small>SAÍDA</small><strong>{price ? brl(price.outputBrl) : 'A confirmar'}</strong><span>{price ? usd(price.output) + ' USD' : 'Sem referência'}</span><span>por 1.000.000 tokens de saída</span></div></div>;
}
const title = (id: string) => /^claude-/i.test(id) ? id.replace(/\./g, '-') : id.replace(/^gpt-/i, 'GPT ').replace(/-/g, ' ');

export function ClientModels({ names, keys, basePrices, pricingByKey }: { names: string[]; keys: ModelKey[]; basePrices: ModelPriceCatalog; pricingByKey: Record<string, { prices: ModelPriceCatalog | null }> }) {
  const [keyId, setKeyId] = useState(keys[0]?.id ?? '');
  const [search, setSearch] = useState('');
  const [family, setFamily] = useState('all');
  const [sort, setSort] = useState('catalog');
  const [selected, setSelected] = useState<string | null>(null);
  const [copied, setCopied] = useState('');
  const [copyError, setCopyError] = useState('');
  const key = keys.find(item => item.id === keyId) ?? keys[0];
  const adjusted = key ? pricingByKey[key.id]?.prices : null;
  const prices = useMemo(() => modelDisplayPrices(adjusted ?? basePrices), [adjusted, basePrices]);
  const allowed = useMemo(() => uniqueCatalogModels(names.map(name => ({ name, display_name: title(name) }))).map(model => model.name), [names]);
  const included = (id: string) => Boolean(key && familyAllows(asFamily(key.model_family), id));
  const familyModels = useMemo(() => filterClientCatalog(allowed, family), [allowed, family]);
  const filtered = familyModels.filter(id => `${id} ${title(id)}`.toLowerCase().includes(search.toLowerCase()));
  const models = sort === 'name' ? [...filtered].sort((a, b) => a.localeCompare(b)) : filtered;
  const featured = useMemo(() => cheapestClientModel(familyModels, prices) ?? familyModels[0], [familyModels, prices]);
  async function copy(value: string) {
    try { await navigator.clipboard.writeText(value); setCopied(value); setCopyError(''); setTimeout(() => setCopied(''), 2000); }
    catch { setCopyError('Não foi possível copiar. Selecione o ID e copie manualmente.'); }
  }
  return <div className="client-models-page">
    <header className="client-models-heading"><div><span className="client-models-eyebrow"><Sparkles size={13} /> Suas ofertas NEXA CLOUD</span><h2>Melhores ofertas agora</h2><p>{adjusted ? 'Tarifas ajustadas ao seu plano e à combinação de modelos utilizada · por 1M tokens.' : 'Tarifas de referência · ajuste ao plano indisponível.'}</p></div>{keys.length > 1 && <label className="client-models-key">Chave<select value={keyId} onChange={e => { setKeyId(e.target.value); setSelected(null); }}>{keys.map(item => <option key={item.id} value={item.id}>{item.plano || 'Chave NEXA'} · {item.api_key.slice(-4)}</option>)}</select></label>}</header>
    {featured && <div className="client-models-showcase">
      <article className="client-models-featured"><span className="client-models-badge"><Sparkles size={13} /> Melhor negócio agora</span><div className="client-models-name"><span className="client-models-symbol"><ModelIcon id={featured} /></span><div><h3>{title(featured)}</h3><code>{featured}</code></div></div><ModelPrices id={featured} prices={prices} />{displayedModelPrice(featured, prices)?.estimated && <span className="client-models-badge">Padrão estimado</span>}<span className="client-models-unit">O mais barato entre os modelos com desconto forte: economia de verdade nas duas pontas.</span><div className="client-models-actions"><Button className="client-primary" onClick={() => setSelected(featured)}>Ver modelo <ArrowRight /></Button><Button variant="outline" onClick={() => void copy(featured)}>{copied === featured ? <Check /> : <Copy />}Copiar ID</Button></div></article>
      <div className="client-models-ranking"><div className="client-models-ranking-title"><span className="client-models-ranking-symbol"><Sparkles size={17} /></span><div><h3>Barato e com desconto</h3><p>Preço de entrada por 1M tokens · seu plano</p></div></div>{familyModels.slice(0, 5).map((id, index) => <Button key={id} variant="ghost" className="client-models-rank-row" onClick={() => setSelected(id)}><span className="client-models-rank-number">{index + 1}</span><ModelIcon id={id} /><div><strong>{title(id)}</strong><small>{clientCatalogFamily(id) === 'openai' ? 'GPT' : clientCatalogFamily(id) === 'claude' ? 'Claude' : 'Outros'}</small></div><span className="client-models-rank-access">{included(id) ? 'Incluso' : 'GPT/Combo'}</span><span className="client-models-rank-price">{displayedModelPrice(id, prices) ? brl(displayedModelPrice(id, prices)?.inputBrl ?? 0) : 'A confirmar'}</span></Button>)}</div>
    </div>}
    <div className="client-models-controls"><label className="client-models-search"><Search size={17} /><input aria-label="Buscar modelos" placeholder="Buscar por nome ou ID" value={search} onChange={e => setSearch(e.target.value)} />{search && <Button variant="ghost" size="icon-sm" aria-label="Limpar busca" onClick={() => setSearch('')}><X /></Button>}</label><label className="client-models-sort"><ArrowDownAZ size={17} /><select aria-label="Ordenar modelos" value={sort} onChange={e => setSort(e.target.value)}><option value="catalog">Destaques</option><option value="name">Nome: A–Z</option></select></label></div>
    <div className="client-models-filters" aria-label="Filtrar família">{[{ id: 'all', label: 'Todos' }, { id: 'claude', label: 'Claude' }, { id: 'openai', label: 'GPT' }].map(item => <Button key={item.id} variant="outline" className={family === item.id ? 'is-active' : ''} aria-pressed={family === item.id} onClick={() => { setFamily(item.id); setSelected(null); }}>{item.id !== 'all' && <Layers size={14} />}{item.label}</Button>)}<span>{models.length} modelos</span></div>
    {copyError && <p role="alert" className="client-error">{copyError}</p>}
    {selected && <section className="client-models-detail" aria-label="Detalhes do modelo"><div><span className="client-models-eyebrow">MODELO SELECIONADO</span><h3>{title(selected)}</h3><code>{selected}</code></div><div><code>/model {selected}</code><Button variant="outline" onClick={() => void copy(`/model ${selected}`)}>{copied === `/model ${selected}` ? <Check /> : <Terminal />}Copiar comando</Button><Button variant="ghost" size="icon-sm" aria-label="Fechar detalhes" onClick={() => setSelected(null)}><X /></Button></div></section>}
    <div className="client-models-grid">{models.map(id => <article key={id} className="client-models-card"><div className="client-models-name"><span className="client-models-symbol"><ModelIcon id={id} /></span><div><h3>{title(id)}</h3><code>{id}</code></div><span className="client-models-badge">{displayedModelPrice(id, prices)?.estimated ? 'Padrão estimado' : displayedModelPrice(id, prices) ? 'Referência / 1M' : 'Sem tarifa'}</span></div><div className="client-models-tags"><span>{clientCatalogFamily(id) === 'openai' ? 'GPT' : clientCatalogFamily(id) === 'claude' ? 'Claude' : 'Outros'}</span><span>{included(id) ? 'Incluso na chave' : clientCatalogFamily(id) === 'openai' ? 'Requer plano GPT ou Combo' : clientCatalogFamily(id) === 'claude' ? 'Requer plano Claude ou Combo' : 'Consulte os modelos da chave'}</span></div><ModelPrices id={id} prices={prices} /><footer><Button variant="ghost" size="icon-sm" aria-label={`Copiar ID ${id}`} title="Copiar ID" onClick={() => void copy(id)}>{copied === id ? <Check /> : <Copy />}</Button><Button variant="link" size="sm" onClick={() => setSelected(id)}>Ver modelo <ArrowRight /></Button></footer></article>)}</div>
    {!models.length && <div className="client-empty">{allowed.length ? 'Nenhum modelo encontrado.' : 'Catálogo indisponível no momento.'}</div>}
  </div>;
}