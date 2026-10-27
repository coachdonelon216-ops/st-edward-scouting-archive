# Authentication release checklist

This development branch is NOT ready to merge or deploy.

- [x] Add initial session-based authentication module and login page.
- [x] Add route-level authorization checks to server.js.
- [x] Add PostgreSQL dependency to package.json.
- [x] Document founding administrator and pending coaches.
- [ ] Upload the actual 2026–27 schedule image to public/schedule-2026-27.png.
- [ ] Provision PostgreSQL, run schema and founder-protection migration.
- [ ] Build secure email ownership verification and account activation (no accounts currently exist).
- [ ] Add login throttling and robust CSRF protection for state-changing routes.
- [ ] Confirm secure production cookie, TLS, database certificate settings, and proxy behavior.
- [ ] Test successful/failed login, logout, session expiry, all report routes, upload permissions, and static file traversal.
- [ ] Migrate reports from GitHub to dedicated private storage; ensure no report is publicly accessible via Render or GitHub URLs.
- [ ] Audit previously exposed documents and credentials and rotate any exposed secrets.
- [ ] Verify that Render can build and deploy from the now-private repository.
- [ ] Confirm backups and recovery before rollout.

**Live service remains unchanged on main.** Do not merge this branch until every remaining item is completed and independently tested.
