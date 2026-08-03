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
}

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

export const PAGE_SIZE = 10;
