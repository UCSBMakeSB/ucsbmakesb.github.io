# Account settings integration

Visit `/portal/settings` to preview Celine's account settings page. It is a public
frontend preview with sample data, not a sign-up page or an authenticated portal.
It does not store passwords or send account updates. Profile edits last only until
the page reloads. Email and password forms validate input but do not change an account.

`components/account-settings.jsx` is independent of the page wrapper so Gautam can
place it within the shared portal frame. Styles are scoped with a CSS module.
The current standalone header and sidebar can be moved into that frame.

## Backend contract

Mount `AccountSettings` after the authenticated account has loaded, passing:

```jsx
<AccountSettings
  account={{ firstName, lastName, email }}
  actions={{ updateProfile, updateEmail, updatePassword }}
/>
```

- `updateProfile({ firstName, lastName })` resolves to the persisted profile fields.
- `updateEmail({ email, currentPassword })` reauthenticates and requests a confirmed
  email change. It resolves when the confirmation email has been requested. The
  current address stays visible until a refreshed authenticated account confirms
  the change. Remount the component after the confirmed account changes.
- `updatePassword({ currentPassword, newPassword })` reauthenticates and updates
  the password. The frontend currently requires at least 12 characters; align this
  with the Supabase password policy.
- All actions reject on failure. The frontend displays a generic retry message.
  Supply all three actions together; never log credentials.

The backend must derive identity from the authenticated session, enforce access
controls, validate input, and require current credentials for sensitive changes.
Password recovery and email verification callbacks belong to the shared auth flow.
No Google provider is required for this page.

## Registration flow

The shared portal/auth layer must enforce the agreed order:

1. Complete the generic form at `/apply` and persist a pending application securely.
2. Continue to email/password account creation or sign in to an existing account.
3. Associate the pending application with the authenticated account on the backend.
4. Require essays and a resume in the portal to complete registration.

Direct sign-up without a pending application must redirect to `/apply`. These
guards are not implemented by this preview. Do not treat sample profile edits as
registration completion or connect this preview from the public apply flow until
the auth and application checks are in place.
