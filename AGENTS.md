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
