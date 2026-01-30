# Code Conventions & Plan Alignment

This doc keeps the codebase readable, debuggable, and aligned with the app’s existing plan and future scale.

## Alignment with existing plans and future scale

- **Existing plan:** README describes Phase 1 MVP; the codebase and schema are already **Phase 2** (locations, payments, recurring bookings, SMS/WhatsApp, enhanced branding). DEPLOYMENT.md recommends Prisma Migrations for Phase 2+ and AI Gateway for paid-tier AI (see `docs/AI_GATEWAY_SETUP.md`).
- **AI:** Paid tier = Vercel AI Gateway; free tier = local AI or template. When implementing the Gateway, wire it in **one place** (e.g. a single gateway module or route branch) so the app stays “paid = Gateway, free = local/template” without scattering gateway logic.
- **Scale:** The app is multi-tenant (many businesses). Refactors and indexes should support “many businesses, many bookings” without adding new infra (caches, queues) until needed.
- **Schema:** Use `db:push` or Prisma Migrations per your workflow; for Phase 2+, prefer migrations (see DEPLOYMENT.md). After adding or changing indexes (e.g. `Booking` composite index), run `npm run db:push` or create a migration.
- **CI/build:** Refactors must keep `npm run build` and existing hooks/CI passing (see BUILD_CHECKS.md).

## Conventions

### API routes

- Prefer **linear flow:** validate → load data → compute → respond. Avoid extra “service layer” files unless a route is very long.
- Use **Prisma types** for query/update objects: `Prisma.BookingWhereInput`, `Prisma.BusinessUpdateInput`, etc. No `any` for `where` or `updateData`.
- In catch blocks use `unknown` and narrow (e.g. `error instanceof Error ? error.message : 'Unknown error'`) instead of `error: any`.
- For **hot paths** (e.g. `/api/availability/slots`, booking create), run independent DB calls in parallel and keep queries indexed.

### Frontend (booking flow and similar)

- Prefer **one component per step/screen** with props and callbacks; avoid context or global state for a single flow unless necessary.
- Name handlers by **effect:** e.g. `onServiceSelected`, `onDateSelected`, `onSubmitDetails`, so the flow is easy to follow.
- Keep **error state** in one place and display it in the relevant step so bugs are findable.

### AI routes

- Document the **real path** in a one-line comment (e.g. “Paid: gateway; else: local AI; fallback: template”).
- When Gateway is not implemented, call the working implementation (local AI or template) directly so the route reads linearly.
