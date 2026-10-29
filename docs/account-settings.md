# Account settings integration

The authenticated portal is a URL-backed single-page application. The server
layout at `app/portal/layout.jsx` authenticates the request, loads the account
once, and provides it to all portal views through `PortalAccountProvider`.
`/portal/settings` is the account settings view; it is not a public preview.

Portal client components should call `usePortalAccount()` rather than receiving
the account through every view's props. Profile and application edits update
the shared in-memory account immediately and roll back optimistic changes when
the request fails.

Portal styles are loaded globally from `app/portal/layout.jsx` and use the
`portal-` class prefix to avoid collisions with site-wide styles.

## Backend contract

The layout configures the provider after the authenticated account has loaded:

```jsx
<PortalAccountProvider initialAccount={initialAccount}>
  {children}
</PortalAccountProvider>
```

`AccountSettings`, the shared portal sidebar, and the other portal views read
this value with `usePortalAccount()`. Settings mutations are sent to the
corresponding API route, which authenticates the request and validates the
submitted credentials server-side.

The backend must derive identity from the authenticated session, enforce access
controls, validate input, and require current credentials for sensitive changes.
Password recovery and email verification callbacks belong to the shared auth flow.

## Registration flow

The shared portal/auth layer must enforce the agreed order:

1. Complete the generic form at `/apply` and persist a pending application securely.
2. Continue to email/password account creation or sign in to an existing account.
3. Associate the pending application with the authenticated account on the backend.
4. Require essays and a resume in the portal to complete registration.

Direct sign-up without a pending application must redirect to `/apply`. These
guards belong to the authenticated application flow, not to the portal client
components.
