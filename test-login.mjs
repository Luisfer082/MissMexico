import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

// 1. Página de login
await page.goto('http://localhost:5173');
await page.waitForLoadState('networkidle');
await page.screenshot({ path: '/tmp/01-login.png' });
console.log('URL inicial:', page.url());
console.log('Título:', await page.title());

await browser.close();
