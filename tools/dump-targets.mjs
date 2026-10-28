import { createRequire } from 'node:module';
const require = createRequire('C:/Users/15602/.workbuddy/binaries/node/workspace/node_modules/');
const puppeteer = require('puppeteer-core');
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: false,
  args: [
    '--disable-extensions-except=D:/code/rea/udenav-extension',
    '--load-extension=D:/code/rea/udenav-extension',
  ],
});
await new Promise(r => setTimeout(r, 3000));
for (const t of browser.targets()) console.log(t.type(), '|', t.url());
await browser.close();
