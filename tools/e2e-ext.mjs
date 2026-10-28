/* 真实扩展上下文 E2E：--load-extension 启动 Chrome（MV3 CSP 生效，chrome.storage 可用），
   直接打开 chrome-extension://<id>/options.html 与 newtab.html 验证按钮事件真的绑上了 */
import { createRequire } from 'node:module';
const require = createRequire('C:/Users/15602/.workbuddy/binaries/node/workspace/node_modules/');
const puppeteer = require('puppeteer-core');
const path = 'file:///D:/code/rea/udenav-extension';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (c, name, extra = '') => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + name + (extra ? ' — ' + extra : '')); };

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: false, // Chrome 137+ 品牌版在 headless 里禁用 --load-extension，必须有头
  args: [
    '--disable-extensions-except=' + path.replace('file:///', ''),
    '--load-extension=' + path.replace('file:///', ''),
  ],
});

// 从 service worker target 拿扩展 ID
let extId = '';
for (let i = 0; i < 20 && !extId; i++) {
  for (const t of browser.targets()) {
    const u = t.url() || '';
    if (u.startsWith('chrome-extension://') && u.endsWith('service-worker.js')) { extId = u.split('/')[2]; break; }
  }
  if (!extId) await sleep(500);
}
ok(!!extId, '扩展已加载', 'id=' + extId);

const errors = [];
const page = await browser.newPage();
const watch = (p) => {
  p.on('pageerror', e => errors.push('pageerror: ' + String(e).slice(0, 150)));
  p.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 150)); });
};
watch(page);

/* ---------- options.html：用户报障的两个按钮 ---------- */
await page.goto('chrome-extension://' + extId + '/options.html', { waitUntil: 'networkidle2' });
await sleep(400);
await page.setViewport({ width: 560, height: 640 });
await page.type('#url', 'http://127.0.0.1:8813/', { delay: 10 });
await page.click('#save');
await sleep(500);
const saved = await page.evaluate(() => {
  const okEl = document.querySelector('#ok');
  return new Promise((res) => chrome.storage.local.get('udenav_ext_cfg', (o) => res({ okShown: okEl.style.display === 'inline', cfg: o.udenav_ext_cfg })));
});
ok(saved.okShown, '「保存」出现已保存提示');
ok(saved.cfg && saved.cfg.url === 'http://127.0.0.1:8813/' && saved.cfg.mode === 'embed', 'chrome.storage 写入成功', JSON.stringify(saved.cfg));

// 「打开导航站测试」：点击后弹出新 tab
const before = browser.targets().filter(t => t.type() === 'page').length;
await page.click('#test');
await sleep(1200);
const tabs = await browser.pages();
ok(tabs.length > 2 || browser.targets().filter(t => t.type() === 'page').length > before, '「打开导航站测试」弹出新页');
const testTab = tabs[tabs.length - 1];
const testUrl = testTab.url();
ok(testUrl === 'http://127.0.0.1:8813/', '测试页打开的是导航地址', testUrl);
await testTab.close();

/* ---------- newtab.html：首次设置卡 + 内嵌 + 齿轮 ---------- */
const nt = await browser.newPage();
watch(nt);
await nt.setViewport({ width: 1200, height: 800 });
await nt.goto('chrome-extension://' + extId + '/newtab.html', { waitUntil: 'networkidle2' });
await sleep(400);
// options 已存过配置 → 应直接内嵌而不是首次设置卡
const ntState = await nt.evaluate(() => ({
  setup: document.querySelector('#setup').style.display,
  frameShown: document.querySelector('#frame').style.display === 'block',
  frameSrc: document.querySelector('#frame').src,
}));
ok(ntState.setup === 'none', '已有配置时不显示首次设置卡', ntState.setup);
ok(ntState.frameShown && ntState.frameSrc === 'http://127.0.0.1:8813/', '内嵌模式 iframe 已加载导航', ntState.frameSrc);

// 齿轮 → 面板回填 → 改跳转 → 保存
await nt.click('#gear');
await sleep(300);
const filled = await nt.evaluate(() => ({
  url: document.querySelector('#p-url').value,
  mode: document.querySelector('input[name="mode"]:checked').value,
  open: document.querySelector('#panel').classList.contains('open'),
}));
ok(filled.open && filled.url === 'http://127.0.0.1:8813/' && filled.mode === 'embed', '齿轮面板回填当前配置', JSON.stringify(filled));
await nt.evaluate(() => { document.querySelector('input[name="mode"][value="redirect"]').click(); });
await nt.click('#p-save');
await sleep(300);
const rd = await nt.evaluate(() => ({ shown: document.querySelector('#rd').style.display === 'block', url: document.querySelector('#rd-url').textContent }));
ok(rd.shown && rd.url === 'http://127.0.0.1:8813/', '切换跳转模式出现提示条', JSON.stringify(rd));
// Esc 取消跳转
await nt.keyboard.press('Escape');
await sleep(200);
const rdOff = await nt.evaluate(() => document.querySelector('#rd').style.display === 'none' && document.querySelector('#panel').classList.contains('open'));
ok(rdOff, 'Esc 取消跳转并打开设置面板');

await nt.screenshot({ path: 'tools/e2e-ext-newtab.png' });
const shot = await page.screenshot({ path: 'tools/e2e-ext-options.png' });
ok(errors.length === 0, '无 console/页面错误', errors.join(' | '));
console.log('RESULT ' + pass + '/' + (pass + fail));
await browser.close();
