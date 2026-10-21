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
- Theme colours are frozen: never edit the `:root`/`.dark` colour values in `styles.css`. Modernisation happens through the non-colour layer only — spacing, radii, elevation (`--lift-1/--lift-2`), typography, and layout. Verify with a token diff against `git show HEAD:src/styles.css` (all 51 colour tokens must be byte-identical) before committing UI work.
- Shared modern classes in `styles.css` (`page-shell`, `section-head`, `section-title`, `section-sub`, `eyebrow`, `surface`, `surface-pad`, `surface-hover`, `icon-badge`, `stat-tile`, `empty-state`, `nav-link`, `site-footer`, `footer-heading`, `footer-link`, `brand-strip`) replace the repeated `mx-auto max-w-*/px-4/py-*` and card Tailwind strings. Prefer them for new pages so spacing and elevation stay consistent.
