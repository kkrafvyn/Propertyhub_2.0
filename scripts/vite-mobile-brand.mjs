/**
 * Vite plugin: inject consumer vs workspace branding at build time via VITE_MOBILE_APP.
 */

const BRANDS = {
  consumer: {
    appName: 'BaytMiftah',
    manifest: '/manifest.webmanifest',
    themeColor: '#0F2922',
    themeLight: '#fcfbf9',
    themeDark: '#081713',
  },
  business: {
    appName: 'BaytMiftah Workspace',
    manifest: '/manifest.workspace.webmanifest',
    themeColor: '#0B2545',
    themeLight: '#0B2545',
    themeDark: '#071528',
  },
};

export function mobileBrandPlugin() {
  let brand = BRANDS.consumer;

  return {
    name: 'baytmiftah-mobile-brand',
    config() {
      const variant = process.env.VITE_MOBILE_APP || process.env.MOBILE_APP || 'consumer';
      brand = BRANDS[variant] || BRANDS.consumer;
    },
    transformIndexHtml(html) {
      let next = html
        .replace(
          /<meta name="theme-color" content="[^"]*" \/>/,
          `<meta name="theme-color" content="${brand.themeColor}" />`,
        )
        .replace(
          /<meta name="application-name" content="[^"]*" \/>/,
          `<meta name="application-name" content="${brand.appName}" />`,
        )
        .replace(
          /<meta name="apple-mobile-web-app-title" content="[^"]*" \/>/,
          `<meta name="apple-mobile-web-app-title" content="${brand.appName}" />`,
        )
        .replace(/href="\/manifest\.webmanifest"/, `href="${brand.manifest}"`)
        .replace(/href="\/favicon\.svg"/, brand === BRANDS.business ? 'href="/brand/app-icon-workspace.svg"' : 'href="/favicon.svg"')
        .replace(/href="\/icons\//g, brand === BRANDS.business ? 'href="/icons/workspace/' : 'href="/icons/')
        .replace(/<title>[^<]*<\/title>/, `<title>${brand.appName}</title>`);

      next = next.replace(
        /var meta = document\.querySelector\('meta\[name="theme-color"\]'\);\s*if \(meta\) \{\s*meta\.setAttribute\('content', isDark \? '[^']*' : '[^']*'\);\s*\}/,
        `var meta = document.querySelector('meta[name="theme-color"]');
            if (meta) {
              meta.setAttribute('content', isDark ? '${brand.themeDark}' : '${brand.themeLight}');
            }`,
      );

      return next;
    },
  };
}
