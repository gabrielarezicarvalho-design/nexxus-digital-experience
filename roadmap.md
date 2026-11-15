# Roadmap
- [x] Permissões dos quatro mensais aplicadas ao catálogo e nove chaves existentes; listas por plano e bloqueio Pro nos dois protocolos testados. Conta autenticada conferida em Acesso API (pacote por tokens, preservado). Aplicativo oficial Claude não testado; Gemini disponível é 4 Argon, não há Gemini 4o cadastrado. Código depende de publicação.
- [x] Quatro planos mensais e dez chaves existentes atualizados com listas exclusivas; cartões e listas autenticadas conferidos, 33 testes passaram. GLM/Gemini usam os comandos existentes da Anthropic; preços, contexto visual, consumo, validade e prioridades preservados. Sem teste de geração real nem publicação.
- [x] Combo claude-fable-5-2 listado, aprovado e ativo na Anthropic Revenda; envio real pelo painel retornou HTTP 200 e resposta DeepSeek, catálogo do cliente mostrou o ID incluso. 43 testes passaram e build OK; planos/limites/cadeias preservados, código sem publicar.
- [x] FreeAPI Anthropic Revenda cadastrada na prioridade 20 com conector seguro, sem alterar fornecedores/catalogo atuais; teste pelo painel autenticado respondeu HTTP 200 em 2,2s (GLM 5.3 Flash), com nomes reais e 16 testes de transporte passando. Publicação do transporte pendente.
- [x] Taxa de sucesso considera somente falhas do site/fornecedor, excluindo limites/restrições e outros erros do cliente; logs e exceção 502 do Felipe preservados. 14 testes e oito classificações reais passaram; painel autenticado mostrou 95,7%, com 1.431 falhas operacionais e 2.342 fora da taxa. Cálculo aplicado; novos rótulos aguardam publicação.
- [x] Teste especial do Diego atualizado para 2h sem limite total/diário e sem custo; emissão restrita e validade imutável no banco. Sete testes passaram, página sem erros, geração real pelo painel e limites salvos conferidos; teste de verificação removido. Publicação pendente para o novo botão no site.
- [x] Atualizar os IDs da Anthropic Revenda: sete Claude com hífen; GLM e três GPT mantidos com ponto porque o fornecedor ainda anuncia essas grafias e os hífens retornaram 404. Onze chamadas reais HTTP 200, aliases antigos preservados, 41 testes e build OK; API pública publicada respondeu HTTP 200 com Opus 5.5 em grafia antiga e GPT 5.6 Luna. Prioridades, planos, preços e demais fornecedores inalterados.
- [x] Atualizar os onze combos Anthropic Revenda solicitados em 07/11/2026; configuração relida, prioridades/planos/fixações preservados, 43 testes passaram e build OK. Código ainda depende de publicação; chamada real pelo painel não verificada porque solicitante não tem conta vinculada.
- [x] Catálogo público sem duplicação: aliases com mesmo ID ou nome visível aparecem uma única vez; página inicial e painel mostram 23 modelos, sem alterar permissões ou roteamento. 70 testes passaram, build OK e telas autenticada/pública conferidas.
- [x] Nexa Chat: menu com fundo opaco acima das mensagens e imagens enviadas fora do balão laranja; conferido na conta conectada, 15 testes passaram e build OK.
- [x] Liberar os demais GPT no Nexa Chat da conta conectada: somente a chave Essencial 1B ativa mudou de Claude para Combo, sem alterar plano, preço, tokens ou limites; oito GPT aparecem e Terra foi selecionado no celular.
- [x] Nexa Chat: seletor no campo de envio com menu rolável por famílias, anexo de até quatro imagens e microfone para ditado; histórico, permissões e streaming preservados. Seleção do Sonnet 5 e descrição real de imagem retornaram HTTP 200; 15 testes passaram e build OK.
- [x] Toda resposta não-2xx ou falha de rede do fornecedor, inclusive 400/401/403/429, tenta automaticamente o próximo; validações e limites locais do cliente preservados, ordem/modelos inalterados e repetição especial da Clean mantida. 37 testes específicos passaram e build OK. Regressão ampliada encontrou oito expectativas antigas em generic-claude-chain.test.ts sobre rota direta ao dono, regra já substituída; nenhuma lógica dessa rota foi alterada nesta tarefa. Publicação pendente.
- [x] Corrigir erro de sessão ao enviar no Nexa Chat: identidade já verificada substitui getUser sem sessão local. Falha AuthSessionMissingError reproduzida; 27 testes passaram, build OK. Envio real na conta do solicitante e aplicação no publicado aguardam sessão/publicação.
- [x] Nexa Chat lista todos os modelos ativos e aprovados disponíveis, sem duplicatas, com permissões das chaves e fila compartilhada; fixações e widget preservados. 34 testes passaram, build OK. Conferência de envio na conta real indisponível: solicitante sem login vinculado; publicação pendente.
- [x] Excluir somente HTTP 502 do Felipe Paschoali da Taxa de sucesso pública/admin e detalhes; registros e erros preservados. Dez testes passaram, build OK, conta real mostrou 99,3% e 1.319 HTTP 502 fora da taxa; sem publicar.
- [x] Preços visuais dos cinco nomes renomeados usam referências existentes identificadas como estimadas somente em Modelos; 49 testes e conta real desktop/mobile conferidos, sem alterar cobrança nem publicar.
- [x] Astra transparente: comando gpt-6-astra liga exclusivamente ao Luna da Anthropic Revenda, respeitando cadeias dedicadas; Enterprise/chaves trocam DeepSeek por Astra. Painel/card identificam Luna, 22 testes passaram, chave afetada respondeu OK/200. Sem publicar.
- [x] Nome do cliente abre detalhes reais por chave: limites/saldo, consumo horário, métricas sete dias, gráfico, IPs e modelos via RPC exclusiva admin. 13 testes passaram; duas chaves de cliente real, desktop/mobile, atualização e Escape conferidos. Sem publicar.
- [ ] Seção de depoimentos abaixo de Sem pegadinha no desenho da referência; publicar conteúdo aguarda prints reais do WhatsApp enviados por Gabriel, sem nomes/notas inventados.
- [x] Três combos Anthropic Revenda salvos com aliases globais/dedicados e catálogo, ordem e famílias preservadas; 25 testes passaram, build OK; chamadas diretas dos três combos retornaram HTTP 200. Publicação do código pendente.
- [x] Modelos e comandos da aba API usam chave selecionada, família, plano e fornecedor próprio; catálogo global de Modelos preservado. 30 testes passaram; conferência autenticada indisponível porque solicitante não tem conta vinculada. Sem publicar.
- [x] Ferramentas orbitam a logo fixa mantendo orientação; pausa com mouse/foco/pop-up. Movimento, logo imóvel, pausa, clique no Codex, celular sem excesso de largura e movimento reduzido verificados; build OK.
- [x] Rede de ferramentas com áreas clicáveis, destaque, nomes e pop-ups NEXA; Claude/OpenCode/Codex usam exemplos existentes, demais exibem conexão genérica condicionada à versão. Abertura, cópia, troca de sistema e celular conferidos; sem alterar API ou publicar.
- [x] Abas Tokens/Mensal e quatro cartões mensais no tema NEXA criados; quatro preços conferidos, dois testes passaram; troca de abas e PIX dos pacotes verificados, celular sem excesso de largura. Sem publicar.
- [ ] Ativar venda de Pro/Max/Enterprise/Teams: aguarda definição de limites e benefícios comerciais pelo Gabriel; sem copiar ofertas ilimitadas.
- [x] Fixação individual de Wendel na Lauren salva com proteção administrativa; protocolos e listagem priorizam a chave sem alterar as duas irmãs. 29 testes passaram; prévia real listou Opus 5.5 e respondeu 4 (200), log Lauren conferido. Publicação necessária para aplicar o suporte por chave no site publicado.
- [x] Catálogo e PIX compartilhados na aba Seu plano para contas sem chave; emissão restaura tela atual. 17 testes passaram e build OK; conta assinante e formulário compartilhado conferidos. Primeira compra real e aprovação PIX não executadas (sessão disponível já possui plano); sem publicar.
- [x] Economia compara tarifas base e ajustadas nos mesmos tokens da chave, com assinatura total separada. Conta real: referência R$ 21,17, consumido R$ 0,72, economia R$ 20,45, plano R$ 34,90. 22 testes passaram e build OK; sem alterar cobranças ou publicar.
- [x] Nexxus: limite horário 429 explícito troca imediatamente, sem rotacionar credenciais; pausa persistida para todos os modelos até Retry-After ou uma hora. Restrições dedicadas preservadas; testes da troca/retorno e regressões passaram. Sem publicar; limite real não induzido.
- [ ] Consulta Nexxus a cada dez minutos: bloqueada, endpoint documentado /usage retorna 404 na conexão atual e não há esquema confirmado de consumo horário/reset. Necessária documentação/URL de consumo da Nexxus; nenhum agendamento criado para endpoint indisponível.
- [x] Catálogo salvo com 24 tarifas; preços ajustados por chave/plano com mesmo fator para modelos e entrada/saída. Modelos/Uso/saldo ligados à mesma fonte e agregados da chave com RLS. Conta real: gasto R$ 0,72 + saldo R$ 34,18 = plano R$ 34,90; Fable R$ 1,39/R$ 6,93 por 1M. Visitantes sem linhas, chave desconhecida recusada; testes de pesos/esgotamento passaram e build OK. Preços adaptativos de referência, sem alterar gateway/cobranças ou publicar.
- [x] Saldo proporcional aos tokens da chave, zero somente no esgotamento e mínimo visível de um centavo enquanto restam tokens; gasto estimado preservado. 12 testes passaram, build OK e conta autenticada mostrou R$ 34,18 de R$ 34,90. Sem publicar ou alterar limites/cobranças.
- [x] Saldo resolve valor do catálogo mesmo sem plan_id: conta real Mensal 20x R$ 209,90 menos R$ 1,75 = R$ 208,15. Chamadas limitadas a 360px com rolagem verificada; nota encurtada. Modelos usa catálogo global separado de geração: sete IDs, três GPT visíveis na conta Cloud. 38 testes passaram, build OK; sem alterar limites ou publicar.
- [x] Contraste corrigido nas cores compartilhadas, selos, terminal, status, docs e estados de interação. Seis páginas públicas e Minha Chave/Modelos/Uso/Plano conferidas em conta real; seleção dos modelos legível, sem erros de execução. Admin exige outra sessão e não foi conferido por dentro; sem alterar permissões, preços ou conteúdo. Publicação pendente.
- [x] Corrigir carregamento de chaves/consumo: RPCs falhavam após 8s; RLS com identidade por instrução e índices de proprietário preservam permissões. Mesmas consultas autenticadas agora 329/388ms sem erro; painel com consumo real aberto. Observadores sem repetição automática; 11 testes passaram e build OK.
- [x] Modelos mostra sete IDs públicos: GPT Astra/Terra/Luna e Cloud Fable 5.1/Opus 5.5/Sonnet 5/GLM. Preços entrada/saída reais conferidos em conta Cloud; GPT identifica plano necessário sem alterar geração. Filtros retornam 7/4/3; 45 testes passaram e build OK. Publicação pendente.
- [x] Aba Modelos mostra entrada/saída em reais e dólares por 1M tokens, conversão fixa de referência 5,40 e padrões estimados separados de tarifas confirmadas. Simulação autenticada: Fable 2M entrada + 1M saída = R$ 285,39; filtros conferidos, 35 testes passaram e build OK. Sem alterar cobrança ou saldo; publicação pendente.
- [x] Tarifas USD de entrada/saída por 1M aplicadas aos modelos exatos das referências; filtros Todos/Cloud/GPT preservam a família da chave. Conta real mostrou quatro cards e Sonnet $1.52/$7.60; GPT corretamente vazio na chave Claude. 41 testes passaram, build OK. Publicação pendente.
- [x] Custos de Uso usam as mesmas tarifas de Modelos com entrada/saída agregadas por conta e dia; padrões estimados identificados e dados sem preço exibem ausência. Conta conectada confirmou R$ 1,75 nos cards/por dia e valores próprios por modelo; 37 testes passaram e build OK. Cobranças e limites preservados; publicação pendente.
- [x] Criar aba Modelos abaixo de Uso com destaque, busca, filtros, ordenação, detalhes e cards das referências; catálogo público e famílias existentes preservados, sem copiar preços não confirmados. Publicação pendente.
- [x] Corrigir catálogo vazio da aba Modelos: leitura direta estava restrita a admins; RPC autenticada retorna somente nomes públicos aprovados, com filtro por família na chave. Consulta real da conta da imagem retornou sete IDs (200), 17 testes passaram e build OK.
- [x] Cards de Modelos conferidos na conta autenticada pela navegação lateral; quatro modelos, preços confirmados e três filtros funcionam. Publicação pendente.
- [x] Português/inglês nas páginas compartilhadas de consumo: navegador tem preferência e país da hospedagem serve de alternativa, com seletor automático/manual. Consulta real em inglês, troca com resultados, preferência após recarga e retorno ao automático verificados; nove testes passaram, build OK. País simulado no teste; cabeçalho geográfico real depende de publicação. Publicação pendente.
- [x] apiclaude.site já acessível com consulta compartilhada igual à apirevenda.site; consulta de chave válida conferida na prévia e no publicado, campo limpo e nenhum armazenamento. Geração publicada respondeu 4 com HTTP 200 em 8,96s. Aviso antigo de manutenção substituído por Acesso via API e verificado na prévia; publicação do aviso pendente. Três testes passaram.
- [x] Nexxus Pro adicionada como última reserva (9) com base raiz informada e conector seguro; 11 modelos listados, teste Sonnet “oi” retornou 200 e conexão do site confirmou 200. Prioridades, clientes e catálogo público preservados; publicação pendente, tráfego real de cliente não testado.
- [x] Admin → Auditoria → Acessos registra entradas novas com identidade/horário derivados no banco, deduplicação e paginação; leitura exclusiva admin, escrita/edição/exclusão diretas proibidas. Oito testes passaram, build OK e visitante redirecionado ao login. Publicação pendente.
- [ ] Conferir entrada e leitura do histórico com administrador real. Bloqueado: solicitante sem conta vinculada para sessão de teste; precisa entrar no Admin pela prévia.
- [x] Painel/aba Admin exigem sessão e papel verificados no servidor por acesso; ações e RLS/RPCs conferidos, claim_admin não concede mais por e-mail. 13 testes passaram; todos os 15 caminhos recusaram visitante sem login, build OK. Publicação pendente; verificação com administrador real aguarda login na prévia (solicitante sem conta vinculada).
- [x] GhostCLI excluída, Anthropic Revenda prioridade 0 e Invision prioridade 1; catálogo preservado e modelos exclusivos redirecionados para destinos disponíveis. Dados relidos; ambos responderam 200; testes de ordem/fallback e regressões passaram, build OK. Publicação do ajuste de fallback pendente; ponta a ponta autenticada não verificada (sem conta vinculada ao solicitante).
- [x] Lauren pelo conector, suportenextpro@gmail.com fixo exclusivamente nela; chave real listou apenas Opus 5.5 e respondeu 200 em 3,6s, registro confirmou Lauren/152 tokens. Limite diário e validade preservados; 21 testes passaram, build OK. Publicação da ligação pendente.
- [x] Modelo favorito por período, modelos de hoje e tempo médio ligados ao resumo de pedidos da própria conta, preservando RLS e sem expor registros brutos. Oito testes passaram; favorito (242 pedidos), filtros e atualização conferidos na conta autenticada e comparados com os registros. Hoje sem pedidos após meia-noite: modelos vazios e tempo sem amostras corretamente. Build OK; publicação pendente.
- [x] Cards de Uso adicionados conforme referências, com histórico/atividade e totais reais de até 30 dias; filtros e conta autenticada verificados, cinco testes passaram e build OK. Detalhes por modelo de hoje, favorito por período, média de tempo e histórico acima de 30 dias não são fornecidos pelo resumo atual; exibidos como indisponíveis, sem modificar dados ou outras abas. Publicação pendente.
- [x] Invision conectado com chave segura e última prioridade; painel autenticado confirmou conexão operacional e 92 modelos registrados inativos. Prioridades atuais preservadas, 24 testes passaram; publicação da ligação pendente, geração de resposta não testada.
- [x] Corrigir espera infinita em /minha-chave: apresentação usa eventos de sessão com recuperação após espera; quatro testes passaram e painel autenticado abriu mesmo com /auth/v1/user travado. Autorização/chaves preservadas; build OK, publicação pendente. A aba do usuário não respondeu à última inspeção.
- [x] Upgrade de tokens: PIX na mesma chave para pacotes, preços atuais por família e opção por chave no administrador; mensais excluídos. Painéis autenticados e PIX real pendente conferidos, saldo intacto; 18 testes passaram. Pagamento/credito real não executado; publicação pendente.
- [x] Responses API/Codex adicionada como tradutor compartilhado, com CORS e documentação; 12 testes puros e cinco regressões passaram. Chave real de suporte respondeu JSON/SSE 200, consumo de 22 tokens em cada pedido relido nos logs. Sem migrações/schema; publicação pendente, Codex CLI/app real não executado.
- [x] Falha de um fornecedor num modelo manda os próximos pedidos desse modelo direto ao fornecedor seguinte por 10 minutos, sem mudar a prioridade salva; 10 testes passaram. Publicação pendente (site publicado ainda roda a versão sem troca).
- [x] Ghost com 502 usa reservas ativas com modelo exato, preservando nome público e clientes dedicados; cada tentativa fica no diagnóstico de um único log. Dois protocolos e streaming validados em testes; pedidos reais da conta retornaram 200 e foram relidos no painel. Falha real não induzida; publicação pendente.
- [x] Seletor no topo mostra os três modelos atuais; troca para Sonnet e envio autenticado responderam “teste confirmado”, com histórico/sidebar/widget preservados. Publicação pendente.
- [x] Alexa e Visão geral usam a mesma barra: comparação autenticada confirmou conteúdo idêntico, largura 224px, marca 68px, itens 39px e quatro testes de consumo passaram. Publicação pendente.
- [x] Corrigida a fidelidade visual da Alexa: menu 212px, cabeçalho 47px, título serifado, sugestões 68px, campo inferior 624px e conta real no rodapé. Abertura/histórico/navegação autenticados conferidos no PC/celular, quatro testes de consumo passaram; publicação pendente.
- [x] Cartão Sua conta NEXA mostra tokens e barra de consumo da última chave, diário nos mensais; quatro testes passaram e conta autenticada confirmou 250M/dia, consumo de hoje e botão do plano. Publicação pendente.
- [x] Recriar Minha Chave com menu lateral, visão geral, uso, chaves, plano, faturas, configurações e suporte no tema NEXA; conta autenticada e menu no celular verificados sem erros, sete testes passaram. Dados/regras preservados; sem simular carteira, indicação ou tickets da referência. Publicação pendente.
- [x] Quadradinhos de falha da página Status só ficam vermelhos acima de 20 falhas do dia (monitor + pedidos); 18 testes passaram e a prévia confirmou dias com 1, 2, 3, 6 e 14 falhas verdes e dias com 69 a 2.139 vermelhos. Publicação pendente.
- [ ] Garantir prosa na Alexa: orientação aplicada em cada envio e histórico tratado como dados; oito testes passaram e pergunta comum respondeu sem rimar, mas Anthropic Revenda ignorou a regra quando solicitada música. Bloqueado: fornecedor precisa respeitar instruções prioritárias; não há garantia de obediência total somente por prompt.
- [x] Janelinha usa Anthropic Revenda com combo claude-sonnet-5, sem fallback ou alteração do Assistente; três testes passaram e envio autenticado respondeu 200 com texto. Publicação pendente.
- [x] Trocar os sete clientes confirmados para Mensal 5x/20x mantendo vencimentos; dados relidos, sete chaves de suporte/revenda preservadas. Novos ilimitados proibidos no catálogo/emissão e retirados dos formulários; 11 testes e painel admin autenticado verificados. Publicação dos painéis pendente; tela de revendedor sem conta de revenda nesta sessão.
- [x] GhostCLI cadastrada na prioridade 6 pelo VPS, pausada e sem modelos inventados; principal preservada. Cabeçalho interno restrito ao VPS na descoberta/testes/entrega; testes passaram.
- [x] Ativação da GhostCLI cancelada pelo pedido de exclusão de Gabriel em 01/11/2026.
- [x] Restringir fpaschoali@gmail.com somente a Claude da FreeModel: seis testes passaram; chave real listou 19 modelos Claude (200) e recusou GPT nos dois protocolos (400). Outros clientes preservados; publicação pendente, painel visual não verificado.
- [x] Modelos dedicados do fpaschoali@gmail.com: painel e dois protocolos usam catálogo FreeModel; chave real confirmou 56 IDs exatos na listagem (200), 15 testes passaram. Sem mudança global; publicação e conferência visual na conta do cliente pendentes.
- [x] Ativar cloud-fable-5.1, cloud-opus-5.1 e cloud-sonnet-5.1 com internal_id openrouter/free e fornecedor OpenRouter; seis verificações SQL passaram e endpoint público confirmou os três aliases sem openrouter/free. Principal e Claude preservados; entrega ponta a ponta com chave cliente não testada.
- [x] Cadastrar OpenRouter ativa na prioridade 5 com openrouter/free e credencial separada; cadastro relido e teste com segredo salvo respondeu 200 em 1s. Principal preservada; modelo registrado inativo para venda, sem substituição automática de Claude.
- [x] Restringir Anthropic Revenda aos combos claude-opus-5, claude-fable-5 e claude-sonnet-5; lista salva/padrão atualizados sem trocar prioridade/ativação. Catálogo real confirmou os três; 19 testes passaram incluindo encaminhamento exato. Teste direto: Fable/Sonnet 200 com Gemini no fallback, Opus excedeu 30s. Filtro futuro depende de publicação; painel autenticado não verificado (sem conta vinculada ao solicitante).
- [x] Filtrar descoberta e listas da Anthropic Revenda para apenas família Claude, preservando nomes reais e os outros fornecedores; publicação pendente.
- [x] Puxar modelos registra automaticamente o catálogo administrativo e abre a lista filtrada por fornecedor; dez testes passaram, ativação e nomes existentes preservados. Publicação pendente.
- [ ] Conferir puxar modelos no painel autenticado (bloqueado: não há conta vinculada ao solicitante para sessão; precisa entrar na prévia).
- [x] Retirar bloqueio por quantidade de IPs das 49 chaves identificadas como geradas por suporte@nextprodev.com.br e futuras; procedência protegida na criação, seis verificações SQL e dez testes passaram, protocolos reais aceitaram a chave (OpenAI 400 de modelo inválido após IP; Messages 200). Demais restrições e histórico preservados.
- [x] Corrigir limite curto do teste de mensagem: seis testes passaram e build OK; painel autenticado confirmou RadoxAI 200 com texto e Anthropic Revenda 200 no modelo claude (retornou Gemini); CodeCraft/Clean seguem 503 reais, prioridade preservada.
- [x] Teste direto em Admin → Fornecedores: escolher conta/modelo e enviar “oi”, mostrando resposta, HTTP e tempo sem reservas nem mudanças de prioridade; quatro testes passaram e envio real autenticado confirmou Anthropic Revenda 200 e RadoxAI 403.
- [x] Dois Felipes reativados por novo pedido de Gabriel, revogando a espera; liberação auditada e quatro verificações SQL passaram, com chaves e limites preservados.
- [x] Felipe e Filipe Caixeta em espera pelo bloqueio de cliente existente nos dois protocolos, com motivo auditado; quatro verificações SQL passaram, chaves e limites preservados. Liberação manual somente após confirmar retorno dos fornecedores antigos.
- [x] Anthropic Revenda prioridade 0 temporária; RadoxAI → CodeCraft → Clean mantidas nas prioridades seguintes. Três verificações SQL passaram e modelo claude respondeu 200 pelo roteador real; modelos versionados não foram remapeados nem ganharam fallback genérico.
- [x] Cadastrar Anthropic Revenda com chave segura e modelo claude exclusivo, após os três existentes; teste direto 200 em 3,17s e pelo roteador real 200 em 4,95s, identificando claude-opus-4-6-thinking. Quatro verificações SQL passaram; prioridade e modelos versionados preservados.
- [x] Remover SubtoAPI e AIPrimeTech e seus modelos exclusivos; registros removidos conferidos, quatro modelos Claude e RadoxAI → CodeCraft → Clean preservados, sem apagar histórico.
- [x] Retornar RadoxAI à primeira prioridade e restaurar os quatro modelos Claude antigos no catálogo, ocultando os níveis SubtoAPI sem excluir cadastros; três verificações SQL passaram e descoberta no site publicado confirmou os quatro nomes. Último teste de entrega RadoxAI ainda retornou manutenção 503.
- [x] SubtoAPI respondeu ao “oi” com 200 em 3,86s; prioridade administrativa SubtoAPI → RadoxAI → CodeCraft → Clean salva. Níveis continuam exclusivos; modelos Claude seguem cadeia compatível, sem correspondência inventada. Publicação pendente.
- [x] Cadastrar SubtoAPI no painel de fornecedores com chave segura e última prioridade; catálogo autenticado confirmou fast/balanced/best. Pausada, sem alterar os fornecedores atuais.
- [x] Disponibilizar fast/balanced/best com roteamento exclusivo SubtoAPI e protocolo Messages, preservando nomes e roteamento dos modelos existentes; 26 testes passaram, lista pública conferida e build OK. Balanced/Best entregaram com/sem streaming na integração real; Fast oscilou (502/falha no streaming). Fluxo completo com chave cliente não verificado, publicação pendente.
- [x] Restaurar cartão Status exatamente à referência por escolha explícita: resumos 24h/7d/30d e 30 barras grandes de monitor, sem listras; indicador de fornecedores preservado. 17 testes passaram, atualização e celular conferidos; publicação pendente. Substitui apresentação somente 24h anterior.
- [x] Preparar instalação NEXA CLOUD na tela inicial: manifest standalone, ícones originais e suporte Apple verificados na prévia; sem cache offline, página mobile sem excesso de largura; publicação pendente e instalação física não testada.
- [ ] Concluir teste real dos alertas: dados web presentes e envio validate_only aprovado. Corrida de primeira ativação corrigida: nove testes passaram, worker activated antes da inscrição e build OK. Navegador automatizado recusa inscrição push; cadastro autenticado e recebimento físico pendem de teste no celular após publicação. Observação de queda exige falhas contínuas reais, nunca falta de tráfego.
- [ ] Enviar alerta para suporte@nexapro.site quando nenhum fornecedor responder por mais de três minutos (bloqueado: configurar domínio de envio; reaproveitar monitor de minuto existente, distinguir falta de tráfego de falhas reais).
- [x] Incluir falhas reais de entrega no histórico de Status, com dias e horas em vermelho; 13 testes passaram, página com registros reais e atualização manual verificada, sem erros; publicação pendente.

- [x] Seleção de base por identidade: Pulse Coding usa apiclaude.site; demais usam apirevenda.site no painel e mensagem padrão, preservando mensagens salvas; seis testes passaram.
- [ ] Verificar a base no painel Pulse Coding: bruebielcasal@gmail.com consta como cliente sem login vinculado e não consta como revendedor; precisa concluir o cadastro e ter revenda liberada.

- [x] Adicionar Pulse Coding e consulta de tokens/mensagens na tela direta dos domínios de API, sem flash da NEXA; abertura direta, chave inválida, limpeza do campo e celular verificados; build OK. Consulta com chave válida não verificada: a conta do solicitante não tem chave vinculada.

- [x] Configurar apiclaude.site como base de revenda e geração, atualizar mensagem padrão e manter apirevenda.site compatível; domínio conectado e DNS verificado. Publicação pendente para aplicar os novos textos e tela exclusiva no domínio novo.

- [x] Em Métricas, "Planos em uso" na coluna larga da esquerda e "Cadastros recentes" abaixo de "Top compradores"; limpeza de imagens sem uso e de prop morto; 10 testes passaram, desktop e celular sem estouro.
- [x] Corrigir períodos em Métricas, reorganizar planos em uso e adicionar coleta consentida de visualizações por dispositivo/país; oito testes passaram, quatro períodos e leitura de visita verificados com administrador. País real depende do cabeçalho geográfico na hospedagem, ainda não verificado após publicação.

- [x] Adicionar edição e ligar/desligar da oferta em Admin → Planos, sincronizada com o site e o PIX; sete testes passaram e página pública sem erros. Prazo anterior preservado, atualmente encerrado.
- [ ] Conferir salvar, ligar/desligar e atualização em outra janela pelo painel real (bloqueado: não há sessão nem conta vinculada ao solicitante; precisa entrar na prévia).

- [x] Criar seção explicativa abaixo de Em tempo real conforme a imagem, mantendo NEXA clara/laranja e compatibilidades reais; desktop, celular sem excesso de largura e tradução conferidos, sem erros.

- [x] Melhorar a legibilidade dos textos em todas as páginas e painéis: tamanhos pequenos, contraste, formulários e legendas dos gráficos; seis páginas públicas conferidas no desktop/celular sem erros ou excesso de largura; quadro 400 × 333 preservado.
- [ ] Conferir visualmente a nitidez nas telas internas autenticadas (bloqueado: solicitante sem conta vinculada para sessão de teste; precisa entrar na prévia).

- [x] Recriar a organização visual da página inicial conforme a referência Vertex, mantendo NEXA clara/laranja e o catálogo, PIX, acesso à conta e instalação atuais; desktop/celular sem erros, planos e formulário PIX verificados, configuração e FAQ funcionando; 7 testes existentes passaram.

- [x] Garantir troca automática em 429 temporário do fornecedor, sem bloquear a chave do cliente; preservar restrições de autenticação, saldo e limites locais. Testes do pedido completo nos dois protocolos e da cadeia de reservas passaram; troca real sob 429 não induzida em produção.

- [x] Restringir a API de geração/gestão da revenda a IPs aprovados pelo administrador; lista vazia recusa acesso, autorização salva/auditada, dois endpoints testados com IP aprovado/recusado e X-Forwarded-For forjado. Histórico de sete dias por chave verificado no painel autenticado, sem limite de 5.000 registros e com exceções preservadas; 11 testes passaram.

- [x] Esperar três segundos e repetir uma vez pedidos com 429 de limite por minuto da Clean; sucesso, limite de tentativas e cancelamento validados em testes (21 passaram).

- [x] Retirar chaves Clean com 401 ou sem saldo da rotação; dez chaves testadas, principal/4/5/9 responderam, seis excluídas; 18 testes e painel autenticado verificados.

- [x] Criar páginas NEXA de Reembolso e Termos, substituir links externos e retirar Extensão do rodapé; navegação verificada.

- [x] Mensagem exclusiva de entrega para jbtoolss7@gmail.com com a chave recém-gerada no painel e na API; teste de exclusividade passou.
- [ ] Validar mensagem após criação real no painel do revendedor (bloqueado: precisa entrar na prévia como revendedor).

- [x] Ativar compra PIX de 25 milhões por R$ 9,90, duração real de 5h25 e encerramento à 00:01 de Brasília; PIX real gerado no teste sem pagamento.

- [x] Planos personalizados privados por revenda: criação, edição, desativação e geração de chaves no painel e na API, preservando o repasse.
- [ ] Validar criação de plano e geração de chave na tela com revenda autenticada (bloqueado: solicitante sem conta vinculada; precisa entrar na prévia como revendedor).

- [x] Criar aba Métricas com indicadores, atividade, conversão, planos, compradores e cadastros reais; visualizações e login sem histórico disponível.
- [x] Criar aba Faturamento com períodos diário, semanal e mensal, receitas e pedidos reais.
- [x] Adicionar cards de repasse por revendedor com chaves vendidas, saldo pago e pendente; preço final da loja não informado.

- [x] Adicionar controle do aviso de instabilidade nas Configurações do administrador.

- [x] Reformular acesso/criação de conta com nome e painel do cliente com chaves, tokens e comandos reais.

- [x] Add a NEXA-themed admin infrastructure page with live service checks and hourly request metrics.
- [x] Merge admin clients and API keys into one functional page styled to match the supplied layout while keeping the NEXA light theme.
- [x] Admin panel (dashboard with charts, clients, keys, plans, models, logs, audit, settings)
- [x] Own API /api/public/v1/chat/completions proxying CodeCraft (key check, block, expiry, token limit, rate limit, model allowlist, streaming, usage logging)
- [x] Customer "Minha chave" shows own key + usage; master key removed from frontend
- [ ] Mercado Pago PIX: auto-create client + key on approved payment (blocked: needs Mercado Pago access token)
- [ ] Automated tests suite
- [ ] Dark mode toggle in admin

- [x] Criar aba Fornecedores abaixo de Modelos, com gestão funcional de contas.

- [x] Criar aba Administração abaixo de Auditoria, com gestão segura de usuários e funções.

- [x] Card de download do instalador do Claude Code abaixo do assistente do OpenCode.
- [x] Barra do celular: botão de conta ao lado de VER PLANOS (ENTRAR quando desconectado, MEU PAINEL quando conectado).
- [x] Nav superior: mesmo botão de conta (ENTRAR / MEU PAINEL) ao lado de VER PLANOS, com rótulos curtos em telas estreitas.
- [x] Trocar os vídeos da página inicial pelo player do YouTube (7DyTxYUXCrw) no topo e em "Veja como funciona".
- [x] Liberar a família Claude: claude-opus-5.5, claude-fable-5.1 e claude-sonnet-5 ativos ao lado do claude-opus-4.8.
- [ ] Definir o texto "Sonnet 5.5 e Haiku 4.5" do site (nomes que a CodeCraft não tem) e os preços por token da CodeCraft para limites dos planos — dono pediu para só falar disso depois.
- [x] Sistema de revenda: admin libera revendedor, painel /revenda (Geral, Chaves, Repasses, API), API própria para gerar chaves, PIX do repasse e bloqueio ao atingir o limite.

- [x] Trocar a logo da NEXA PRO pela marca anexada (símbolo laranja) no site, painel do cliente, barra do admin e favicon.

- [x] Barra de navegação fixa no topo ao rolar o site e o painel do cliente.

## 26/10/2026 — Fallback temporário
- [x] Corrigir teste de mensagem: falha publicada 0 ms reproduzida com administrador e TypeError confirmado em workerd (redirect error não suportado). Alterado para manual com recusa segura de 3xx; sete testes passaram e prévia autenticada respondeu 200 em 23,6s. Build OK; aplicar e verificar no publicado depende de publicação.
- [x] Anthropic Revenda ativa com claude próprio; fixação autenticada no painel atualizou catálogo para claude e mostrou sucesso. Roteador real respondeu 200 por Anthropic Revenda sem RadoxAI; 24 testes e quatro verificações SQL passaram, build OK. Mudanças do botão/roteador pendem de publicação.
- [x] Testar Anthropic Revenda: claude respondeu 200 em 21,64s, retornando nvidia/nemotron-3-ultra-550b-a55b; nomes públicos Opus/Sonnet deram 404. Nomes próprios ag/claude-opus-5-5 e ag/claude-sonnet-5-5 deram 503 com recusa 403 interna. Prioridades preservadas.
- [x] Pedido de reserva versionada substituído às 04:57 UTC pela ativação somente de claude próprio; Opus/Sonnet não foram mascarados.

- [x] DevHub Brasil removida por completo (conta, modelos internos, pausas, código, testes, chaves guardadas); testes grátis seguem a fila comum; histórico de pedidos preservado.
