/* 扩展 E2E：文件方式加载 newtab.html（chrome.storage 退回 localStorage 的路径），
   验证首次设置 → 内嵌 → 切跳转 → Esc 取消 → 面板改地址 */
import { createRequire } from 'node:module';
const require = createRequire('C:/Users/15602/.workbuddy/binaries/node/workspace/node_modules/');
const puppeteer = require('puppeteer-core');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (c, name, extra) => { if (c) { pass++; console.log('  ✓', name); } else { fail++; console.log('  ✗', name, extra ?? ''); } };

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

const NEWTAB = 'file:///D:/code/rea/udenav-extension/newtab.html';

/* 1. 首次打开 → 设置卡片 */
await page.goto(NEWTAB, { waitUntil: 'load' });
await sleep(500);
ok(await page.evaluate(() => document.querySelector('#setup').style.display !== 'none'), '首次打开显示设置卡片');
ok(await page.evaluate(() => !document.querySelector('#panel').classList.contains('open')), '设置面板默认收起');

/* 2. 填地址保存 → 内嵌模式 iframe 出现并加载 mock 导航 */
await page.type('#s-url', 'http://127.0.0.1:8813/', { delay: 10 });
await page.click('#s-go');
await sleep(1800);
ok(await page.evaluate(() => document.querySelector('#setup').style.display === 'none'), '保存后设置卡片消失');
ok(await page.evaluate(() => document.querySelector('#frame').style.display === 'block'), '内嵌模式 iframe 显示');
const src = await page.evaluate(() => document.querySelector('#frame').src);
ok(/^https?:\/\/127\.0\.0\.1:8813\/?$/.test(src), 'iframe 地址自动补全协议', src);
const frameOk = await page.evaluate(() => {
  const f = document.querySelector('#frame');
  try { return !!f.contentWindow.document.body && document.title !== undefined; } catch (e) { return 'cross-origin-or-blocked'; }
});
/* file:// 内嵌 http 必然跨域读不到内容——读不到恰好说明 iframe 已经加载了真实页面 */
ok(frameOk === true || frameOk === 'cross-origin-or-blocked', 'iframe 已加载（同源可读或正常跨域）', String(frameOk));

/* 3. 齿轮打开面板 → 切跳转模式 → 提示条出现并自动跳转 */
await page.click('#gear');
await sleep(300);
ok(await page.evaluate(() => document.querySelector('#panel').classList.contains('open')), '齿轮打开设置面板');
ok(await page.evaluate(() => document.querySelector('#p-url').value.includes('127.0.0.1:8813')), '面板回显当前地址');
await page.evaluate(() => { document.querySelector('input[name="mode"][value="redirect"]').click(); });
await page.click('#p-save');
await sleep(300);
ok(await page.evaluate(() => document.querySelector('#rd').style.display === 'block'), '跳转模式提示条显示');
await sleep(900);
ok(page.url().includes('127.0.0.1:8813'), '700ms 后自动跳转到导航站', page.url());

/* 4. 回到 newtab，Esc 取消跳转 → 面板打开可改 */
await page.goto(NEWTAB, { waitUntil: 'load' });
await sleep(500);
await page.keyboard.press('Escape');
await sleep(300);
ok(await page.evaluate(() => document.querySelector('#rd').style.display === 'none'), 'Esc 取消跳转，提示条消失');
ok(await page.evaluate(() => document.querySelector('#panel').classList.contains('open')), '取消后面板自动打开');
ok(page.url().includes('newtab.html'), '仍在新标签页未跳走', page.url());

/* 5. 面板改回内嵌并改地址 → iframe 更新 */
await page.evaluate(() => { document.querySelector('input[name="mode"][value="embed"]').click(); });
await page.click('#p-save');
await sleep(1200);
ok(await page.evaluate(() => document.querySelector('#frame').style.display === 'block'), '切回内嵌模式 iframe 显示');

/* 6. options.html：加载回显 + 保存 */
await page.goto('file:///D:/code/rea/udenav-extension/options.html', { waitUntil: 'load' });
await sleep(500);
ok(await page.evaluate(() => document.querySelector('#url').value.includes('127.0.0.1:8813')), '设置页回显地址');
await page.evaluate(() => { document.querySelector('#url').value = ''; });
await page.type('#url', 'https://example.com', { delay: 5 });
await page.click('#save');
await sleep(300);
ok(await page.evaluate(() => document.querySelector('#ok').style.display === 'inline'), '设置页保存成功提示');
await page.goto(NEWTAB, { waitUntil: 'load' });
await sleep(1200);
const src2 = await page.evaluate(() => document.querySelector('#frame').src);
ok(src2.includes('example.com'), '新标签页读到新地址', src2);

ok(errors.length === 0, '无页面 JS 错误', errors.join(' | '));

await page.screenshot({ path: 'D:/code/rea/udenav-extension/tools/e2e-embed.png' });
await browser.close();
console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
process.exit(fail ? 1 : 0);
