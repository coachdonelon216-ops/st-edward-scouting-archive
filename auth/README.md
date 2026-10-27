# Staff authentication — development only

This branch adds a PostgreSQL schema and a standalone Node.js authentication module; it is **not yet integrated** into server.js and does not protect the live site.

## Setup
1. Install the `pg` dependency (`npm install pg`) in a development environment.
2. Set `DATABASE_URL` through a secret environment variable, never commit credentials.
3. Apply `auth/schema.sql` to the development database.
4. Create the first administrator out-of-band using `passwordHash` and a parameterized INSERT; never publish an initial password.
5. Integrate `handleAuth` before existing routes, and use `currentUser` plus role checks for every report and upload endpoint.
6. Move PDFs out of public/reports and disable direct static access; protecting API endpoints alone does not secure public files.
7. Add login throttling, account invitation/reset workflows, audit logs, CSRF protection for state-changing authenticated routes, and end-to-end tests before deployment.

**Do not merge or deploy this branch until those steps are completed and school approval is obtained.**
