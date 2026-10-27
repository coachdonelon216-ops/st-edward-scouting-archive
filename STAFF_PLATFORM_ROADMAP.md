# Staff Scouting Platform — Security and Cloud Migration Plan

## Current state (do not treat as private)
- GitHub repository and historical scouting PDFs are public.
- PDF upload is unauthenticated; the Render server uses a GitHub token to commit uploads.
- Scouting notes currently save only in each browser's localStorage.
- Game film references and game-day packet printing are client-side features, not shared cloud storage.
- Render web service is on a free instance; no Render Postgres database exists.

## Phase 1 — Access control and storage (must precede sensitive data)
1. Select a staff identity provider (prefer Google Workspace OAuth restricted to approved school accounts, with administrator-approved allowlist).
2. Provision a managed database (Postgres) and secure session storage. Define roles: administrator, coach, read-only.
3. Make the scouting PDF repository private **only after** moving public-facing report delivery to authenticated server-side routes or private object storage. Otherwise existing links break.
4. Require authenticated staff sessions and role checks on every notes, uploads, reports, and film API endpoint. Remove unauthenticated uploads. Enforce CSRF protections, secure cookies, rate limits, input validation, audit logs.
5. Store PDFs in private object storage and notes/film metadata in database. Keep GitHub for website code only. Back up data and test restores.

## Phase 2 — Shared notes and assignments
- Database records: users, opponents, scouting assignments, notes, players, film references, revisions.
- Each assignment has opponent, season, assignment date, author, updated time, and visibility.
- Import existing local browser notes from exported JSON backups, with deduplication.
- Implement conflict-safe edits, revision history, and role-based collaboration.

## Phase 3 — Staff game-day packet
- Server-side PDF generation after authentication, including player profiles, last-five-game summaries, tendencies, keys, and linked film references.
- Printable packet currently works client-side from the Notes editor; no shared storage required.

## Phase 4 — Film library
- Start with authorized external video URLs, titles, dates, timestamps and scouting comments.
- Respect external video platform permissions; do not download or redistribute restricted film.
- Attach film links to opponent, assignment, and player records once authenticated database is in place.

## Migration rules
- Preserve all historical reports and report metadata.
- Make verified backups before changing repository visibility or storage.
- Never commit tokens, passwords, session secrets, or private player information to GitHub.
- Require administrator approval before enabling any paid database/storage resources.
