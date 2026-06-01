/** Flatten Zod-style field errors into one user-visible string. */
export function formatFieldErrors(errors: Record<string, string[] | undefined>): string {
  const messages = Object.values(errors)
    .filter((v): v is string[] => Array.isArray(v) && v.length > 0)
    .flat();
  return messages.length > 0 ? messages.join(" ") : "Could not complete this action.";
}
