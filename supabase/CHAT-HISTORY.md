# Chat history

Deploy `setup-chat-history.sql` first, then the static files. The SQL transaction must succeed, including the hourly `luxtime-chat-retention` cron job, before enabling the client script.

The client records new conversations only. Each page instance generates a random conversation ID and a separate append capability. Visitors cannot query transcripts. Only signed-in `profiles.role = 'admin'` users can call the list/detail functions; staff and customers are denied by the database. Never expose service-role keys.

Retention is fixed at 30 days from conversation creation, not extended by messages. Expired conversations disappear from admin queries immediately. An hourly cron job physically removes expired rows (and their messages); provider backups follow the provider's separate retention rules.

Writes are limited to 4,000 characters per message, 120 messages per conversation, and 3,000 messages across the site per UTC day. The global quota bounds stored payload but does not prevent request-traffic abuse or denial of service. Bot messages are client-reported, not independently verified pricing/audit records. No IP address, email, or account identity is collected automatically. Facebook photos remain in Facebook and are not copied here.

Before publishing, verify in an isolated database: anonymous append succeeds, anonymous read and staff/customer RPC reads fail, admin reads succeed, wrong append token fails, repeated message UUID is idempotent, expired conversations reject writes and disappear, and concurrent requests respect caps. Then check the frontend notice and admin list/detail using actual roles. Tests: `node scripts/test-chat-history.mjs`, `node scripts/test-chat-reference.mjs`.

If migration is unavailable, keep the previous deployed photo-only widget. Do not publish a retention promise without the database and scheduled cleanup. AI billing behavior is independent and unchanged by this feature.
