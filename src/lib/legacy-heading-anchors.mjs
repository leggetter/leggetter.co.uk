/**
 * Rehype plugin replicating the site's legacy Jekyll heading-anchor plugin
 * (_plugins/header.rb): every <hN> gets an id slugged with the ORIGINAL
 * algorithm (downcase + whitespace runs -> "-", punctuation preserved) and its
 * content is wrapped in a self-link. Long-standing fragment deep links (e.g.
 * the Realtime Web Technologies Guide TOC) depend on these exact slugs, so do
 * not swap this for rehype-slug/github-slugger.
 */

const HEADINGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

export function legacySlug(text) {
  return text.toLowerCase().replace(/\s+/g, '-');
}

function textContent(node) {
  if (node.type === 'text') return node.value;
  if (!node.children) return '';
  return node.children.map(textContent).join('');
}

function walk(node, fn) {
  fn(node);
  if (node.children) node.children.forEach((child) => walk(child, fn));
}

export function rehypeLegacyHeadingAnchors() {
  return (tree) => {
    walk(tree, (node) => {
      if (node.type !== 'element' || !HEADINGS.has(node.tagName)) return;
      if (node.properties?.id) return;
      const slug = legacySlug(textContent(node).trim());
      if (!slug) return;
      node.properties = { ...node.properties, id: slug };
      node.children = [
        {
          type: 'element',
          tagName: 'a',
          properties: { href: `#${slug}`, className: ['heading-anchor'] },
          children: node.children,
        },
      ];
    });
  };
}
