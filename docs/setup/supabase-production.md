# Supabase Production Setup

Database migrations are automatically applied via Supabase Git Integration on PR creation/merge. However, several settings **must be manually configured** in the [Supabase Dashboard](https://supabase.com/dashboard) for production.

## 1. Custom Access Token Hook (required for admin access)

The `custom_access_token_hook` function injects `site_roles` into the JWT. The migration creates the function and grants permissions, but the hook itself must be **activated in the dashboard**.

1. Go to **Authentication > Hooks**
2. Enable the **Custom Access Token** hook
3. Select the `public.custom_access_token_hook` function

Without this, the JWT will never contain `site_roles`, and `/admin` routes will always show "forbidden" — even if `user_roles` are correctly assigned in the database. After enabling the hook, existing users must **sign out and sign back in** to get a new JWT with the updated claims.

## 2. Edge Function Secrets

The `[edge_runtime.secrets]` in `config.toml` only apply to local Supabase. Production secrets must be set via **Dashboard > Edge Functions > Secrets** (or `supabase secrets set`):

| Secret               | Description                            | Example                   |
| -------------------- | -------------------------------------- | ------------------------- |
| `PDS_HOST`           | Production PDS URL                     | `https://pds.trainers.gg` |
| `PDS_ADMIN_PASSWORD` | PDS admin password                     | _(from Fly.io secrets)_   |
| `PDS_HANDLE_DOMAIN`  | Domain for user handles                | `trainers.gg`             |
| `RESEND_API_KEY`     | Resend API key for transactional email | `re_...`                  |

## 3. OAuth Providers

Discord and GitHub are configured in `config.toml` for local dev only. In production, configure each provider in **Dashboard > Authentication > Providers**:

- **Discord**: Set production client ID, secret, and redirect URL
- **GitHub**: Set production client ID, secret, and redirect URL
- Add the production site URL and any preview deployment URLs to the **Redirect URLs** allowlist

## 4. Storage Bucket: `pds-blobs`

The `pds-blobs` bucket is defined in `config.toml` for local dev but does not get created by migrations. Create it manually in **Dashboard > Storage**:

- **Name**: `pds-blobs`
- **Public**: No
- **File size limit**: 50 MiB
- **Allowed MIME types**: `image/*`, `video/*`

## 5. Auth Settings

Verify these under **Dashboard > Authentication > URL Configuration**:

- **Site URL**: Set to the production URL (e.g., `https://trainers.gg`)
- **Redirect URLs**: Add production URLs and Vercel preview deployment patterns (e.g., `https://*.vercel.app/**`)
