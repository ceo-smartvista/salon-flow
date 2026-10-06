# Private Demo Login

## Goal
Add one-click demo access and visible demo credentials. Every demo entry gets a fresh, private sample salon, so visitors cannot see or overwrite each other’s activity and earlier demo changes do not carry into a new visit.

## What will be built
- Add a **Try demo** action to sign-in. Starting a demo creates a unique, temporary login and a separate sample salon, signs the visitor in, and shows the generated email and password for optional manual sign-in.
- Seed that salon with realistic example services, staff, clients, appointments, sales, and inventory so the dashboard and key workflows have useful content.
- Make business records belong to a salon and enforce that boundary in database access rules and the app’s reads/writes. Preserve existing salon records during migration; do not reset or delete them as part of demo setup.
- Expire temporary demo access and clean up expired demo accounts and their salon records through trusted backend logic. Demo cleanup must never delete a regular salon or account.
- Verify the sign-in, demo creation, private data boundary, reset-on-new-entry behavior, and normal salon sign-in remain intact.

## Implementation stages
1. Establish salon ownership for business records and update data access rules, application queries, and write paths to respect it, including public booking access.
2. Add a protected backend flow that creates a fresh temporary demo login, its salon, and sample records; add safe expiry and cleanup.
3. Add the one-click demo action and display the generated credentials on the sign-in screen.
4. Validate with two separate demo sessions and a regular salon account, confirming isolation and that each new demo starts with clean sample data.

## Technical details
- Current business tables and app queries are not scoped to a salon; current access policies permit broad authenticated access. A shared demo login with data reset would therefore be unsafe.
- Use a server-controlled demo marker and generated credentials; do not embed a shared password or privileged key in the browser.
- Add salon ownership fields and tenant-scoped row-level access policies, backfilling existing records without deleting them. A trusted backend function will provision demo accounts, seed sample data, and remove only expired demo-owned data.
- Update database-generated types and record the tenancy rule in the project’s architecture notes.
