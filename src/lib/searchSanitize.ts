/**
 * PostgREST `.or()` / `.ilike()` filter strings are parsed as CSV-like tokens.
 * Commas, parentheses, and quotes let a crafted query break out of one column
 * filter into another (filter injection). Strip them and collapse whitespace.
 */
export function sanitizeSearchTerm(input: string): string {
  return input
    .replace(/[,()"'\\*%]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
