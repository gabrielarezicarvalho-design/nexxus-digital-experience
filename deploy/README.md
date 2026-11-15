# NEXA na VPS: guia de instalação

O site e o gateway rodam num container (`nexa`). O banco roda num Supabase próprio, na mesma VPS. O nginx fica na frente, e a Cloudflare na frente do nginx.

```
Cliente → Cloudflare → nginx (VPS) → nexa:3000 ──rede interna──→ Supabase (kong:8000 → Postgres)
                                          └──→ fornecedores (DevHub, Anthropic, Nexxus…)
```

## Fase 1: Supabase próprio

```bash
cd ~ && git clone --depth 1 https://github.com/supabase/supabase
cp -r supabase/docker ~/supabase-docker && cd ~/supabase-docker
cp .env.example .env
```

No `.env` do Supabase, troque **todas** as senhas e chaves de exemplo. Siga o guia oficial: https://supabase.com/docs/guides/self-hosting/docker

- `POSTGRES_PASSWORD`, `JWT_SECRET`, `ANON_KEY`, `SERVICE_ROLE_KEY`, `DASHBOARD_PASSWORD`
- `SITE_URL=https://cloudnexapro.site`
- `API_EXTERNAL_URL=https://db.cloudnexapro.site`
- `SUPABASE_PUBLIC_URL=https://db.cloudnexapro.site`
- SMTP: configure, porque é por ele que sai o e-mail de "esqueci a senha"

No `docker-compose.yml` do Supabase, troque as portas publicadas do Kong por `127.0.0.1:8000:8000` e `127.0.0.1:8443:8443`. Assim ele só aceita conexões pelo nginx.

```bash
docker compose up -d
```

## Fase 2: o app NEXA

```bash
cd ~ && git clone -b vps https://github.com/gabrielarezicarvalho-design/nexxus-digital-experience nexa
cd nexa/deploy
cp .env.example .env && nano .env      # preencher
chmod 600 .env
docker compose up -d --build
docker logs --tail 50 nexa
```

## Fase 3: nginx e Cloudflare

1. Na Cloudflare, crie os registros A `cloudnexapro.site`, `www` e `db` apontando para o IP da VPS, todos com a nuvem laranja ligada.
2. Em SSL/TLS, ative o modo **Full (strict)**. Depois, em **Origin Server**, gere o certificado e salve os dois arquivos em `/etc/ssl/cloudflare/origin.pem` e `/etc/ssl/cloudflare/origin.key`.
3. Copie `nginx-nexa.conf` para `/etc/nginx/sites-available/nexa`, ative o site e rode `nginx -t && systemctl reload nginx`.

O nginx sempre sobrescreve o cabeçalho `CF-Connecting-IP` com o IP real. Isso impede que alguém forje o IP para burlar a trava de IP das keys.

**Limite de 100s da Cloudflare:** um pedido **sem stream** que fique mais de 100s sem mandar nenhum dado é cortado pela Cloudflare, com erro 524. Se isso incomodar, crie um `api.cloudnexapro.site` com a **nuvem cinza** e certificado Let's Encrypt (`certbot --nginx`), e entregue esse endereço como base URL. A trava de IP continua funcionando, porque o nginx usa o IP de quem se conectou direto.

## Fase 4: troca (dia da migração)

Isso é feito junto com o Claude:
1. Copiar o banco inteiro do site atual para o Supabase da VPS: tabelas, usuários com as senhas, saldos e histórico.
2. Cadastrar as keys reais dos fornecedores no `.env`, nas variáveis `UDC_*`.
3. Testar com uma key de teste: `/v1/models`, `/v1/messages` e `/v1/chat/completions`.
4. Na Cloudflare, mudar o `cloudnexapro.site` para o IP da VPS.

## Atualizar depois

```bash
cd ~/nexa && git pull && cd deploy && docker compose up -d --build
```
