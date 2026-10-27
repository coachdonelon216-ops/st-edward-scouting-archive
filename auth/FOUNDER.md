# Initial administrator configuration

The designated founding administrator email is:

`coachdonelon216@gmail.com`

This is configuration documentation only. The account is **not yet provisioned**; provisioning requires a secured PostgreSQL database and a private password setup flow.

## Founder account safeguards
- Assign `administrator` role to the initial account.
- Flag the initial account as `is_founder = TRUE` in the users table.
- Require application-level authorization checks to prevent other administrators from deactivating, deleting, or demoting the founder.
- Ensure a recovery process exists for loss of access. Do not hardcode passwords or authentication tokens.
- Never treat the email address alone as proof of identity: verify ownership before activation.

Do not deploy until the database schema, server-side authorization, login throttling, and report access protections are implemented and tested.
