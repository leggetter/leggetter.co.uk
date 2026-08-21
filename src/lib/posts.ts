import { getCollection, type CollectionEntry } from 'astro:content';
import {
  excerptOf,
  originalSourceHost,
  postDate,
  postPath,
  postSlug,
} from './urls.mjs';

export interface BlogPost {
  entry: CollectionEntry<'blog'>;
  slug: string;
  url: string;
  date: Date;
  excerpt: string;
  /** Set for old "link posts": where the article was originally published. */
  originalUrl: string | null;
  originalHost: string | null;
  draft: boolean;
}

/**
 * Every post, drafts included, newest first. Use this only where a draft is
 * meant to be reachable: the post page itself (`/blog/{slug}/`), so a draft
 * can be read on the Cloudflare preview URL. Everything that *lists* posts
 * wants `getListedPosts()`.
 */
export async function getSortedPosts(): Promise<BlogPost[]> {
  const entries = await getCollection('blog');
  const posts = entries.map((entry): BlogPost => {
    const permalink = entry.data.permalink;
    const external = permalink && /^https?:\/\//.test(permalink);
    return {
      entry,
      slug: postSlug(entry.id),
      url: postPath(entry.id),
      date: postDate(entry.id, entry.data.date),
      excerpt: excerptOf(entry.data.excerpt, entry.body ?? ''),
      originalUrl: external ? permalink : null,
      originalHost: external ? originalSourceHost(permalink) : null,
      draft: entry.data.draft ?? false,
    };
  });
  posts.sort((a, b) => b.date.valueOf() - a.date.valueOf());

  const seen = new Map<string, string>();
  for (const post of posts) {
    const dup = seen.get(post.slug);
    if (dup) throw new Error(`Duplicate blog slug "${post.slug}" (${dup} and ${post.entry.id})`);
    seen.set(post.slug, post.entry.id);
  }
  return posts;
}

/** Published posts only: listings, pagination, the feed and the sitemap. */
export async function getListedPosts(): Promise<BlogPost[]> {
  return (await getSortedPosts()).filter((post) => !post.draft);
}

export const PAGE_SIZE = 10;
