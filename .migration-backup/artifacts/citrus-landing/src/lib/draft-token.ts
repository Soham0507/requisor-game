const STORAGE_KEY = "cdh-draft-token";

/** A stable anonymous id for this browser, used to own branding drafts before any account system exists. */
export function getDraftToken(): string {
  let token = localStorage.getItem(STORAGE_KEY);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, token);
  }
  return token;
}
