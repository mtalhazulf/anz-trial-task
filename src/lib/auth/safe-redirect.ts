export function getSafeInternalPath(next: string | null): string {
  if (!next || typeof next !== "string") return "/dashboard";
  const trimmed = next.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return "/dashboard";
  return trimmed;
}
