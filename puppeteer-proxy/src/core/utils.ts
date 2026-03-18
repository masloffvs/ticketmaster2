export function parseQuery(url: string): Record<string, string> {
  const u = new URL(url, "http://localhost");
  return Object.fromEntries(u.searchParams) as Record<string, string>;
}
