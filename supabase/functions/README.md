# Kame sync control

The `kame-sync-control` Edge Function lets authenticated REWATCH admins and
staff start the existing GitHub Actions workflow without exposing the GitHub
token in the browser.

Required function secret:

```text
GITHUB_ACTIONS_TOKEN=<fine-grained GitHub token with Actions read/write access>
```

Deploy from the repository root:

```bash
npx supabase login
npx supabase link --project-ref qmvbkmouxesrjcjcjmme
npx supabase secrets set GITHUB_ACTIONS_TOKEN=YOUR_TOKEN
npx supabase functions deploy kame-sync-control
```
