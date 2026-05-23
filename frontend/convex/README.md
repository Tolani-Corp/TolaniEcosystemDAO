# Convex Backend

This directory stores the Convex schema and functions for the Tolani construction work board.

Run `pnpm exec convex dev` from `frontend/` to configure a Convex deployment and regenerate `convex/_generated/*`.

Set `NEXT_PUBLIC_CONVEX_URL` in `frontend/.env.local` after Convex creates the deployment URL. Without that value, the frontend uses the local in-memory board fallback.
