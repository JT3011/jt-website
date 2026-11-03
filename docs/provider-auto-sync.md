# Provider auto sync

The schedule contains active Calendly bookings only. Cancelled bookings and standalone Hub logs do not appear there; existing session history remains available in Session log. Player locker links and the dashboard preview are removed, and old locker URLs redirect to the portal. The existing navigation styling and animated session controls are preserved.

Calendly's authenticated booking/cancellation webhooks provide immediate updates. A Supabase cron dispatcher runs every minute; shared database leases make Calendly scans due after two minutes and Airtable credit refreshes due after five minutes. The next dispatcher tick runs due work, so these intervals can extend by about a minute. Visible schedules quietly reload every 30 seconds, on focus and when connectivity returns. Hidden tabs and open editing forms pause that browser refresh.

Background Calendly scans cover the last seven days and all future bookings. Opening an older date also refreshes that historical window. Every event page must load successfully before missing bookings are marked cancelled. Unchanged event manifests avoid repeated invitee reads, with a full invitee check every 30 minutes. Newer webhook snapshots take precedence over older scans. Outages preserve the last saved snapshot and show its age. Provider rate limits apply backoff.

Airtable is read-only: complete Players and Payments tables refresh cached credit summaries through the existing reciprocal payment links. The process does not deduct credits or modify Airtable records. It uses the saved encrypted owner connection, or the existing server environment token. Existing coach/player/parent access rules still apply.

## Deployment

Apply `supabase/jt-provider-sync.sql` once. It creates server-only lease/job tables, reconciliation functions and an initially inactive cron job. Deploy the matching `/api/hub-provider-sync` endpoint before enabling the job:

```sql
select cron.alter_job((select jobid from cron.job where jobname='jt-hub-provider-sync'),active:=true);
select private.request_provider_sync();
```

The database creates a random, expiring, single-use job ticket for each invocation and stores only its hash. No permanent service or provider credential is stored in cron SQL or returned to the browser. Jobs and provider state are inaccessible to anonymous/authenticated clients. Inspect job status and `last_success` without reading ticket hashes, connection ciphertext or pg_net request headers. To pause, set the cron job's `active` flag to false; webhooks and on-demand refresh continue.

Validation: `node --test tests/provider-sync.test.mjs tests/calendly-sync.test.mjs tests/coach-calendars.test.mjs tests/hub-portal.test.mjs tests/hub-integrations.test.mjs tests/schedule-row.test.mjs`. Browser fixtures use synthetic bookings. Database reconciliation, lease exclusivity, stale cancellation protection and client access denial were also verified in a rolled-back transaction.
