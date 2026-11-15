import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { EN_SITE } from "./i18n-site";
import { EN_AUTH_CHECKOUT } from "./i18n-auth-checkout";

export type Lang = "pt" | "en";

// English translations keyed by the exact Portuguese source string.
const EN_BASE: Record<string, string> = {
  // Header / hero
  "PAINEL": "DASHBOARD",
  "MEU PAINEL": "MY DASHBOARD",
  "ENTRAR": "SIGN IN",
  "PLANOS": "PLANS",
  "VER PLANOS": "VIEW PLANS",
  "Já tenho chave": "I have a key",
  "SEU PRÓXIMO PASSO PASSA AQUI.": "YOUR NEXT STEP STARTS HERE.",
  "Gateway de IA.": "AI Gateway.",
  "Seu código. Suas ideias. Uma conexão que você controla. Claude Code e OpenCode, com a sua chave NEXA.": "Your code. Your ideas. A connection you control. Claude Code and OpenCode, with your NEXA key.",
  "Escolher meu plano": "Choose my plan",
  "Entrega após o PIX": "Delivered after PIX payment",
  "Acesso individual": "Individual access",
  "Uma conexão. O seu ambiente de trabalho.": "One connection. Your workspace.",
  // Pricing
  "UM PLANO PARA CADA PRÓXIMO PASSO.": "A PLAN FOR EVERY NEXT STEP.",
  "Qual é o tamanho da sua": "How big is your",
  "próxima ideia?": "next idea?",
  "Escolha seu acesso. Os modelos estão incluídos em todos os planos.": "Choose your access. Models are included in every plan.",
  "Por tokens": "By tokens",
  "Quer testar primeiro?": "Want to try it first?",
  "Fale com a equipe": "Talk to the team",
  // Compare section
  "POR QUE A NEXA?": "WHY NEXA?",
  "Compare a NEXA": "Compare NEXA",
  "com o que você já usa.": "with what you already use.",
  "Veja a NEXA lado a lado com os jeitos mais comuns de programar com IA.": "See NEXA side by side with the most common ways to code with AI.",
  "Concorrência": "Competitors",
  "Assinatura oficial": "Official subscription",
  "API por token": "Token API",
  "Sem janela de 5 horas": "No 5-hour window",
  "Sem teto semanal": "No weekly cap",
  "Não usa modelo chinês por trás": "No Chinese model behind the scenes",
  "Paga no PIX": "Pay with PIX",
  "Garantia de 7 dias sem uso": "7-day no-use guarantee",
  "Suporte de qualidade": "Quality support",
  "Vários modelos num plano só": "Several models in one plan",
  "Assinatura oficial: preço público em dólar, out/2026. Concorrência: sem citar nomes.": "Official subscription: public price in USD, Oct/2026. Competitors: no names mentioned.",
  "Mensal": "Monthly",
  "Mensal.": "Monthly.",
  "Por tokens, sem prazo.": "By tokens, no expiration.",
  "Ilimitado, por período.": "Unlimited, by period.",
  "Saldo sem validade. Ritmo de até 80 milhões de tokens por hora.": "Balance never expires. Up to 80 million tokens per hour.",
  "Sem cota total de tokens no período, com ritmo de até 100 milhões por hora. O prazo começa na emissão da chave e não pausa.": "No total token cap during the period, up to 100 million per hour. The term starts when the key is issued and does not pause.",
  // Plan card
  "MELHOR VALOR": "BEST VALUE",
  "ACESSO À API": "API ACCESS",
  "de acesso": "of access",
  "de tokens": "tokens",
  "Pagamento único via PIX": "One-time payment via PIX",
  "Modelos incluídos": "Models included",
  "Consumo no seu painel": "Usage in your dashboard",
  "Resposta rápida, sem fila de espera": "Fast responses, no waiting queue",
  "Suporte por e-mail": "Email support",
  "1M de contexto": "1M context",
  "100 de RPM, com controle de spam": "100 RPM, with spam control",
  "Tudo do plano Pro, sem restrições": "Everything in Pro, no restrictions",
  "Tudo do plano Max, sem restrições": "Everything in Max, no restrictions",
  "1M contexto em todos os modelos": "1M context on every model",
  "256K contexto em todos os modelos": "256K context on every model",
  "30 RPM, com controle de spam": "30 RPM, with spam control",
  "40 RPM — demanda altíssima": "40 RPM — very high demand",
  "50 RPM — demanda altíssima": "50 RPM — very high demand",
  "150 RPM — demanda altíssima": "150 RPM — very high demand",
  "200 RPM — demanda altíssima": "200 RPM — very high demand",
  "ultra velocidade nas respostas": "Ultra speed on responses",
  "Suporte prioritário": "Priority support",
  "Máxima velocidade de resposta": "Maximum response speed",
  "Suporte VIP": "VIP support",
  "Suporte via Whatsapp": "WhatsApp support",
  "Entrega após aprovação": "Delivered after approval",
  "Suporte em português": "Portuguese support",
  "Contratar plano": "Get this plan",
  // PIX modal
  "Pagamento aprovado!": "Payment approved!",
  "Repasse via PIX": "PIX payment",
  "Finalizar Assinatura": "Complete subscription",
  "Checkout seguro": "Secure checkout",
  "Tudo certo": "All set",
  "Valor:": "Amount:",
  "Sua chave sk-nx foi gerada. Entre ou crie sua conta com o e-mail": "Your sk-nx key has been generated. Sign in or create your account with the email",
  "para ver a chave.": "to see the key.",
  "Ver minha chave →": "View my key →",
  "Seu nome": "Your name",
  "Seu e-mail (a chave fica nele)": "Your email (the key is linked to it)",
  "Gerando PIX…": "Generating PIX…",
  "Gerar QR Code PIX": "Generate PIX QR Code",
  "Erro ao gerar o PIX.": "Error generating the PIX.",
  "✓ Código copiado!": "✓ Code copied!",
  "⧉ Copiar Código PIX": "⧉ Copy PIX Code",
  "Verificando…": "Checking…",
  "✓ Já paguei, verificar agora": "✓ I've paid, check now",
  "Pagamento ainda não identificado. Aguarde alguns segundos.": "Payment not identified yet. Wait a few seconds.",
  "Não foi possível verificar agora.": "Could not verify right now.",
  "Aguardando pagamento…": "Waiting for payment…",
  "Fechar": "Close",
  "Clique para copiar": "Click to copy",
  "Comandos copiados ✓": "Commands copied ✓",
  "Copiar comandos": "Copy commands",
  // Setup section
  "DA SUA CHAVE AO SEU PROJETO.": "FROM YOUR KEY TO YOUR PROJECT.",
  "Seu próximo projeto": "Your next project",
  "começa com uma conexão.": "starts with a connection.",
  "Ver os comandos": "View the commands",
  "1. Instale o OpenCode:": "1. Install OpenCode:",
  "2. Configure sua API Key (no PowerShell) — é a chave sk-nx-… que você copia em": "2. Set your API Key (in PowerShell) — it's the sk-nx-… key you copy under",
  "depois do pagamento aprovado:": "after the payment is approved:",
  "3. Entre na pasta do projeto:": "3. Enter the project folder:",
  "4. Crie o arquivo de configuração — não cole o JSON direto no PowerShell. Execute": "4. Create the config file — don't paste the JSON directly into PowerShell. Run",
  "e cole no Bloco de Notas:": "and paste it into Notepad:",
  "Salve o arquivo e feche o Bloco de Notas.": "Save the file and close Notepad.",
  "5. Abra o OpenCode com": "5. Open OpenCode with",
  "6. Dentro dele, rode": "6. Inside it, run",
  "e selecione": "and select",
  "Pronto, é só usar.": "Done, just use it.",
  "Ou use o Claude Code": "Or use Claude Code",
  ", o terminal oficial da Anthropic — sem opencode.json. No PowerShell, na pasta do projeto:": ", Anthropic's official terminal — no opencode.json. In PowerShell, in the project folder:",
  "2. Configure sua API Key (no Terminal) — é a chave sk-nx-… que você copia em": "2. Set your API Key (in the Terminal) — it's the sk-nx-… key you copy under",
  "4. Crie o arquivo de configuração com um editor de texto. No Terminal, rode": "4. Create the config file with a text editor. In the Terminal, run",
  ", cole o conteúdo abaixo, salve com": ", paste the content below, save with",
  "e feche com": "and close with",
  ", o terminal oficial da Anthropic — sem opencode.json. No Terminal, na pasta do projeto:": ", Anthropic's official terminal — no opencode.json. In the Terminal, in the project folder:",
  "Dentro dele, rode": "Inside it, run",
  "e escolha": "and choose",
  "Use sempre na mesma janela do PowerShell em que definiu as duas variáveis.": "Always use the same PowerShell window where you set both variables.",
  "Use sempre na mesma janela do Terminal em que definiu as duas variáveis.": "Always use the same Terminal window where you set both variables.",
  "VEJA A CONEXÃO ACONTECER.": "WATCH THE CONNECTION HAPPEN.",
  "Do pedido em português à edição do seu projeto.": "From a plain-language request to editing your project.",
  "Prepare seu ambiente": "Set up your environment",
  "Conecte o Claude Code": "Connect Claude Code",
  "Comece seu projeto": "Start your project",
  // Steps
  "O CAMINHO É MAIS SIMPLES.": "THE PATH IS SIMPLER.",
  "Começar pode": "Getting started can",
  "ser simples assim.": "be this simple.",
  "Escolha seu plano": "Choose your plan",
  "Tokens ou período, no ritmo do seu projeto.": "Tokens or period, at your project's pace.",
  "Faça seu pagamento": "Make your payment",
  "Pague pelo PIX e aguarde a aprovação.": "Pay with PIX and wait for approval.",
  "Copie sua chave": "Copy your key",
  "Seu acesso fica disponível no painel NEXA.": "Your access is available in the NEXA dashboard.",
  "Abra as possibilidades": "Open the possibilities",
  "Configure seu ambiente e comece a criar.": "Set up your environment and start creating.",
  // Offerings
  "O SEU ACESSO NEXA.": "YOUR NEXA ACCESS.",
  "Veja suas possibilidades": "See your possibilities",
  "em movimento.": "in motion.",
  "MODALIDADES": "OPTIONS",
  "Tokens sem prazo ou acesso por período.": "Tokens without expiration or period access.",
  "SEU AMBIENTE": "YOUR ENVIRONMENT",
  "Windows, macOS e Linux.": "Windows, macOS and Linux.",
  "SUA CONEXÃO": "YOUR CONNECTION",
  "1 chave": "1 key",
  "Claude Code e OpenCode no seu fluxo.": "Claude Code and OpenCode in your flow.",
  // Live stats
  "EM TEMPO REAL": "LIVE",
  "Veja o NEXA CLOUD": "See NEXA CLOUD",
  "Atualização ao vivo · a cada 2 segundos": "Live updates · every 2 seconds",
  "Tokens contabilizados": "Tokens counted",
  "Entrada": "Input",
  "saída": "output",
  "Chamadas hoje": "Calls today",
  "Taxa de sucesso": "Success rate",
  "Modelos no catálogo": "Models in the catalog",
  "Catálogo real · atualização a cada 30 segundos": "Real catalog · updates every 30 seconds",
  // Chat mockup
  "Sem pegadinha": "No catch",
  "Por que é tão mais barato?": "Why is it so much cheaper?",
  "A NEXA CLOUD conecta você aos modelos de IA por API. Você escolhe um pacote de tokens ou acesso por período e usa sua chave nas ferramentas compatíveis, sem contratar uma assinatura separada para cada ferramenta.": "NEXA CLOUD connects you to AI models through an API. Choose a token package or period-based access and use your key in compatible tools, without buying a separate subscription for each tool.",
  "Dos modelos ao seu projeto": "From models to your project",
  "Provedores": "Providers",
  "Anthropic · OpenAI": "Anthropic · OpenAI",
  "volume · créditos · cotas": "volume · credits · quotas",
  "Você": "You",
  "preço fixo por mês": "fixed price per month",
  "E a qualidade?": "What about quality?",
  "A NEXA autentica sua chave e encaminha as chamadas ao provedor do modelo. A velocidade e a disponibilidade das respostas podem variar em horários de pico.": "NEXA authenticates your key and forwards calls to the model provider. Response speed and availability may vary during peak hours.",
  "No seu ambiente de trabalho": "In your workspace",
  "Use sua chave no Claude Code, no OpenCode, em extensões compatíveis do VS Code ou em integrações por API. A mesma conexão acompanha o seu projeto.": "Use your key in Claude Code, OpenCode, compatible VS Code extensions or API integrations. The same connection follows your project.",
  "Novo": "New",
  "Próximo": "Next",
  "Projetos": "Projects",
  "Conversas": "Chats",
  "Meu próximo projeto": "My next project",
  "Loja virtual no Lovable": "Online store on Lovable",
  "Página de vendas": "Sales page",
  "Organizar meu site": "Organize my site",
  "Ilimitado": "Unlimited",
  "Boa tarde, o que vamos construir?": "Good afternoon, what are we building?",
  "Como posso ajudar hoje?": "How can I help today?",
  "Escrever": "Write",
  "Aprender": "Learn",
  "Ideias": "Ideas",
  // FAQ
  "ANTES DE COMEÇAR.": "BEFORE YOU START.",
  "Ainda ficou": "Still have",
  "alguma dúvida?": "a question?",
  "Fale com a gente": "Talk to us",
  "Funciona com o meu projeto do Lovable?": "Does it work with my Lovable project?",
  "Sim. O Claude Code trabalha no repositório do projeto no seu computador e envia as alterações normalmente.": "Yes. Claude Code works on the project repository on your computer and pushes the changes normally.",
  "Preciso saber programar?": "Do I need to know how to code?",
  "Não. Você pode dar os comandos em português, explicando o que quer mudar no projeto.": "No. You can give the commands in plain language, explaining what you want to change in the project.",
  "Tem limite de tokens?": "Is there a token limit?",
  "No Essencial, o limite é o pacote comprado e não há prazo. No ilimitado, não há conta de tokens durante o período.": "On Essential, the limit is the purchased package and there's no expiration. On unlimited, there's no token counting during the period.",
  "É o Claude Code oficial mesmo ou é um clone?": "Is it the official Claude Code or a clone?",
  "É o Claude Code oficial da Anthropic, instalado pelo instalador oficial. A NEXA fornece o acesso por API.": "It's Anthropic's official Claude Code, installed via the official installer. NEXA provides the API access.",
  "Quais modelos eu consigo usar?": "Which models can I use?",
  "Opus 5.5, Fable 5.1, Sonnet 5.5 e Haiku 4.5.": "Opus 5.5, Fable 5.1, Sonnet 5.5 and Haiku 4.5.",
  "Quando meu período começa e o que acontece quando acaba?": "When does my period start and what happens when it ends?",
  "O período começa na emissão da chave e não pausa. Ao terminar, a chave deixa de autenticar.": "The period starts when the key is issued and doesn't pause. When it ends, the key stops authenticating.",
  "Meu código passa por vocês?": "Does my code go through you?",
  "As chamadas passam pela ponte da NEXA, que autentica a chave e repassa ao provedor.": "Calls go through the NEXA bridge, which authenticates the key and forwards them to the provider.",
  "Posso usar a chave em mais de um computador?": "Can I use the key on more than one computer?",
  "A chave é individual e pode ser usada por uma pessoa.": "The key is individual and can be used by one person.",
  "Como eu pago e quando recebo a chave?": "How do I pay and when do I get the key?",
  "Você pode pagar por PIX ou cartão. A chave chega no e-mail assim que o pagamento é aprovado.": "You can pay by PIX or card. The key arrives by email as soon as the payment is approved.",
  "E se der problema?": "What if something goes wrong?",
  "Fale com o suporte. Se a chave não chegar ou não autenticar, a equipe resolve ou orienta o reembolso.": "Contact support. If the key doesn't arrive or doesn't authenticate, the team fixes it or guides the refund.",
  // Disclosure
  "Antes de comprar: informações importantes": "Before buying: important information",
  "LEIA ANTES DE PAGAR": "READ BEFORE PAYING",
  "Não somos a Anthropic, nem parceiros ou revendedores oficiais.": "We are not Anthropic, nor official partners or resellers.",
  "Você compra acesso por API: a chave sk-nx-… autentica chamadas de API, e só isso.": "You buy API access: the sk-nx-… key authenticates API calls, and that's it.",
  "A chave não loga no claude.ai, no app de celular nem no Claude Desktop, e não vira plano Pro ou Max. Claude in Chrome e os connectors de Gmail, Drive e Notion não entram. MCP funciona normalmente, local e remoto.": "The key doesn't log into claude.ai, the mobile app or Claude Desktop, and doesn't become a Pro or Max plan. Claude in Chrome and the Gmail, Drive and Notion connectors are not included. MCP works normally, local and remote.",
  "É no computador.": "It's on the computer.",
  "O Claude Code é um programa de terminal e trabalha na pasta do projeto na sua máquina. No celular não roda.": "Claude Code is a terminal program and works in the project folder on your machine. It doesn't run on phones.",
  "Seu código passa pela nossa ponte, que autentica a chave e repassa a chamada ao provedor. Se o seu projeto tem regra que proíbe isso, é motivo para não comprar aqui.": "Your code goes through our bridge, which authenticates the key and forwards the call to the provider. If your project has a rule against this, that's a reason not to buy here.",
  "Uma chave, uma pessoa: dividir suspende o acesso. Ritmo de até 100 milhões de tokens por hora no ilimitado e 80 milhões no Essencial. No ilimitado o relógio começa na emissão e não pausa; o Essencial vale até os tokens acabarem.": "One key, one person: sharing suspends access. Up to 100 million tokens per hour on unlimited and 80 million on Essential. On unlimited the clock starts at issuance and doesn't pause; Essential lasts until the tokens run out.",
  // CTAs
  "A IDEIA É SUA. A CONEXÃO É NEXA.": "THE IDEA IS YOURS. THE CONNECTION IS NEXA.",
  "O próximo projeto é seu.": "The next project is yours.",
  "A conexão é NEXA CLOUD.": "The connection is NEXA CLOUD.",
  "Uma chave para conectar seu próximo passo.": "One key to connect your next step.",
  "Ver os planos": "View plans",
  "PRONTO PARA COMEÇAR?": "READY TO START?",
  "Agora, dê a ela": "Now, give it",
  "espaço para": "room to",
  "acontecer.": "happen.",
  "Falar no WhatsApp": "Chat on WhatsApp",
  // Footer
  "O Claude Code destrava o seu projeto do Lovable, com acesso por API e atendimento em português.": "Claude Code unlocks your Lovable project, with API access and support in Portuguese.",
  "SUPORTE": "SUPPORT",
  "Grupo no WhatsApp": "WhatsApp group",
  "Atendimento 24h via WhatsApp": "24h support via WhatsApp",
  "LINKS": "LINKS",
  "Planos": "Plans",
  "Minha chave": "My key",
  "Reembolso": "Refunds",
  "Termos": "Terms",
  "Não somos a Anthropic, nem parceiros, revendedores oficiais ou patrocinados por ela.": "We are not Anthropic, nor partners, official resellers or sponsored by it.",
  "© 2026 NEXA CLOUD. Todos os direitos reservados.": "© 2026 NEXA CLOUD. All rights reserved.",
  "Desenvolvido pela Nexa Cloud": "Developed by Nexa Cloud",
  "Precisa de ajuda?": "Need help?",
  // Cookies
  "Cookies & privacidade.": "Cookies & privacy.",
  "Usamos cookies essenciais (sessão) e, com seu aceite, cookies de análise para entender o uso e melhorar a plataforma. Você escolhe. Saiba mais na": "We use essential cookies (session) and, with your consent, analytics cookies to understand usage and improve the platform. You choose. Learn more in the",
  "Política de Privacidade": "Privacy Policy",
  "SÓ ESSENCIAIS": "ESSENTIALS ONLY",
  "ACEITAR": "ACCEPT",
  // HomepageExperience — benefits
  "UMA CONEXÃO. SEU PRÓXIMO PASSO.": "ONE CONNECTION. YOUR NEXT STEP.",
  "Tudo conectado.": "Everything connected.",
  "Você no controle.": "You're in control.",
  "Seu projeto, seus modelos e seu jeito de trabalhar.": "Your project, your models and your way of working.",
  "Uma chave NEXA para conectar tudo.": "One NEXA key to connect everything.",
  "API compatível": "Compatible API",
  "Conectar agora": "Connect now",
  "Uma chave. Várias possibilidades.": "One key. Many possibilities.",
  "Acesse os modelos incluídos no seu plano e escolha o que combina com cada projeto.": "Access the models included in your plan and choose what fits each project.",
  "O ritmo do seu trabalho.": "The pace of your work.",
  "Tokens sem prazo ou acesso por período. Você escolhe como quer começar.": "Tokens without expiration or period access. You choose how to start.",
  "Uma conexão mais simples.": "A simpler connection.",
  "Acompanhe suas chaves e o consumo na sua conta NEXA, em um só lugar.": "Track your keys and usage in your NEXA account, all in one place.",
  "Do pagamento ao projeto.": "From payment to project.",
  "O PIX aprovado libera sua chave automaticamente no painel do cliente.": "An approved PIX automatically releases your key in the client dashboard.",
  "No seu ambiente, sem complicar.": "In your environment, hassle-free.",
  "Trabalhe no seu computador, na pasta do seu projeto, com ferramentas compatíveis.": "Work on your computer, in your project folder, with compatible tools.",
  "Sua chave, seu acesso.": "Your key, your access.",
  "Acesso pessoal e individual, com suporte em português quando precisar.": "Personal, individual access, with Portuguese support when you need it.",
  // HomepageExperience — environments
  "SEU FLUXO. SUA FERRAMENTA.": "YOUR FLOW. YOUR TOOL.",
  "Seu ambiente.": "Your environment.",
  "Sua escolha.": "Your choice.",
  "Conecte sua chave e continue trabalhando": "Connect your key and keep working",
  "onde suas ideias já acontecem.": "where your ideas already happen.",
  "Conectar à NEXA": "Connect to NEXA",
  "Terminal oficial": "Official terminal",
  "Seu código, seus modelos": "Your code, your models",
  "Extensões compatíveis": "Compatible extensions",
  // HomepageExperience — configuration
  "Não foi possível copiar. Selecione o texto e copie manualmente.": "Could not copy. Select the text and copy it manually.",
  "Prepare o ambiente": "Set up the environment",
  "Instale o": "Install",
  "no computador.": "on your computer.",
  "Defina sua chave": "Set your key",
  "Use a chave disponível no seu painel.": "Use the key available in your dashboard.",
  "Conecte seu projeto": "Connect your project",
  "Abra o terminal na pasta do projeto.": "Open the terminal in the project folder.",
  "Salve o arquivo opencode.json.": "Save the opencode.json file.",
  "Copiado": "Copied",
  "Copiar configuração": "Copy configuration",
  "Copiar código": "Copy code",
  // HomepageExperience — terminal
  "Exemplo de sessão Claude Code": "Claude Code session example",
  "Vamos criar algo incrível?": "Shall we build something amazing?",
  "Organize meu próximo projeto.": "Organize my next project.",
  "✓ Conexão com a NEXA estabelecida": "✓ Connection with NEXA established",
  "● Lendo os arquivos do projeto…": "● Reading project files…",
  "● Preparando as alterações…": "● Preparing changes…",
  "✓ Tudo pronto para começar.": "✓ All set to begin.",
  // TokenPromotion
  "OFERTA ESPECIAL": "SPECIAL OFFER",
  "Tempo restante da promoção": "Promotion time remaining",
  "termina à meia-noite": "ends at midnight",
  "promoção encerrada": "promotion ended",
  "MILHÕES": "MILLION",
  "DE TOKENS": "TOKENS",
  "PACK DE TESTE": "TRIAL PACK",
  "PROMOÇÃO": "PROMO",
  "Teste o Claude Code com": "Try Claude Code with",
  "Teste o Claude Code com {milhoes} milhões de tokens": "Try Claude Code with {milhoes} million tokens",
  "TESTAR POR R$ {preco}": "TRY FOR R$ {preco}",
  "Termina em": "Ends on",
  "Em breve": "Coming soon",
  "milhões de tokens": "million tokens",
  "O mesmo acesso dos pacotes por tokens, sem prazo de validade. Use no seu ritmo, até o saldo acabar.": "The same access as the token packages, with no expiration. Use at your own pace until the balance runs out.",
  "TESTAR POR R$": "TRY FOR R$",
  "PROMOÇÃO ENCERRADA": "PROMOTION ENDED",
  // Client dashboard
  "Visão geral": "Overview", "Seu plano": "Your plan", "Acesso à API": "API access", "Chaves de API": "API keys", "Conta": "Account", "Faturas": "Invoices",
  "Todos os seus pagamentos e o estado de cada um.": "All your payments and the state of each one.", "Sem assinatura ativa.": "No active subscription.", "Nenhum pagamento ainda.": "No payments yet.",
  "Aprovado": "Approved", "Pendente": "Pending", "Em análise": "Under review", "Recusado": "Rejected", "Cancelado": "Cancelled", "Erro": "Error",
  "Assinar plano": "Subscribe", "Olá": "Hello", "Sua conta NEXA CLOUD": "Your NEXA CLOUD account",
  "Painel revenda": "Reseller panel", "Painel admin": "Admin panel", "Tutoriais": "Tutorials", "Abrir o chat": "Open chat",
  "COMANDOS HOJE": "COMMANDS TODAY", "COMANDOS TOTAIS": "TOTAL COMMANDS", "TOKENS PROCESSADOS": "TOKENS PROCESSED", "MODELOS USADOS": "MODELS USED",
  "Hoje · horário de Brasília": "Today · Brasília time", "Todos os pedidos registrados": "All recorded requests", "Entrada + saída": "Input + output", "Modelos distintos nos pedidos": "Distinct models in requests",
  "COMECE AQUI": "START HERE", "Use os modelos no seu terminal": "Use the models in your terminal",
  "Claude Code e OpenCode com a sua chave NEXA. Na documentação há os comandos prontos para PowerShell, cmd ou bash.": "Claude Code and OpenCode with your NEXA key. The docs have ready-made commands for PowerShell, cmd or bash.",
  "Abrir a documentação": "Open the docs", "Carregando suas chaves e consumo…": "Loading your keys and usage…",
  // ProviderNotice
  "Instabilidade no fornecedor de IA: as respostas podem falhar ou demorar. Já estamos acompanhando e tudo volta ao normal automaticamente.": "AI provider instability: responses may fail or be delayed. We're monitoring it and everything returns to normal automatically.",
};

const EN_STATIC: Record<string, string> = { ...EN_AUTH_CHECKOUT, ...EN_SITE, ...EN_BASE };

// Texts with numbers inside (counts, status history lines).
const MONTHS: Record<string, string> = { jan: "Jan", fev: "Feb", mar: "Mar", abr: "Apr", mai: "May", jun: "Jun", jul: "Jul", ago: "Aug", set: "Sep", out: "Oct", nov: "Nov", dez: "Dec" };
const PATTERNS: [RegExp, (...m: string[]) => string][] = [
  [/^Copiar comando (\/model .+)$/, (_, c) => `Copy command ${c}`],
  [/^(\d+) dias?$/, (_, n) => `${n} ${n === "1" ? "day" : "days"}`],
  [/^Valor do plano: (.+?) · tarifas ajustadas ao uso e aos tokens restantes da chave(.*)$/s, (_, v, r) => `Plan value: ${v} · rates adjusted to usage and the key's remaining tokens${r}`],
  [/^([\d.,]+) utilizados$/, (_, n) => `${n} used`],
  [/^Copiar ID (.+)$/, (_, id) => `Copy ID ${id}`],
  [/^de ([\d.,]+) tokens$/, (_, n) => `of ${n.replace(/\./g, ",")} tokens`],
  [/^(\d{1,2}) de (jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\.?$/, (_, d, m) => `${MONTHS[m]} ${d}`],
  [/^(\d[\d.,]*) requisiç(?:ão|ões)( no período)?$/, (_, n, p) => `${n} ${n === "1" ? "request" : "requests"}${p ? " in the period" : ""}`],
  [/^(\d{1,2}) de (jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\.: ([\d.,]+) requisições, ([\d.,]+) tokens$/, (_, d, m, r, t) => `${MONTHS[m]} ${d}: ${r} requests, ${t} tokens`],
  [/^Hoje · ([\d.,]+) pedidos com tempo registrado$/, (_, n) => `Today · ${n} requests with recorded time`],
  [/^(.+ UTC) · (Queda de mais de 10 minutos|Sem quedas|Cobertura parcial|Sem dados) · ([\d.,]+) min parado$/, (_, d, s, m) =>
    `${d} · ${s === "Sem dados" ? "No data" : s === "Sem quedas" ? "No outages" : s === "Cobertura parcial" ? "Partial coverage" : "Outage longer than 10 minutes"} · ${m} min down`],
  [/^Quedas: ([\d.,]+) · Tempo parado: ([\d.,]+) min$/, (_, c, m) => `Outages: ${c} · Downtime: ${m} min`],
];
const EN = new Proxy(EN_STATIC, {
  get(target, key) {
    if (typeof key !== "string") return undefined;
    if (key in target) return target[key];
    for (const [re, fn] of PATTERNS) { const m = key.match(re); if (m) return fn(...m); }
    return undefined;
  },
});

const SKIP = "script,style,textarea,code,pre,[data-no-translate],[contenteditable=true]";
const originals = new WeakMap<Node, string>();
const attrOriginals = new WeakMap<Element, Record<string, string>>();
const ATTRS = ["placeholder", "title", "aria-label"];

function translateNode(node: Node, en: boolean) {
  if (node.nodeType === Node.TEXT_NODE) {
    const parent = node.parentElement;
    if (!parent || parent.closest(SKIP)) return;
    const current = node.nodeValue ?? "";
    const known = originals.get(node);
    const source = known !== undefined && (current === known || current === EN[known.trim()]) ? known : current;
    const key = source.trim();
    const translated = EN[key];
    if (!translated) { originals.delete(node); return; }
    originals.set(node, source);
    const next = en ? source.replace(key, translated) : source;
    if (current !== next) node.nodeValue = next;
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const el = node as Element;
  if (el.closest(SKIP)) return;
  const saved = attrOriginals.get(el) ?? {};
  for (const a of ATTRS) {
    const v = el.getAttribute(a);
    if (v == null) continue;
    const src = saved[a] !== undefined && (v === saved[a] || v === EN[saved[a]]) ? saved[a] : v;
    if (!EN[src]) continue;
    saved[a] = src;
    const next = en ? EN[src] : src;
    if (v !== next) el.setAttribute(a, next);
  }
  attrOriginals.set(el, saved);
  el.childNodes.forEach((c) => translateNode(c, en));
}

/** Applies the chosen language to every text on the page, including content rendered later. */
function usePageTranslation(lang: Lang) {
  useEffect(() => {
    const en = lang === "en";
    translateNode(document.body, en);
    if (!en) return;
    const obs = new MutationObserver((list) => {
      obs.disconnect();
      for (const m of list) {
        if (m.type === "characterData") translateNode(m.target, true);
        else if (m.type === "attributes") translateNode(m.target, true);
        else m.addedNodes.forEach((n) => translateNode(n, true));
      }
      obs.observe(document.body, opts);
    });
    const opts = { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS };
    obs.observe(document.body, opts);
    return () => obs.disconnect();
  }, [lang]);
}

type LangContextValue = { lang: Lang; setLang: (l: Lang) => void; t: (pt: string) => string };
const LangContext = createContext<LangContextValue>({ lang: "pt", setLang: () => {}, t: (s) => s });

function detectInitialLang(): Lang {
  try {
    const saved = window.localStorage.getItem("nexa-lang");
    if (saved === "en" || saved === "pt") return saved;
  } catch { /* sem acesso ao storage */ }
  const nav = (navigator.language || "").toLowerCase();
  return nav.startsWith("pt") ? "pt" : "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Always start as "pt" so SSR and the first client render match; the
  // browser preference is applied right after hydration.
  const [lang, setLangState] = useState<Lang>("pt");
  useEffect(() => { setLangState(detectInitialLang()); }, []);
  useEffect(() => { document.documentElement.lang = lang === "pt" ? "pt-BR" : "en"; }, [lang]);
  const setLang = (l: Lang) => {
    setLangState(l);
    try { window.localStorage.setItem("nexa-lang", l); } catch { /* sem acesso ao storage */ }
  };
  usePageTranslation(lang);
  const t = (pt: string) => (lang === "en" ? EN[pt] ?? pt : pt);
  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export function useLang() { return useContext(LangContext); }
