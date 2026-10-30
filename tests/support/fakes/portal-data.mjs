// Fake of lib/portal-data.js: the routes only call revalidatePortalAccount.
import { db } from "./db.mjs";

export function revalidatePortalAccount(userId) {
  db.revalidated.push(userId);
}
