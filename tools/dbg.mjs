import { createRequire } from 'node:module';
const require = createRequire('C:/Users/15602/.workbuddy/binaries/node/workspace/node_modules/');
const puppeteer = require('puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
page.on('console', (m) => console.log('[page]', m.text()));
page.on('pageerror', (e) => console.log('[err]', String(e)));

await page.goto('file:///D:/code/rea/udenav-extension/newtab.html', { waitUntil: 'load' });
await sleep(400);
console.log('setup display:', await page.evaluate(() => document.querySelector('#setup').style.display));
/* 预置 localStorage 模拟已设置 */
await page.evaluate(() => localStorage.setItem('udenav_ext_cfg', JSON.stringify({ url: 'https://127.0.0.1:8813/', mode: 'embed' })));
await page.reload({ waitUntil: 'load' });
await sleep(800);
console.log('after reload:', JSON.stringify(await page.evaluate(() => ({
  setup: document.querySelector('#setup').style.display,
  frame: document.querySelector('#frame').style.display,
  src: document.querySelector('#frame').src,
  ls: localStorage.getItem('udenav_ext_cfg'),
}))));
await page.click('#gear');
await sleep(400);
console.log('after gear:', JSON.stringify(await page.evaluate(() => ({
  open: document.querySelector('#panel').classList.contains('open'),
  url: document.querySelector('#p-url').value,
  display: getComputedStyle(document.querySelector('#panel')).display,
  saveRect: (() => { const r = document.querySelector('#p-save').getBoundingClientRect(); return [r.width, r.height, r.top, r.left]; })(),
}))));
await browser.close();
