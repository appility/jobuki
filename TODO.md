# TODO

1. Move uploads to server-side proxy (most robust for multi-tenant custom domains).
Browser uploads to app endpoint, server uploads to R2.
Then R2 CORS no longer depends on tenant domains at all.

2. ✅ Add candidate dashboard with real submitted applications list.

3. ✅ Add saved jobs for job seeker accounts.

4. Add creator plan-limit UX:
Show upgrade CTA when board limit is reached.

5. Add plan management UI for creator tier upgrades (free/growth/scale).

6. Improve platform admin audit log UX:
Show richer metadata in the activity feed, including changed roles/features.

7. Extend audit logging beyond /admin:
Capture board publish/unpublish and domain-management changes too.

8. Add filters to the admin activity feed:
Filter by actor, action type, and target.

9. Replace more hardcoded permission checks with DB-backed feature checks.

10. Keep Drizzle migration journal ordering stable automatically after generation.

11. Job alerts (email digest) for candidates — phase 2.
    Needs a background job/cron, alert preferences table, and email templates.
    Trigger: new job posted matching candidate's saved categories/location.

12. CV file upload for candidates — phase 2.
    Currently candidates enter a CV URL manually (apply form + profile).
    Switch to direct file upload to R2 (depends on TODO #1 server-side proxy first).