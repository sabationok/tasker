/** A URL-safe slug; keeps Cyrillic letters (the owner names projects in Ukrainian). */
export function slugify(name: string): string {
  return name.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '') || 'project';
}
