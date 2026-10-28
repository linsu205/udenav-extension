/* CSP 等效环境 E2E：本地服务带 MV3 同款 CSP 头（script-src 'self'），
   验证修复后按钮在 CSP 下真的能点。mock 导航站在 8813。 */
import { createRequire } from 'node:module';
const require = createRequire('C:/Users/15602/.workbuddy/binaries/node/workspace/node_modules/');
const puppeteer = require('puppeteer-core');
const BASE = 'http://127.0.0.1:8814';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (c, name, extra = '') => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + name + (extra ? ' — ' + extra : '')); };

const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + String(e).slice(0, 120)));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 120)); });
await page.setViewport({ width: 560, height: 640 });

/* ---------- options.html（用户报障页面） ---------- */
await page.goto(BASE + '/options.html', { waitUntil: 'networkidle2' });
await sleep(400);

// 先证明测试环境有效：CSP 下内联脚本若存在会报错；我们确认外链脚本已执行
const wired = await page.evaluate(() => {
  const btn = document.querySelector('#save');
  return !!btn && typeof btn.onclick !== 'function' && btn.tagName === 'BUTTON';
});
ok(wired, '页面加载正常');

await page.type('#url', 'http://127.0.0.1:8813/', { delay: 10 });
await page.click('#save');
await sleep(400);
const saved = await page.evaluate(() => {
  const okEl = document.querySelector('#ok');
  return { okShown: okEl.style.display === 'inline', cfg: JSON.parse(localStorage.getItem('udenav_ext_cfg') || 'null') };
});
ok(saved.okShown, '「保存」按钮生效（已保存提示出现）');
ok(saved.cfg && saved.cfg.url === 'http://127.0.0.1:8813/' && saved.cfg.mode === 'embed', '配置写入存储', JSON.stringify(saved.cfg));

// 「打开导航站测试」：新 tab 打开导航
const before = (await browser.pages()).length;
await page.click('#test');
await sleep(1200);
const tabs = await browser.pages();
ok(tabs.length > before, '「打开导航站测试」弹出新页');
const testUrl = tabs[tabs.length - 1].url();
ok(testUrl === 'http://127.0.0.1:8813/', '测试页地址正确', testUrl);
await tabs[tabs.length - 1].close();

/* ---------- newtab.html ---------- */
await page.goto(BASE + '/newtab.html', { waitUntil: 'networkidle2' });
await sleep(400);
// options 已写入 localStorage（同源 8814）→ 应直接内嵌
const nt = await page.evaluate(() => ({
  setup: document.querySelector('#setup').style.display,
  frameShown: document.querySelector('#frame').style.display === 'block',
  frameSrc: document.querySelector('#frame').src,
}));
ok(nt.setup === 'none', '已有配置不显示首次设置卡', nt.setup);
ok(nt.frameShown && nt.frameSrc === 'http://127.0.0.1:8813/', '内嵌 iframe 指向导航站', nt.frameSrc);

// 齿轮面板回填 + 改跳转 + 保存
await page.click('#gear');
await sleep(300);
const filled = await page.evaluate(() => ({
  url: document.querySelector('#p-url').value,
  mode: document.querySelector('input[name="mode"]:checked').value,
  open: document.querySelector('#panel').classList.contains('open'),
}));
ok(filled.open && filled.url === 'http://127.0.0.1:8813/' && filled.mode === 'embed', '齿轮面板回填配置', JSON.stringify(filled));
await page.evaluate(() => document.querySelector('input[name="mode"][value="redirect"]').click());
await page.click('#p-save');
await sleep(300);
const rd = await page.evaluate(() => ({ shown: document.querySelector('#rd').style.display === 'block', url: document.querySelector('#rd-url').textContent }));
ok(rd.shown && rd.url === 'http://127.0.0.1:8813/', '跳转模式提示条出现', JSON.stringify(rd));
await page.keyboard.press('Escape');
await sleep(200);
const rdOff = await page.evaluate(() => document.querySelector('#rd').style.display === 'none' && document.querySelector('#panel').classList.contains('open'));
ok(rdOff, 'Esc 取消跳转并打开面板');

// 回切内嵌，避免存储里残留跳转模式
await page.evaluate(() => document.querySelector('input[name="mode"][value="embed"]').click());
await page.click('#p-save');
await sleep(200);

ok(errors.length === 0, '无 console/页面错误', errors.join(' | ').slice(0, 200));
console.log('RESULT ' + pass + '/' + (pass + fail));
await browser.close();
