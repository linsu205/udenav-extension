import { createRequire } from 'node:module';
import crypto from 'node:crypto';
const require = createRequire('C:/Users/15602/.workbuddy/binaries/node/workspace/node_modules/');
const puppeteer = require('puppeteer-core');
const DIRS = ['D:\\code\\rea\\udenav-extension', 'D:/code/rea/udenav-extension', 'd:\\code\\rea\\udenav-extension'];
const ids = [...new Set(DIRS.map(d => {
  const hex = crypto.createHash('sha256').update(d, 'utf8').digest('hex').slice(0, 32);
  return [...hex].map(ch => String.fromCharCode(97 + parseInt(ch, 16))).join('');
}))];
console.log('candidate ids:', ids.join(' '));

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: false,
  args: ['--disable-extensions-except=D:/code/rea/udenav-extension', '--load-extension=D:/code/rea/udenav-extension'],
});
const page = await browser.newPage();
for (const id of ids) {
  try {
    const resp = await page.goto('chrome-extension://' + id + '/options.html', { waitUntil: 'domcontentloaded', timeout: 8000 });
    console.log(id, resp ? resp.status() : 'null', 'title=', await page.title());
  } catch (e) { console.log(id, 'ERR', String(e).slice(0, 80)); }
}
await browser.close();
