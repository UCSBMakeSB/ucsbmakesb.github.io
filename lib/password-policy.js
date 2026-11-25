export const PASSWORD_REQUIREMENTS =
  "Password must be at least 12 characters and include uppercase, lowercase, a number, and a symbol.";

export function getPasswordError(password) {
  if (password.length < 12) return "Password must be at least 12 characters.";
  if (/[\r\n\u2028\u2029]/.test(password)) return "Password cannot contain line breaks.";
  if (!/[A-Z]/.test(password)) return "Add an uppercase letter to your password.";
  if (!/[a-z]/.test(password)) return "Add a lowercase letter to your password.";
  if (!/\d/.test(password)) return "Add a number to your password.";
  if (!/[^A-Za-z\d]/.test(password)) return "Add a symbol to your password.";
  return null;
}
