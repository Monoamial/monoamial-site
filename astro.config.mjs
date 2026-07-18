import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// https://astro.build
export default defineConfig({
  site: 'https://monoamial.com',
  integrations: [mdx(), sitemap()],
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
  },
  // Fully static site — deployed to Cloudflare as a Worker with Static
  // Assets (see wrangler.jsonc), so no server adapter is needed here.
});
