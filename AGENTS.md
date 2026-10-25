## MUMSO AI: inafanya kazi BILA tokeni kupitia Pollinations (imetumika 2026-10-21)
Mnyororo wa njia katika `src/lib/mum-ai.functions.ts` (server fn `askMumAI`):
1. **Lovable Gateway** (`src/lib/ai-gateway.server.ts`, `askLovableAi`) — hutumika tu kama `LOVABLE_API_KEY` ipo.
2. **Gemini moja kwa moja + Google Search** — hutumika tu kama `GEMINI_API_KEY`/`GOOGLE_API_KEY` ipo.
3. **Pollinations** (`askPollinations`, mpya) — **HAIHITAJI UFUNGUO**. Njia ya mwisho, hivyo MUMSO AI hufanya kazi kwenye hosting yoyote.

Pollinations: `POST https://text.pollinations.ai/openai`, `model: "openai"` (huheshimiwa kama `openai-fast`/gpt-oss-20b), `private: true`, hukubali `system` + `messages`. Hurudisha `choices[0].message.content`. **Kikomo cha bure: jibu moja kila sekunde 30 kwa IP** -> `402 FREE_LIMIT`. `askPollinations` hujaribu mara mbili kwa kupumzika sekunde 30, na hurudisha ujumbe wa Kiswahili unaoeleweka kwa mtumiaji.

**Lovable Gateway haiko kwa njia yoyote:** `GET /v1/models` -> 200 bila tokeni (orodha ya umma, modeli 63), lakini `POST /v1/chat/completions` na `/v1/responses` -> **401 `Missing API key`** kila wakati. Imethibitishwa kwa njia 6 (bila header, header tupu, `Bearer anonymous`, `X-Lovable-AIG-SDK` pekee, key ya uongo, modeli ya bure). Hakuna njia ya kuzunguka. DuckDuckGo AI chat -> `418 ERR_BN_LIMIT`.

**Kizuizi cha UI:** `service_status.ai` ni `enabled=false`, kwa hivyo `AiWidgetGate` (`src/routes/__root.tsx`) hurudisha `null` — widget haionekani. Menejimenti iwashe "MUM AI" kwenye `/admin` (`update service_status set enabled=true where key='ai'`). Uandishi wa moja kwa moja kwa REST publishable key hukataliwa na RLS (`PATCH` -> `[]`), kwa hivyo tumia paneli au `SUPABASE_SERVICE_ROLE_KEY`.

**Kupima server fn ya TanStack kwa curl:** mwili LAZIMA uwe **seroval-encoded**, sio JSON tupu:
```
node -e "const{toJSON}=require('seroval');require('fs').writeFileSync('/tmp/b.json',JSON.stringify(toJSON({data:{messages:[{role:'user',content:'hi'}]}})))"
curl -X POST "http://localhost:12000/_serverFn/<ID>" -H 'Content-Type: application/json' --data-binary @/tmp/b.json
```
ID ya `askMumAI` = `e8f533fa95970d9de55abe86d44e53a8aa0cfb0a86b2063cc56929773b23fdc6` (kutoka `.output/server/_ssr/mum-ai.functions-*.mjs`). JSON tupu -> 500 `SerovalDeserializationError`.

**Kuanza upya preview:** kama `Address already in use (0.0.0.0:12000)`, mchakato wa `workerd` wa zamani unakamata port. Tafuta `ps aux | grep [w]orkerd` na `kill -9 <PID>`, kisha `setsid nohup npx wrangler --cwd ./.output dev --port 12000 --ip 0.0.0.0`.

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

## Umiliki wa ukurasa wa kiongozi (imetumika 2026-10-21)
**Dalili:** kiongozi anajisajili na kuidhinishwa, lakini haoni ukurasa wake; maswali kwa `leaders` hurudisha **HTTP 400** (`column leaders.user_id does not exist`).

**Chanzo:** database hai ilikuwa na safu za msingi za `leaders` pekee (`slug`, `published`, `bio`, `short_message`, `email`, `photo_url`) — `user_id` na `department_id` hazikuwepo kwa sababu migrasheni haijatumika. Push kwenda GitHub imezuiwa (403), hivyo Lovable Cloud haipati migrasheni mpya. Angalia `supabase/migrations/20261021110000_leader_page_ownership.sql` na `APPLY_PENDING_MIGRATIONS.sql`.

**Mpangilio wa migrasheni ni wa lazima:** `20261021110000_leader_page_ownership.sql` LAZIMA itumike **kabla ya** `20261021120000_ministry_workspace.sql`, ambayo `is_cabinet()`/`my_position()` hutegemea `leaders.user_id`. Bila hivyo ile ya pili hushindwa na meza zake (`ministry_reports`, `internal_messages`) hukosekana.

**Kiongozi huunda ukurasa wake bila ufunguo wa seva:** `ensureOwnLeaderPage()` (`src/lib/leader-profile.ts`) hurudia RPC `my_leader_application()` kupata jina/cheo/wizara, kisha huingiza mstari kwa RLS. Sera ya INSERT inahitaji `user_id = auth.uid()`, `published = false`, na `department_id` lingane na `user_roles.department_id` ya kiongozi. Trigger `leaders_force_position` hurudia cheo kutoka ombi lililoidhinishwa — hivyo kiongozi hawezi kujipa cheo. Triggers hupitisha service_role kwa `auth.uid() IS NULL`.

**Picha za viongozi:** sera za awali za bucket ya `site-assets` zilikuwa za **admin pekee** (`has_role(...,'admin')`), hivyo kiongozi alishindwa kupakia picha. Sera mpya huruhusu kiongozi kuandika chini ya `leaders/<user_id>/` pekee.

**Uthibitisho:** `mailer_autoconfirm: true` kwenye `GET /auth/v1/settings`, hivyo usajili hufanya kazi bila uthibitisho wa barua pepe. Hakuna `SUPABASE_ACCESS_TOKEN`/DB password kwenye sandbox hii, kwa hivyo migrasheni hupangwa kwa mkono kupitia SQL Editor.

## Kuthibitisha migrasheni kwa Postgres halisi (imetumika 2026-10-21)
Sandbox hii haina `SUPABASE_ACCESS_TOKEN` wala DB password, hivyo huwezi kuendesha migrasheni kwenye database hai. Lakini unaweza kuzithibitisha kwa Postgres 17 ya ndani (`sudo apt-get install -y postgresql`):

1. `initdb -D /tmp/pgdata -U postgres --auth=trust && pg_ctl -D /tmp/pgdata -l /tmp/pg.log -o "-p 55432 -k /tmp" start`
2. Unda database, kisha iga Supabase: roles (`anon`, `authenticated`, `service_role BYPASSRLS`), schema `auth` + `storage`, `auth.users`, na `auth.uid()` inayosoma `current_setting('request.jwt.claim.sub')`. `storage.objects`/`foldername`/`buckets` lazima ziwepo (migrasheni huzitumia).
3. `GRANT USAGE ON SCHEMA auth TO authenticated` — bila hii trigger zilizo `SECURITY DEFINER` hushindwa kwa `permission denied for schema auth` (Supabase halisi ina ruhusa hii tayari).
4. Endesha `supabase/migrations/*.sql` kwa mpangilio, kisha `APPLY_PENDING_MIGRATIONS.sql` **mara mbili** (uthibitisho wa idempotency).
5. Kujaribu RLS: `SET ROLE authenticated; SET request.jwt.claim.sub = '<uuid>';` kisha jaribu INSERT/UPDATE. **Angalizo:** trigger ya "first user becomes admin" humfanya mtumiaji wa kwanza kuwa admin, na admin hupita kinga zote — hivyo ondoa `user_roles` ya admin kabla ya kujaribu mipaka ya kiongozi.

**Kasoro mbili zilizogundulika hivi (na kurekebishwa):** (a) `position` ni neno lililohifadhiwa, kwa hivyo `RETURNS TABLE (position text)` ilifanya `my_leader_application()` isichanganuliwe na migrasheni yote ya umiliki ikashindwa — sasa ni `"position"`; (b) sera nne za announcements zilifuta majina ya zamani lakini zikaunda mapya, hivyo mwendo wa pili ulishindwa. Tumia `python3 -c "from pglast import parse_sql; ..."` kukagua SQL kabla ya ku-commit.

## Trigger za RLS zinahitaji `SECURITY DEFINER` (imetumika 2026-10-21)
**Dalili:** kiongozi aliyeidhinishwa haoni ukurasa wake, na `ensureOwnLeaderPage()` hurudisha `null`. Konsoli huripoti `Hakuna ombi lililoidhinishwa kwa akaunti hii.`

**Chanzo:** trigger `leaders_force_position` (BEFORE INSERT kwenye `leaders`) hurudia `leader_applications` ili kulazimisha cheo. Ilikuwa `SECURITY INVOKER`, hivyo RLS ya `leader_applications` (admin pekee) ilizuia utafutaji — `SELECT` hurudisha tupu ndani ya trigger. Hivyo `approved_position` ilikuwa `NULL` na kiongozi alishindwa kuunda ukurasa wake.

**Suluhisho:** trigger yoyote inayosoma jedwali lenye RLS nyeti **kwa niaba ya mtumiaji** lazima iwe `SECURITY DEFINER` (na `SET search_path = public`). Tumia `SECURITY INVOKER` pale trigger inapaswa kuheshimu RLS ya mtumiaji.

**Kujaribu:** RLS huzuia `SELECT` ya moja kwa moja (0 mistari) lakini RPC ya `SECURITY DEFINER` hurudisha (1 mstari) — tumia tofauti hii kutambua trigger zisizo na `SECURITY DEFINER`.

## Kusukuma GitHub (imetumika 2026-10-21)
`GITHUB_TOKEN` ya mazingira ni installation token (`ghu_`) yenye **metadata=read pekee**: `POST /git/refs`, `POST /contents/...` na `git push` hurudisha **403 `Resource not accessible by integration`**. `GET /repos/...` hurudisha `permissions.push: true` hata hivyo — **usiamini**. Hakuna app installation (`GET /user/installations` → `total_count: 0`).

**Kinachofanya kazi: classic PAT yenye scope `repo`.** Thibitisha kwanza kwa `x-oauth-scopes: repo` kwenye `HEAD /user`, kisha sukuma kwa `credential.helper` ya muda (usiiweke kwenye `git remote set-url`, hubaki kwenye `.git/config`):
```
umask 077
printf 'https://x-access-token:%s@github.com\n' "$PAT" > /tmp/.gc && chmod 600 /tmp/.gc
git -c credential.helper="store --file=/tmp/.gc" push origin main
rm -f /tmp/.gc
```
Repo inaunganishwa na Lovable: **kabla ya push, fanya `git fetch origin main` na hakikisha `git merge-base --is-ancestor origin/main HEAD`** (fast-forward). Lovable husukuma commits mara kwa mara; usifanye force-push wala rebase ya commits zilizosukwa.

## Fomu iliyofungwa ("inakuja hivi karibuni") (imetumika 2026-10-25)
Ukurasa wa onyesho (`/ubunifu`) huonyesha fomu kamili bila kuruhusu uwasilishaji. Njia salama ni tabaka tatu pamoja: `<fieldset disabled>` inayozunguka sehemu zote, kila `Input`/`Textarea` ikiwa `disabled readOnly aria-disabled`, na `Select disabled`. **Muhimu:** usiweke `<form>` wala `onSubmit` kwenye faili — basi hakuna namna ya kuwasilisha hata kwa JS. Uthibitisho: `grep -E "supabase|insert|onSubmit"` kwenye faili la ukurasa lirejeshe tupu, na `<fieldset disabled>` iwe na inputs 0 zisizo `disabled`.

Kinga ya macho (`.inn-lock-veil`) ni `pointer-events: none` na alama yake ni `position: sticky` ili ibaki ionekana kwenye fomu ndefu.

**Angalizo la prettier:** `npx prettier --write` kwenye faili za repo hii huzalisha churn kubwa (mabadiliko yasiyohusiana). Usiendeshe kwa faili nzima; andika msimbo kwa muundo unaotakiwa tangu mwanzo. Kwa JSX ndefu, prettier hutaka `className` ibaki kwenye mstari mmoja na `{t(...)}` iende mstari unaofuata.
