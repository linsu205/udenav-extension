/* 用 Chrome 渲染项目 SVG logo（favicon 同款：蓝底圆角 + 白色 U+上箭头），
   截图生成 16/48/128 三档 PNG（omitBackground 保留透明背景） */
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire('C:/Users/15602/.workbuddy/binaries/node/workspace/node_modules/');
const puppeteer = require('puppeteer-core');

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#409EFF"/><path d="M22 22 V36 Q22 46 32 46 Q42 46 42 36 V14" fill="none" stroke="#FFFFFF" stroke-width="7" stroke-linecap="round"/><path d="M34 22 L42 12 L50 22" fill="none" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const dataUri = 'data:image/svg+xml,' + encodeURIComponent(SVG);

const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
const page = await browser.newPage();
for (const size of [16, 48, 128]) {
  await page.setViewport({ width: size, height: size });
  await page.goto(dataUri);
  await page.screenshot({ path: 'icons/icon' + size + '.png', omitBackground: true });
  console.log('icon' + size + '.png written');
}
await browser.close();
console.log('sizes:', fs.readdirSync('icons').join(', '));
