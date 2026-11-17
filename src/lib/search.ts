// The name search shared by the file lists (Server status 1070, Upload 1090): a file matches
// when its name contains the query, ignoring case and spaces around the query.

/** True when `name` contains `query` (case-insensitive, trimmed); a blank query matches all. */
export function matchesName(name: string, query: string): boolean {
  return name.toLowerCase().includes(query.trim().toLowerCase());
}
