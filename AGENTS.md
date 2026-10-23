## MUMSO AI: Lovable Gateway HAIWEZI kutumika bila tokeni (imethibitishwa 2026-10-21)
Msimbo upo: `src/lib/mum-ai.functions.ts` (server fn `askMumAI`), `src/lib/ai-gateway.server.ts` (Lovable Gateway), `src/components/MumAiWidget.tsx`, huonyeshwa kupitia `AiWidgetGate` kwenye `src/routes/__root.tsx`.

- `GET https://ai.gateway.lovable.dev/v1/models` -> **200 BILA tokeni** (modeli 63: `openai/gpt-6-astra`, `google/gemini-3.6-flash`, n.k.). Orodha ni ya umma.
- `POST .../v1/chat/completions` -> **401 kila wakati bila ufunguo halali**: `Missing API key`. Imethibitishwa kwa njia 6 (bila header, header tupu, `Bearer anonymous`, `X-Lovable-AIG-SDK` pekee, key ya uongo, modeli ya bure). **Hakuna njia ya kuzunguka.**
- `LOVABLE_API_KEY` HAIPO kwenye `.env`, `.env.example` (thamani), historia ya git, wala `wrangler.jsonc` vars. Kwenye jukwaa la Lovable huwekwa kiotomatiki; kwenye Cloudflare/Vercel LAZIMA uiongeze mwenyewe.
- `GEMINI_API_KEY` (njia ya akiba + Google Search) pia haipo; `generativelanguage.googleapis.com` hurudisha 403 bila key.
- Kipimo cha moja kwa moja: `POST /_serverFn/e8f533fa95970d9de55abe86d44e53a8aa0cfb0a86b2063cc56929773b23fdc6` -> HTTP 200 + `MUMSO AI haijaunganishwa kwa sasa...`.

**Kizuizi cha pili (muhimu):** `service_status.ai` ni `enabled=false` kwenye DB, kwa hivyo `AiWidgetGate` hurudisha `null` — **widget haionekani kabisa** kwenye tovuti. Menejimenti lazima iwashe "MUM AI" kwenye paneli.

**Kupima server fn ya TanStack kwa curl:** mwili lazima uwe **seroval-encoded**, sio JSON tupu. Itumie:
```
node -e "const{toJSON}=require('seroval');require('fs').writeFileSync('/tmp/b.json',JSON.stringify(toJSON({data:{messages:[{role:'user',content:'hi'}]}})))"
curl -X POST "http://localhost:12000/_serverFn/<ID>" -H 'Content-Type: application/json' --data-binary @/tmp/b.json
```
ID ya `askMumAI` = `e8f533fa95970d9de55abe86d44e53a8aa0cfb0a86b2063cc56929773b23fdc6` (kutoka `.output/server/_ssr/mum-ai.functions-*.mjs`). JSON tupu hurudisha 500 `SerovalDeserializationError`.

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

- Share registered-student lookup across service forms and remember only the selected REG in sessionStorage; re-fetch records on each form to avoid stale personal details.
- Enforce registered-student request details with database INSERT triggers; client-side selections are not a trust boundary.
- Record unique browser IDs per EAT date through a constrained RPC and expose only aggregate visitor counts; never fabricate history or expose visitor identifiers.
- Form-only paths use the root's isolated page layout without navigation, footer or AI.

- Management navigation uses a shared collapsible left rail with controlled vertical tabs so existing CRUD panels retain their state and behavior.
- Request replies are immutable records with department-scoped RLS; private attachments are exposed to applicants only after the existing tracking RPC verifies request access.
- Leader accounts require management approval and a department assignment before panel access; department authorization is enforced in database policies, not UI filters.
- Leader signup and approval run from the browser with the public key (signUp + RLS-guarded inserts by admin), never needing the service key, so it works on any host such as Vercel.
- Every management session opens on the `dashibodi` tab; `ManagementOverview` renders per-role KPIs from rows already loaded by `admin.tsx` — do not add extra queries there for request data.
- `leaders` has no `registration_number`; a leader's own public page is linked by exact `full_name` (ILIKE with `%`/`_` escaped). Approving an application creates that page if it is missing.
- `guard_leader_self_update` must let `auth.uid() IS NULL` through before any role check: the approval path and console/migration writes run as `service_role` with no user JWT, and blocking them breaks leader onboarding. Real `service_role` also has `BYPASSRLS`, so trigger-level checks are the only guard on that path.
- The management shell owns its own chrome (sidebar, header, search); `admin.tsx` page content starts below that header, so new tabs must not re-add a title or KPI strip.
- Design tokens for the dashboard live in `styles.css` under `mgmt-*` and `leader-*` (hero, KPI, panel, bar, action, avatar, chip, signup steps). Reuse them instead of ad-hoc Tailwind for these surfaces.
- `src/routes/admin.tsx` is intentionally left unformatted; running prettier on it produces a large unrelated diff. Format only files you rewrite.
- This repo is not prettier-clean (≈2.5k pre-existing lint errors). Lint only the files you touch and keep the count from increasing.
- Theme colours are frozen: never edit the `:root`/`.dark` colour values in `styles.css`. Modernisation happens through the non-colour layer only — spacing, radii, elevation (`--lift-1/--lift-2`), typography, and layout. Verify with a whitespace-insensitive token diff against `git show HEAD:src/styles.css` (all 98 custom-property values must be identical: none added, removed or changed) before committing UI work.
- Shared modern classes in `styles.css` (`page-shell`, `section-head`, `section-title`, `section-sub`, `eyebrow`, `surface`, `surface-pad`, `surface-hover`, `icon-badge`, `stat-tile`, `empty-state`, `nav-link`, `site-footer`, `footer-heading`, `footer-link`, `brand-strip`) replace the repeated `mx-auto max-w-*/px-4/py-*` and card Tailwind strings. Prefer them for new pages so spacing and elevation stay consistent.

- Announcements are published by the News & Communication ministry (`departments.slug = 'habari'`) only. Other ministries submit via `announcements` with `status = 'pending'` plus an image or PDF; the newsroom edits and publishes. `is_news_ministry(uid)` is the DB authority — never rely on UI filters for this.
- `announcements.published` is derived from `status = 'published'` by the `guard_announcement_workflow` trigger. Public pages still filter on `published = true`; do not reintroduce a second source of truth for visibility.
- A leader submitting an announcement has `author_department_id` and `author_id` forced by the trigger from their own role, so client-sent author fields are not a trust boundary.
- `announcement_date` is the public-facing date shown on cards and detail pages; fall back to `created_at` for rows that predate the column.
- `src/lib/announcements.ts` is the single entry point for reading announcements (`loadAnnouncements`/`loadAnnouncement`). It falls back to the pre-newsroom column set when the migration has not been applied yet, so the public site must keep working while a deploy is in flight.
- Announcement visual classes live under the `news-*` block in `styles.css` (`news-badge` glow/shine, `news-card`, `news-hero`, `news-article`, `news-prose`, `news-attachment`, `news-chip-*`, `link-card`). Reuse them; all are colour-token based and honour `prefers-reduced-motion`.
- The leader workspace lives in `src/components/admin/MinistryWorkspace.tsx` and reads through `src/lib/ministry.ts` only. Every loader there returns an empty result when the table or RPC is missing, so the panel renders before `supabase/migrations/20261021120000_ministry_workspace.sql` is applied. Keep that property: never let a missing table throw.
- A leader's own page is linked by `leaders.user_id`. That column ships in `drizzle/migrations/0006_leader_own_profile.sql`; while it is unapplied, both `linkOwnLeaderPage` and `LeaderProfileEditor` detect the `user_id` column error and fall back to exact `full_name` matching. Do not replace this with client-supplied metadata — the server fn reads the leader's own approved `leader_applications` row, which is the trust boundary.
- Approving a leader runs on the service-role path, so `guard_leader_self_update` must keep letting `auth.uid() IS NULL` through, and both insert/update helpers tolerate the pre-migration column set.
- `git push` to `origin` fails with 403: the `GITHUB_TOKEN` is a GitHub App installation token (`ghu_`, REST `permissions.push: true`) that git-over-HTTPS rejects as "denied to <login>". Commit locally, then tell the user to push or sync from Lovable; do not force-push or rewrite published history.

## Hali halisi ya database (imethibitishwa 2026-10-21 kwa probe ya REST)
**Tumia probe, sio dhana.** Kuna vyanzo vitatu tofauti vya migrasheni (`supabase/migrations/`, `drizzle/migrations/`) na hazitumiki zote kwa pamoja. Njia ya kuamini ni ku-probe REST:

```
GET {SUPABASE_URL}/rest/v1/{table}?select=*&limit=1      -> PGRST205 = jedwali haipo
GET {SUPABASE_URL}/rest/v1/{table}?select={col}&limit=1  -> 42703    = safu haipo
POST {SUPABASE_URL}/rest/v1/rpc/{fn}  {}                 -> PGRST202 = RPC haipo
```

Zilizothibitishwa **ZIMETUMIKA**: `students` (+`latitude`/`longitude`), `daily_visitor_events`, `record_daily_visit`, `daily_visitor_stats`, `request_replies`, `can_manage_request`, `track_request_replies`, `track_lookup`, `track_code_of`, `track_recover_code`, `track_update`, `track_delete`, `has_role`, `user_roles.department_id`, `departments.deadline_at`, `leaders`, `announcements.published`, `loan_requests`, `deaths`, `challenges`, `department_submissions`, `profiles`, `hero_images`, `site_settings`.

Zilizothibitishwa **HAZIJATUMIKA** (3 tu):
- `drizzle/migrations/0006_leader_own_profile.sql` — **muhimu**: `leaders.user_id` + `leaders.department_id` hazipo, kwa hivyo kiongozi aliyeidhinishwa hawezi kuona ukurasa wake; `LeaderProfileEditor`/`linkOwnLeaderPage` huangukia kulinganisha `full_name`.
- `supabase/migrations/20261021090000_announcement_newsroom.sql` — `announcements.status`/`author_department_id`/`announcement_date` hazipo; wizara ya `habari` haipo (kuna `taaluma`, `afya-na-ustawi`, `mahusiano` pekee).
- `supabase/migrations/20261021120000_ministry_workspace.sql` — `ministry_reports`, `internal_messages`, `request_stage_history` hazipo.

Kumbuka: `track_set_code`, `validate_student_registration`, `fill_registered_student_request`, `validate_student_location` ni **trigger** functions — haziitwi kupitia REST, kwa hivyo `PGRST202` juu yao haimaanishi hazipo. Zipo.

- `APPLY_PENDING_MIGRATIONS.sql` (mzizi wa repo) ni migrasheni hizo 3 zikiwa katika muamala mmoja; huendeshwa kwa mkono kwenye Supabase SQL Editor. Ni idempotent na haina `DROP TABLE`/`TRUNCATE`. Ikishatumika, iondolewe kwenye commit ya baadaye.
- Hakuna admin kwenye `user_roles`, na `.env` haina `SUPABASE_SERVICE_ROLE_KEY`, hivyo `/admin` hupeleka `/login`. Trigger `promote_first_user_to_admin` haipo kwenye database hii; admin huundwa kwa mkono (maelekezo yapo mwisho wa `APPLY_PENDING_MIGRATIONS.sql`).

## Mpangilio wa kurasa za fomu
- Kurasa za fomu pekee (`misiba`, `mikopo`, `changamoto`, `huduma.$slug`, `jisajili`, `jisajili-kiongozi`) hutumia `service-form-wrap page-shell page-shell-form|page-shell-compact form-page section-y-sm`. Darasa la `form-page` huweka pengo kwa grid, kwa hiyo **usirudishe `mt-6`/`mt-8`** kwenye `digital-card` au `Countdown` humo.
- `page-shell-form` (48rem) na `page-shell-compact` (42rem) ni vipimo vya upana pekee — hakuna rangi.

## Kuendesha muonekano (preview) wa build ya Cloudflare
- Build ni preset `cloudflare-module`; matokeo yapo `.output/`. `vite preview` **haitafanya kazi** (`ERR_MODULE_NOT_FOUND dist/server/server.js`). Tumia:
  ```
  npx vite build
  setsid nohup npx wrangler --cwd ./.output dev --port 12000 --ip 0.0.0.0 > /tmp/wr.log 2>&1 < /dev/null &
  ```
- `setsid` ni **lazima**: bila hiyo wrangler hufa mara amri ya terminal inapomaliza, na ukurasa wa preview hutoa **502 Bad Gateway** kwa sababu hakuna anayesikiliza kwenye 12000.
- `nohup ... &` peke yake haitoshi kwenye shell hii; pia usiendeshe kama foreground (itakwama kwenye timeout ya 10s).
- Port 12000 ikikaliwa na mchakato wa zamani, wrangler hushindwa kuanza (`Address already in use`). Ua kwa `kill -9` kwa PID za `wrangler`/`workerd`, kisha subiri sekunde 4.
- Kuanza huchukua sekunde ~40 kabla ya `Ready on http://0.0.0.0:12000`; subiri kabla ya ku-probe.

## Kusukuma GitHub: token inayofanya kazi
`GITHUB_TOKEN` ya mazingira (installation token ya GitHub App, `ghu_`, len 40) **haina uwezo wa kuandika**: `POST /git/blobs`, `POST /git/refs`, `POST /user/repos` na `git push` zote hurudisha 403 `Resource not accessible by integration`. Ondoa dhana hiyo.

Kinachofanya kazi: **classic PAT yenye scope `repo`** (`ghp_`, len 40). Thibitisha kwanza kwa `x-oauth-scopes: repo` kwenye `HEAD /user`, kisha:
```
umask 077
printf 'https://x-access-token:%s@github.com\n' "$TOKEN" > /tmp/.gc && chmod 600 /tmp/.gc
git -c credential.helper="store --file=/tmp/.gc" push origin main
rm -f /tmp/.gc
```
- Usiweke token kwenye `git remote set-url` (hubaki kwenye `.git/config`). Tumia `credential.helper` ya muda.
- Fine-grained PAT yenye `Contents: Read and write` pia inafanya kazi; ile yenye `Read` pekee haitoshi.
- `GET /repos/...` hurudisha `permissions.push: true` hata kwa token ya kusoma pekee — **usiamini**. Jaribu `PUT /contents/<faili>` ili kujua ukweli.
- Repo inaunganishwa na Lovable: **kabla ya push, fanya `git fetch` na `git rebase origin/main`**. Lovable husukuma commits mara kwa mara na push itakataliwa. Rebase hutunza historia (usifanye force-push).
## Ku-deploy Cloudflare bila kuingia (imetumika)
```
npx vite build
npx wrangler --cwd ./.output deploy --temporary
```
Hii hupeleka kwenye **temporary preview account** ya Cloudflare na kurudisha URL ya `https://<name>.<adjective>-<noun>.workers.dev`. Ni njia pekee ya ku-deploy kutoka sandbox hii (hakuna `CLOUDFLARE_API_TOKEN`). Angalizo: akaunti hii ni ya muda — si ya mtumiaji, na URL inaweza kuisha. Kwa deploy ya kudumu, mtumiaji aunganishe repo na Cloudflare au Lovable.
