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

## Website chat

`website-chat` answers free-form visitor questions with `gpt-4o-mini` when an
OpenAI API key is configured. The browser only receives the Supabase publishable
key. Without `OPENAI_API_KEY`, the widget still answers common questions locally,
and unknown questions link to Facebook.

Run `supabase/setup-website-chat-quota.sql` in the project SQL editor first.
It caps paid AI calls at 12 per IP hash and 200 total per UTC day. Then set
`OPENAI_API_KEY` and a random `CHAT_HASH_SALT` as Edge Function secrets; neither
value belongs in site files or GitHub. Deploy the function with JWT verification
disabled because the public chat does not require a customer login:

```bash
npx supabase functions deploy website-chat --no-verify-jwt
```

The function accepts requests from `luxtime.vn` only, validates input length,
never saves chat content in Supabase, and sends `store: false` to OpenAI. The
quota is a spending guard, not proof of human identity; keep an API usage limit
on the OpenAI account as well. Adjust facts in the server instructions when
LUXTIME publishes new contact or business policies.
