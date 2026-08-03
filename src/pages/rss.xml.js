import rss from '@astrojs/rss';
import MarkdownIt from 'markdown-it';
import { getSortedPosts } from '../lib/posts';
import { SITE_TITLE } from '../lib/site.mjs';

// Parity with the old hand-rolled Jekyll feed: every post, full content.
// Old posts are WordPress-imported raw HTML, which markdown-it passes through.
const md = new MarkdownIt({ html: true, linkify: false });

export async function GET(context) {
  const posts = await getSortedPosts();
  return rss({
    title: SITE_TITLE,
    description: "Phil Leggetter's Blog Posts",
    site: context.site,
    trailingSlash: false,
    items: posts.map((post) => ({
      title: post.entry.data.title,
      link: post.url,
      pubDate: post.date,
      content: md.render(post.entry.body ?? ''),
      author: 'phil@leggetter.co.uk (Phil Leggetter)',
    })),
  });
}
