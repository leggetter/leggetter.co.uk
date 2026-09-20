/**
 * Where a game lives, as a URL.
 *
 * `/deadball/?g=<id>` rather than the `/deadball/g/<id>` the plan sketched.
 * This site deploys as **static assets and nothing else** - `wrangler.jsonc`
 * has no `main`, no bindings and no runtime - so a path segment that is not a
 * file cannot resolve without putting a server in front of the blog, which is
 * the one thing the architecture note argues hardest against.
 *
 * A query string costs a prettier link and buys keeping the site a pile of
 * files. When the Worker exists it can own a tidier route; until then this is
 * the honest shape.
 */

/** The parameter a room id arrives in. */
export const ROOM_PARAM = 'g';

/** The link to send somebody, from wherever the page is being served. */
export function linkTo(id: string, here: URL): string {
  const url = new URL(here.toString());
  url.hash = '';
  url.search = '';
  url.searchParams.set(ROOM_PARAM, id);
  return url.toString();
}

/**
 * The room this page was opened for, if any.
 *
 * Validated rather than trusted: it goes into a channel name and onto a
 * screen, and it arrives from an address bar anybody can type into.
 */
export function roomFrom(here: URL): string | null {
  const raw = here.searchParams.get(ROOM_PARAM);
  if (!raw) return null;
  const id = raw.trim().toUpperCase();
  return /^[0-9A-HJKMNP-TV-Z]{8}$/.test(id) ? id : null;
}

/** Take the room out of the address bar without reloading the page. */
export function forgetRoom(here: Location, history: History): void {
  const url = new URL(here.href);
  url.searchParams.delete(ROOM_PARAM);
  history.replaceState(null, '', url.toString());
}
