<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- DeepSeek retries only quota/credit rejections; shared tests enforce this. Anthropic combo aliases are shared by catalog, global and dedicated routing to keep exact transport IDs consistent while public Claude IDs retain hyphens.
- Upstream: fail over every non-2xx/network error, including 429; only Clean minute 429 retries once after 3s. Local client checks never fail over.
- Routing excludes disabled providers; Claude alternatives follow src/lib/AGENTS.md. keyProvider prioritizes protected key overrides across protocols/listing; comma-separated chains validate every provider and preserve order, siblings and families.
- Store IP allowances and immutable issuers on api_keys; protected triggers derive reseller issuers. key_ip_count applies issuer exemptions and allowances to published protocols without deleting history or weakening generation IP authorization.
- Require an administrator-managed exact-IP allowlist in shared reseller API authentication for generation and management; deny empty/unknown IPs, trust only the hosted edge client-IP header, and persist access outcomes without credentials so copied bearer keys cannot bypass network restrictions.
- Aggregate seven-day client IP activity in role-checked DB functions without truncation, showing each key's allowance.
- Keep reseller plans owner-isolated. Database triggers and shared plan-limits reject new unbounded plans/keys; admin/reseller issuance and plan changes carry daily limits, preserving untouched history and charges.
- Explicit existing-key unlimited exceptions are restricted in the validation trigger to privileged maintenance and exact immutable key/client identity; never relax new issuance or catalog limits.
- Share SitePlans catalog/PIX across home/client; promotions never alter checkout. cc_monthly_* plans are the only approved no-ceiling exception (triggers require duration+allowed_models); keys copy allowed_models/spam_guard, enforced in clientModelNames and both protocols.
- Promotion presentation/dates live in site_promotions; catalog values save atomically via admin-checked RPC, realtime with polling recovery, dates enforced in PIX creation, purchased limits snapshotted so edits never change pending orders.
- Build reseller delivery messages in the shared key-generation helper from stored identity; panel and API receive the same message only after successful creation.
- Both generation API protocols use a shared notice for keys blocked by reseller payment; preserve HTTP 403 and other block reasons so the message never grants access or mislabels IP/token restrictions.
- Legal public routes share LegalPage/scoped homepage-theme CSS; preserve policies and other panels.
- Persist Clean key rotation exclusions in provider_key_usage and enforce them in the shared upstream router; immediately exclude 401/credit rejections and identify credentials only by configuration index so retries avoid known failures without exposing secrets.
- Routing keeps saved priority and approved models; discoveries stay inactive. Failures move last via provider_model_cooldowns. Nexxus hourly 429 or a reached window_token_limit (provider_window_exhausted) pauses the provider until reset; paused providers are excluded. Versioned Claude hops follow saved priority and resolve their own aliases; dedicated chains stay pinned. One log holds sanitized causes. 9Router combos accept any pool response.
- Reseller settlement offers live on resellers.settlement_total_cents/settlement_installments; while an offer is active the reseller stays blocked until the pending balance reaches zero, and PIX charges the smaller of the installment or the remaining balance, so partial payments never release the panel early.
- Homepage tools/guides and approved WhatsApp testimonials are presentation-only; no checkout/API effects. Animations respect reduced motion; chat keeps fixed sizing.
- Keep login's human check presentation-only with elapsed time, input activity, a trap and automation signals, not third-party captcha; permit retries so legitimate customers are never permanently blocked.
- Public Status reads SECURITY DEFINER aggregates only: restored reference history/ranges use monitor probes, labeled separately from model delivery; the live indicator retains provider-down detection. Never expose raw logs or supplier identities.
- Assistant chat lists approved active models across eligible providers with owned-key permissions and deduplicated IDs; shared routing preserves dedicated chains. History uses owner RLS; /api/assistente requires auth/no tools; widget stays separate.
- Admin metrics/details use role-checked RPCs with key/client ownership checks; counters stay lifetime. Active plans mean usable keys issued in-window. Success-rate exceptions use DB client/key identity; raw logs and errors stay preserved.
- Record consented public-page views through a same-origin validated collector with edge country and coarse device class, without IPs, query strings or user identifiers; never fabricate past analytics or equate geolocation with nationality.

- Admin charts use framed ChartBlock/MetricTile tokens.
- Shared client/assistant sidebar; approved IDs/family badges never grant access or change billing. Contrast/hover tokens match light/dark surfaces to keep text visible.
- Resolve reseller API presentation URLs in reseller-domain using the stored reseller identity in the authenticated panel response; keep default delivery URLs and hostname matching shared so account-specific addresses stay consistent without changing credential authorization.
- Serve branded consumption HTML before SSR; key-authorized lookup shares /consumo aggregates, never stores keys. Locale automatically prefers browser language, then edge country, without storing location or language overrides.
- Manifest-only install. Firebase registration is owner-authenticated; await worker activation before subscribing. Show stage-specific push errors via shared sanitized diagnostics. Minute health alerts deduplicate continuous delivery failures, never idle traffic.
- Admin inference: one bounded request, sanitized output/exhaustion; no retries/counter changes. VPS auth: exact HTTPS base for discovery/test/delivery; fail closed without token; no redirects.
- Invision, Lauren and Nexxus Pro use exact-base connectors for discovery/tests/delivery with scoped redacted credentials. Nexxus maps its root base to the connector's v1 path. Invision lists only available shared aliases; Lauren stays dedicated, outside global reserves.
- Combos (admin): free names; a name of another vendor (Claude/GPT/Gemini) requires every item to be that family from a real supplier (never Anthropic Revenda/Free.ai for Claude). Routing finds combos by exact name before other rules (Gabriel, 16/11/2026).
- Nexaclean (nexaclean-rapido/pro/plus/ultra/play/max) is the Nexa brand for the Free.ai open model (Qwen3-30B-A3B, upstream qwen-coder): routed only to Free.ai, which is dedicated_only so it never joins the common Claude line, and never used as a substitute for another requested model (Gabriel, 16/11/2026).
- Responses uses the shared Chat Completions handler via a protocol adapter; keep the adapter-free path unchanged so authentication, routing, accounting and existing wire formats cannot diverge. Pure conversion and SSE state live separately from server IO for isolated tests.
- API instructions use per-key clientKeyModelNames; apiModelList deduplicates punctuation only. astra-alias shares transparent labels and pinned routing; dedicated chains stay enforced. Catalog excludes anon.
- Token top-ups use authenticated explicit key ownership and catalog snapshots; verified PIX fulfillment and per-key admin grants share a locked idempotent database credit ledger, preserving the existing key, usage, expiry, family and security blocks.
- Client auth events preserve unknown state; server auth authoritative. Dashboard retries disabled; logs RLS caches identity with owner indexes.
- Admin access/actions verify roles; RLS/RPCs enforce them. claim_admin never grants. Fail closed, recheck identity, clear caches on logout. Before panel rendering, append entrances via admin-only RPC with DB identity/time and retry deduplication; history is admin-only and paginated.
- Usage uses owner-RLS key aggregates and stored tariffs; one adaptive factor preserves input/output ratios and spent plus balance equals the plan. Keep a cent until exhaustion; never alter billing. Savings compares base and adjusted tariffs on the same key's consumed tokens, displaying the full subscription separately to avoid comparing partial usage with the entire prepaid package; unknown stays unknown. Modelos keeps global IDs and per-key prices, separate from generation.
