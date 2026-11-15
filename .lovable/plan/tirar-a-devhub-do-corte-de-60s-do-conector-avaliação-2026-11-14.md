# Tirar a DevHub do corte de 60s do conector — avaliação

Nada foi alterado nem publicado. Abaixo, o que conferi de verdade e o que não deu para conferir.

## O que conferi agora
- Hoje a DevHub passa pelo conector (`udc_devhub_brasil`). O repasse pela VPS (`proxy.cloudnexapro.site/v1`) existe no código, mas **nenhum fornecedor ativo usa ele**: a DevHub, a Anthropic Revenda, a Nexxus e a Free AI apontam para os próprios endereços ou para o conector.
- A VPS está no ar: respondeu em 0,58s com 403 sem o código interno, ou seja, ela recusa quem não é o site. O código interno (`NEXA_PROXY_ACCESS_TOKEN`) está salvo.
- Teste direto na DevHub: **não deu para validar**. Todas as tentativas voltaram 401 "chave inválida" em 0,1 a 0,4s:
  - o segredo antigo `DEVHUB_API_KEY` não vale mais (é de antes da troca de chave);
  - `UDC_DEVHUB_BRASIL_API_KEY` é a chave da conexão com o conector, não a chave da DevHub. Por isso não funciona direto, e isso é esperado.
  - A DevHub responde rápido e aceita chamadas diretas de fora, mas só com a chave real.

## A) Chamar a DevHub direto
- **Tempo de espera do servidor:** o servidor do site não corta o tempo de espera de uma resposta da DevHub enquanto o cliente continua conectado. O que conta é o tempo gasto processando, e esperar a rede não entra nessa conta. O limite que já vimos na prática fica na borda, entre o site e o cliente: o 524 em cerca de 100 a 125s **quando nenhum dado chega ao cliente**. Isso não veio de documentação conferida, veio dos 524 que já apareceram nos registros. Então, sem conector, o pedido da DevHub sem stream teria até perto de 100s, e não 60s. Com o keep-alive descrito abaixo, o limite deixa de existir.
- **Segredo:** sim, é possível e seguro. A chave ficaria em Configurações do projeto → Secrets, seria lida só no servidor, nunca iria para o navegador e já entraria no filtro que esconde chaves dos registros. O que falta é você colar a chave **atual** da DevHub. Pode ser substituindo `DEVHUB_API_KEY`, que hoje está vencida.
- **Teste:** feito, mas bloqueado pela chave (veja acima). Com a chave nova eu repito: um pedido pequeno e depois um Opus longo, medindo o tempo.

## B) DevHub pela VPS
- **Hoje:** só existe a regra de segurança no código. O código interno vai somente para o endereço exato `https://proxy.cloudnexapro.site/v1`, e os testes garantem isso. O que a VPS faz por dentro (para onde repassa e quais tempos usa) eu não consigo ver daqui.
- **No projeto:** mudar o endereço da DevHub para a VPS, ou criar uma regra para a DevHub passar por ela, e mandar a chave real da DevHub junto do código interno.
- **Na VPS:** um bloco no nginx repassando para `api.devhubbrasil.com` com `proxy_read_timeout`/`proxy_send_timeout` de 300s ou mais, `proxy_buffering off` e `proxy_ssl_server_name on`. A Cloudflare na frente da VPS, se houver, também corta em cerca de 100s sem dados, então o keep-alive abaixo seria necessário do mesmo jeito.
- **Riscos:** a VPS vira um ponto único de falha (se ela cair, a DevHub cai junto; a Anthropic continua como reserva), a latência sobe uns 50–150ms, aparece mais uma peça para manter e monitorar, e o tráfego e a chave passam pela VPS.

## C) Stream com dados fluindo pelo conector
**Não sei com certeza.** Pelo comportamento comum, cortes desse tipo valem para tempo sem dados, e um stream que manda pedaços sem parar não seria cortado. Mas não tenho documentação nem teste do conector que confirmem. Tem também um detalhe: hoje a gente manda a DevHub **sem stream** de propósito, porque o stream dela quebra no meio de tool_call. Então o corte continua valendo enquanto isso não mudar.

## Recomendação
1. **Caminho A (direto)**, sem VPS: é o mais simples e não cria ponto único de falha.
2. Junto com o A, um **keep-alive**: enquanto a DevHub pensa (sem stream), o site manda ao cliente comentários SSE vazios a cada 15s. Só depois chega a resposta, como já fazemos hoje. Isso evita o 524 da borda em respostas longas. Serve só para pedidos em stream do cliente; pedidos sem stream do cliente ficam com o limite de ~100s.
3. Deixar o conector como alternativa, numa regra para voltar fácil, e manter o Opus começando na Anthropic até o teste longo passar.
4. A VPS só se a DevHub bloquear chamadas vindas do servidor do site.

## O que precisa de você
- Pegar a chave **atual** da DevHub no painel deles e salvar em Secrets (substituir `DEVHUB_API_KEY`).
- Aprovar este plano para eu fazer o teste pequeno e o teste longo do Opus. Só depois disso eu mudo o roteamento.
- Se escolher a VPS: acesso para ajustar o nginx, ou você aplica a configuração que eu passar.

## O que NÃO consegui verificar
- Se a DevHub aceita chamada direta com a chave real (falta a chave), e o tempo de um Opus longo direto.
- O limite exato de espera da hospedagem do site: o número de ~100s vem dos 524 já observados, não de documentação.
- A configuração interna da VPS (nginx, Cloudflare na frente).
- Se o conector corta streams com dados fluindo.

## Detalhes técnicos (para a implementação)
- `src/lib/provider-transport.server.ts`: tirar `https://api.devhubbrasil.com/v1` de `CONNECTOR_BASES`, ou ligar isso por uma flag. O cabeçalho `Authorization: Bearer <DEVHUB_API_KEY>` já vem do fluxo normal de `accountKeys(api_secret_name)`.
- `provider_accounts.api_secret_name` da DevHub: `UDC_DEVHUB_BRASIL_API_KEY` → `DEVHUB_API_KEY` (migração).
- `devhub-stream.ts`: emitir `: keep-alive\n\n` a cada 15s enquanto espera a resposta sem stream.
- Atualizar `provider-transport.test.ts` e o AGENTS.md (a regra dos 60s).
