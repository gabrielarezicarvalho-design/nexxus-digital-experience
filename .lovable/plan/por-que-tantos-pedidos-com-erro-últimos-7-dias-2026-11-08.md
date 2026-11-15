# Por que tantos pedidos com erro (últimos 7 dias)

## O que os registros mostram
- **HTTP 502 (~1.839 no período do painel):** quase tudo vem dos próprios fornecedores caindo no meio da resposta ("Network connection lost" e "error code: 502"). Nexxus Pro: ~2.300; DevHub Brasil: ~2.200. A Nexxus parou de gerar 502 às 17:48 de hoje (ela está pausada/sem tráfego). A DevHub continua com 502 até agora, principalmente em claude-opus-5.5. Quando os dois falham juntos, o cliente recebe 502.
- **Fora da taxa (429, ~1.231):** três causas misturadas:
  1. Limite de uso da conta da Nexxus esgotado ("Você atingiu o limite de uso do seu plano"): ~1.400.
  2. Limite por minuto (RPM) do plano do próprio cliente: ~950.
  3. Limite de tokens/diário da chave do cliente: ~650 (457 só hoje, entre 20:32 e 22:09).
- **Extra que não aparece na conta:** 2.320 pedidos recusados com "modelo não permitido" (cliente chamando modelo fora do plano). Isso é cliente configurado errado, não falha.

Ou seja: a maior parte dos erros não é bug do site — é fornecedor instável (502) e limite de cota (Nexxus + limites dos planos dos clientes).

## O que proponho fazer (tu escolhe)
1. **Separar no painel Admin** os erros por causa: "fornecedor caiu", "cota do fornecedor", "limite do cliente" e "modelo não permitido", pra tu ver só o que é problema nosso. Sem apagar nenhum registro.
2. **Repetir uma vez** quando a conexão cai ("Network connection lost") no mesmo fornecedor antes de passar ao próximo, e usar a Anthropic Revenda como última reserva quando DevHub e Nexxus falharem juntos. Não muda a ordem salva dos fornecedores.
3. Não mexer em nada agora, só ficar com o diagnóstico.

## Detalhes técnicos
- Fonte: `request_logs` agrupado por status/provider/erro.
- Item 1: nova classificação na RPC de métricas do admin (status + texto do erro), sem alterar contadores existentes.
- Item 2: em `src/lib/upstream.server.ts`, tratar erro de rede como tentativa única extra no mesmo provider; manter failover de toda resposta não-2xx (regra existente).
