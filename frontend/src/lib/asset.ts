// Resolves paths in `public/` against Vite's configured base so images work
// both under the dev server (base "/") and the Django-served build (base
// "/static/react/", see vite.config.ts).
export function asset(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
}
