# Plan - Fix "Unauthorized: Invalid session" in Server Functions

The goal is to resolve the `RUNTIME_ERROR` occurring in server functions (specifically `getMyRoles`) where the backend rejects the request with `Unauthorized: Invalid session`. This usually happens because the browser sends a request while the session is still hydrating or just after a refresh, leading to an invalid or missing token being processed by the server middleware.

## Proposed Changes

### 1. Refine `auth-bearer.ts` (Client-side)
- Enhance the `resolveAccessToken` logic to be more resilient during hydration.
- Increase the timeout slightly if needed, but more importantly, ensure it correctly handles the transition from "no session" to "session present" after OAuth redirects.
- Add a check to ensure we don't return an expired token by checking `expires_at`.

### 2. Update `auth-middleware.ts` (Server-side)
- Improve logging in `auth-middleware.ts` to capture *why* `getUser` failed (e.g., specific Supabase error code).
- Ensure the `createSupabaseFetch` helper correctly handles the edge cases of the newer Supabase API keys vs JWTs.

### 3. Verification
- Use Playwright to simulate a fresh load and verify that `getMyRoles` (called by `useCurrentRole`) resolves successfully without throwing 401.

## Technical Details

- **File**: `src/integrations/supabase/auth-bearer.ts`
  - Logic: Wait for `onAuthStateChange` to emit a `SIGNED_IN` or `INITIAL_SESSION` event.
  - Fix: Ensure `supabase.auth.getSession()` is called *after* a small delay if the first attempt returns null, or strictly rely on the event emitter.

- **File**: `src/integrations/supabase/auth-middleware.ts`
  - Logic: `supabase.auth.getUser(token)` is the source of the error.
  - Fix: Add more descriptive error logging.
