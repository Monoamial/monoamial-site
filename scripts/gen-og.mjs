/*
  Regenerates public/og.png (the social-preview card) from the live hero.
  Needs playwright: npm i --no-save playwright && npx playwright install chromium
  Run with the preview server up: npm run build && npx astro preview &
*/
import { chromium } from 'playwright';

// The board frame is 812 CSS px wide (inside the 860px .wrap). Render at a
// device scale that maps its width to exactly 1200 output px, then clip a
// vertically-centered 630-px-equivalent band.
const browser = await chromium.launch();
const DPR = 1200 / 812;
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: DPR });
await page.goto('http://localhost:4321/', { waitUntil: 'networkidle' });
await page.waitForTimeout(4000); // let the phase field lay down chalk trails

const box = await page.locator('.board-frame').boundingBox();
const cropH = 630 / DPR; // CSS px
await page.screenshot({
  path: 'public/og.png',
  clip: {
    x: box.x,
    y: box.y + (box.height - cropH) / 2,
    width: box.width,
    height: cropH,
  },
});
await browser.close();
console.log('og.png written');
