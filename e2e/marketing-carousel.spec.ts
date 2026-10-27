import { DEFAULT_MARKETING_DOCUMENT } from '../src/lib/marketing-page-document';
﻿import { test, expect } from '@playwright/test';

async function open(page: import('@playwright/test').Page) {
  await page.goto('/', {waitUntil:'domcontentloaded'});
  await expect(page.getByRole('heading',{level:1})).toHaveText('Every property.One clear picture.', {timeout:30000});
}
for (const width of [1440, 768, 390]) {
  test(`hero and preserved content at ${width}px`, async ({page}) => {
    await page.setViewportSize({width,height:width === 390 ? 844 : 900}); await open(page);
    await expect(page.locator('.mk-photo-hero img')).toHaveCount(5);
    await expect.poll(() => page.locator('.mk-photo-hero img').evaluateAll(imgs => imgs.every(img => (img as HTMLImageElement).naturalWidth > 0))).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.locator('canvas')).toHaveCount(0);
    const hero=page.locator('.mk-photo-hero');
    await expect(hero.getByRole('link',{name:'Get Started'})).toHaveAttribute('href',/\/signup$/);
    await expect(hero.getByRole('link',{name:'Explore the Platform'})).toHaveAttribute('href','#product-tour');
    await expect(page.locator('header .mk-nav-login')).toHaveAttribute('href',/\/login$/);
    await page.evaluate(() => window.scrollTo(0, 0));
    const title=await hero.locator('h1').boundingBox();
    for(let i=0;i<5;i++) {
      const dot=hero.getByRole('button',{name:new RegExp(`Show background ${i+1}:`)});
      await dot.click();
      await expect(dot).toHaveAttribute('aria-current','true',{timeout:15000});
      const next=await hero.locator('h1').boundingBox();
      expect(next?.width).toBeCloseTo(title!.width, 0);
      expect(next?.height).toBeCloseTo(title!.height, 0);
      if(width===390) expect(await hero.locator('.is-active img').evaluate((img: HTMLImageElement)=>img.currentSrc)).toContain('-mobile.webp');
    }
    await page.getByRole('button',{name:/Show background 1:/}).click();
    await page.waitForTimeout(850);
    if(width===390) {
      const banner=page.getByRole('dialog',{name:'Cookie preferences'});
      await expect(banner).toBeVisible();
      const bannerBox=await banner.boundingBox(); const controlsBox=await hero.locator('.mk-photo-controls').boundingBox();
      expect(controlsBox!.y+controlsBox!.height).toBeLessThanOrEqual(bannerBox!.y);
    }
    await page.screenshot({path:`test-results/marketing-${width}.png`});
    await hero.getByRole('link',{name:'Explore the Platform'}).click();
    await expect(page.getByRole('region',{name:'Product tour',exact:true})).toBeInViewport();
    await page.getByRole('tab',{name:'Payments',exact:true}).click(); await expect(page.locator('#tour-panel-payments')).toBeVisible();
    await page.getByRole('button',{name:'Finance',exact:true}).click(); await expect(page.locator('#teams')).toContainText('Know where the money stands');
    for(const id of ['workflow','residents','getting-started','integrations','trust','pricing','ai']) await expect(page.locator(`#${id}`)).toBeAttached();
    await expect(page.locator('.mk-ed-ai-grid')).toBeAttached(); await expect(page.locator('.mk-ed-details')).toHaveCount(6);
    for(const href of await page.locator('header nav a[href^="#"]').evaluateAll(links => links.map(link => link.getAttribute('href')!))) await expect(page.locator(href)).toBeAttached();
  });
}

test('keyboard focus, pause/play, automatic rotation and reduced motion',async({page})=>{
  await open(page); await expect(page.locator('.mk-photo-hero img')).toHaveCount(5);
  await page.clock.install();
  const first=page.getByRole('button',{name:/Show background 1:/});
  await page.getByRole('button',{name:'Next background image'}).focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('button',{name:/Show background 2:/})).toHaveAttribute('aria-current','true');
  await page.clock.fastForward(14000); await expect(page.getByRole('button',{name:/Show background 2:/})).toHaveAttribute('aria-current','true');
  const focus=await page.locator(':focus').evaluate(el=>getComputedStyle(el).outlineColor); expect(focus).toBe('rgb(240, 161, 139)');
  await page.getByRole('button',{name:'Pause background slideshow'}).click(); await page.locator('h1').click(); await page.clock.fastForward(14000);
  await expect(page.getByRole('button',{name:/Show background 2:/})).toHaveAttribute('aria-current','true');
  await page.getByRole('button',{name:'Play background slideshow'}).click(); await page.locator('h1').click(); await page.clock.fastForward(7000);
  await expect(page.getByRole('button',{name:/Show background 3:/})).toHaveAttribute('aria-current','true');
  await page.emulateMedia({reducedMotion:'reduce'}); await first.click(); await page.locator('h1').click(); await page.clock.fastForward(21000); await expect(first).toHaveAttribute('aria-current','true');
  await page.getByRole('button',{name:'Next background image'}).click(); await expect(page.getByRole('button',{name:/Show background 2:/})).toHaveAttribute('aria-current','true');
});

test('slow and failed photos preserve readable content and recover', async({page})=>{
  let release: ()=>void = ()=>{};
  const gate=new Promise<void>(resolve=>release=resolve);
  await page.route('**/marketing/hero/interior-*.webp',async route=>{await gate; await route.continue();});
  await page.route('**/marketing/hero/residences-*.webp',route=>route.abort());
  await open(page); await expect(page.locator('.mk-photo-hero img')).toHaveCount(1);
  await expect(page.getByRole('button',{name:/Show background 1:/})).toBeDisabled();
  await expect(page.locator('.mk-photo-hero h1')).toBeVisible(); await expect(page.locator('.mk-photo-hero').getByRole('link',{name:'Get Started'})).toBeVisible();
  release(); await expect(page.getByRole('button',{name:/Show background 2:/})).toHaveAttribute('aria-current','true');
});


test('published marketing content replaces defaults while preserving the product tour and conversion destinations',async({page})=>{
  const content=structuredClone(DEFAULT_MARKETING_DOCUMENT);
  content.hero.title='Your portfolio.';content.hero.secondLine='Clearer every day.';content.hero.description='Published portfolio copy.';
  content.hero.images=['interior','residences','commercial','community'];
  content.seo.title='Portfolio clarity with BaytMiftah';
  content.faq=[{q:'Can our team get started?',a:'Create an account and configure the workspace.'}];
  content.sections=[{title:'A simpler operating day',body:'Published additional content.'}];
  await page.route('**/rest/v1/marketing_page_published*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify([{document:content}])}));
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await expect(page.getByRole('heading',{level:1})).toHaveText('Your portfolio.Clearer every day.');
  await expect(page.locator('.mk-ed-hero__lead')).toHaveText('Published portfolio copy.');
  await expect(page).toHaveTitle(/Portfolio clarity/);
  await expect.poll(() => page.locator('.mk-photo-hero img').count()).toBe(4);
  await expect(page.locator('.mk-photo-hero img').first()).toHaveAttribute('src',/interior-1280.webp$/);
  await expect(page.getByRole('heading',{name:'A simpler operating day'})).toBeAttached();
  await expect(page.locator('.mk-ed-details')).toHaveCount(1);
  await expect(page.locator('.mk-photo-hero').getByRole('link',{name:'Get Started'})).toHaveAttribute('href',/\/signup$/);
  await page.locator('.mk-photo-hero').getByRole('link',{name:'Explore the Platform'}).click();
  await expect(page.getByRole('region',{name:'Product tour',exact:true})).toBeInViewport();
});
