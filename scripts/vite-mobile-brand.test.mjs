import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { mobileBrandPlugin } from './vite-mobile-brand.mjs';

test('consumer and workspace builds retain versioned, valid favicon assets', async () => {
  const source = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const previous = process.env.VITE_MOBILE_APP;
  try {
    for (const variant of ['consumer', 'business']) {
      process.env.VITE_MOBILE_APP = variant;
      const plugin = mobileBrandPlugin();
      plugin.config();
      const html = plugin.transformIndexHtml(source);
      const links = [...html.matchAll(/<link\b[^>]*rel="icon"[^>]*>/g)].map(([tag]) => tag.match(/href="([^"]+)"/)[1]);
      assert.equal(links.length, 4);
      for (const href of links) {
        const url = new URL(href, 'https://example.test');
        assert.ok(url.searchParams.get('v'), `${variant}: ${href} must refresh older browser icons`);
        const bytes = await readFile(new URL(`../public${url.pathname}`, import.meta.url));
        assert.ok(bytes.length > 0);
        if (url.pathname.endsWith('.svg')) {
          assert.match(bytes.toString(), /<svg/);
          assert.equal(url.pathname, variant === 'business' ? '/brand/app-icon-workspace.svg' : '/favicon.svg');
        } else if (url.pathname.endsWith('.png')) {
          assert.equal(bytes.subarray(1, 4).toString(), 'PNG');
          assert.ok(url.pathname.startsWith(variant === 'business' ? '/icons/workspace/' : '/icons/'));
        } else {
          assert.deepEqual([...bytes.subarray(0, 4)], [0, 0, 1, 0]);
        }
      }
    }
  } finally {
    if (previous === undefined) delete process.env.VITE_MOBILE_APP;
    else process.env.VITE_MOBILE_APP = previous;
  }
});
