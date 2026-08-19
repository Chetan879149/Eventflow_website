# Edit plan: Admin can view/edit password hash (bcrypt) for users

## Information gathered
- `server.js` has `adminTableQueries` and `adminEditColumns`.
- Admin edit API is `PATCH /api/admin/records/:table/:id`.
- Currently, `adminEditColumns.users.columns` allows editing only `first_name`, `last_name`, `email`.
- `adminTableQueries.users` selects `id, first_name, last_name, email, createdAt` but not `password_hash`.
- Admin frontend (`admin.js/admin.html`) renders editable fields based on its own `editableFields` mapping. To support password editing, we must update both backend allowed columns and frontend fields.

## Plan (code changes)
### 1) Backend (`server.js`)
- Update `adminTableQueries.users` to include `password_hash` as a column (e.g., `passwordHash`).
- Update `adminEditColumns.users.columns` to include a new request key like `password` mapped to `password_hash`.
- Harden admin password editing:
  - If request contains `password`, treat it as **plaintext password**
  - Hash it with bcrypt (e.g., salt rounds 12)
  - Update `users.password_hash` with the hash.
  - Do NOT allow direct assignment of `password_hash` from the request.
- Result: admin enters a new password; backend stores bcrypt hash.

### 2) Frontend (`admin.js/admin.html`)
- Add `password` field to `editableFields.users` with `type: password`.
- Add `passwordHash` (display-only) column to `tableConfigs.users.columns` and show it.
  - (Optional) mask it in UI.
- Ensure form submission sends `password` in payload; backend will hash.

## Dependent files to edit
- `server.js`
- `admin.js`
- `admin.html`

## Followup steps
- Restart server.
- Open `admin.html`.
- Set table to Users.
- Edit a user’s password by entering a new password (plaintext) and saving.
- Verify user can log in with the new password.

## Notes
- This feature is security-sensitive. It stores hashes only (bcrypt), and admin should not be able to set `password_hash` directly.

