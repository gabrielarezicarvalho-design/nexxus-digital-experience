import { BadgeCheck, ExternalLink, ShoppingBag, Star } from 'lucide-react';
import { useLang } from '@/lib/i18n';
import './whatsapp-testimonials.css';

export type WhatsAppTestimonial = {
  id: string;
  name: string;
  quote: string;
  imageUrl?: string;
  date?: string;
  rating: 1 | 2 | 3 | 4 | 5;
};

const GGMAX_PROFILE = 'https://ggmax.com.br/perfil/sixxcreditos';

// Real buyer reviews copied from the GGMAX seller profile (sixxcreditos).
const testimonials: WhatsAppTestimonial[] = [
  { id: 'g1', name: 'PAULOHGLF', quote: 'Muito bom, os créditos duram bastante dependendo do que você quer fazer. Ativei no VS Code direto e consigo rodar em qualquer lugar. Recomendo, preços em conta e barato.', date: '09/11/26', rating: 5 },
  { id: 'g2', name: 'Smith2024', quote: 'Excelente... entrega e funcionamento muito rápido.', date: '09/11/26', rating: 5 },
  { id: 'g3', name: 'thonypz999', quote: 'Mt bom, super recomendo pra quem quiser desenvolver jogos no Roblox. Funciona, pode comprar.', date: '08/11/26', rating: 5 },
  { id: 'g4', name: 'JasielDias', quote: 'Vendedor espetacular, muito prestativo e compreensivo.', date: '08/11/26', rating: 5 },
  { id: 'g5', name: 'goonakush', quote: 'SUPER RECOMENDO, VENDEDOR NOTA MIL, CUMPRE O QUE DE FATO ESTÁ ANUNCIANDO.', date: '08/11/26', rating: 5 },
  { id: 'g6', name: 'Enzo9d', quote: 'Boa venda, atendeu ao que eu queria e ajudou a resolver os problemas que eu tive.', date: '08/11/26', rating: 5 },
  { id: 'g7', name: 'compartdois', quote: 'Tutorial praticamente todo automatizado, absurda facilidade. Excelente vendedor.', date: '08/11/26', rating: 5 },
  { id: 'g8', name: 'Ramon_pot', quote: 'Produto rápido e prático, irei comprar mais vezes. Ótimo atendimento e paciência, muito receptivo.', date: '08/11/26', rating: 5 },
  { id: 'g9', name: '9godin9', quote: 'Vendedor entregou rápido com o procedimento correto, apliquei e funcionou certinho.', date: '30/10/26', rating: 5 },
  { id: 'g10', name: 'brenovsc', quote: 'PERFEITO, entrega totalmente rápida pelo horário, serviço genuíno e 100% confiável.', date: '30/10/26', rating: 5 },
  { id: 'g11', name: 'Pablosant', quote: 'Atencioso, e funcionou tudo certo, podem comprar tranquilamente.', date: '29/10/26', rating: 5 },
  { id: 'g12', name: 'Joao_jpBR', quote: 'Muito bom, vendedor respondeu super rápido e me atendeu perfeitamente.', date: '29/10/26', rating: 5 },
  { id: 'g13', name: 'Gebe_011', quote: 'Adm gentil e te ajuda tranquilão, podem comprar sem medo.', date: '28/10/26', rating: 5 },
  { id: 'g14', name: 'BernardoStudio', quote: 'Excelente experiência! Adquiri os créditos para utilizar o Claude e tudo funcionou perfeitamente, com rapidez e eficiência. A entrega foi rápida e o serviço atendeu às minhas expectativas. Recomendo!', date: '27/10/26', rating: 5 },
];

export function WhatsAppTestimonials() {
  const { lang } = useLang();
  const en = lang === 'en';

  return <section className="whatsapp-testimonials" aria-labelledby="whatsapp-testimonials-title">
    <header className="wide whatsapp-testimonials-heading">
      <h2 id="whatsapp-testimonials-title">{en ? 'Recommended by those who use it' : 'Quem usa, recomenda'}</h2>
      <div className="whatsapp-testimonials-source">
        <strong className="whatsapp-rating-value">{en ? '5.0' : '5,0'}</strong>
        <span className="whatsapp-rating-stars" aria-label={en ? '5 out of 5 stars' : '5 de 5 estrelas'}>{Array.from({ length: 5 }, (_, index) => <Star key={index} size={19} fill="currentColor" strokeWidth={1} aria-hidden="true" />)}</span>
        <BadgeCheck className="whatsapp-rating-logo" size={16} aria-hidden="true" />
        <span className="whatsapp-rating-count">{en ? 'Verified reviews on' : 'Avaliações verificadas na'} <b>GGMAX</b></span>
      </div>
    </header>
    <div className="whatsapp-testimonials-window">
      <div className="whatsapp-testimonials-track" aria-label={en ? 'Customer reviews' : 'Avaliações de clientes'}>
      {[...testimonials, ...testimonials].map((review, index) => <article key={`${review.id}-${index}`} aria-hidden={index >= testimonials.length || undefined} className="whatsapp-testimonial">
        <div className="whatsapp-testimonial-top"><span className="whatsapp-testimonial-left"><ShoppingBag size={18} aria-hidden="true" /><span className="whatsapp-testimonial-stars" aria-label={en ? `${review.rating} out of 5 stars` : `${review.rating} de 5 estrelas`}>{Array.from({ length: 5 }, (_, i) => <Star key={i} size={13} fill={i < review.rating ? 'currentColor' : 'none'} strokeWidth={1.5} aria-hidden="true" />)}</span></span>{review.date && <span>{review.date}</span>}</div>
        <blockquote>{review.quote}</blockquote>
        <footer><span className="whatsapp-testimonial-avatar" aria-hidden="true">{review.name.slice(0, 1).toUpperCase()}</span><div><strong>{review.name}</strong><span><BadgeCheck size={12} />{en ? 'Verified purchase on GGMAX' : 'Compra verificada na GGMAX'}</span></div></footer>
      </article>)}
      </div>
    </div>
    <p className="whatsapp-testimonials-more"><a href={GGMAX_PROFILE} target="_blank" rel="noopener noreferrer">{en ? 'See profile and reviews on GGMAX' : 'Ver perfil e avaliações na GGMAX'}<ExternalLink size={17} aria-hidden="true" /></a></p>
  </section>;
}
