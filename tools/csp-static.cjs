/* 用与 MV3 扩展页完全相同的 CSP（script-src 'self'; object-src 'self'）托管扩展目录，
   复现「内联脚本被拦 → 按钮全灭」的故障环境 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.json': 'application/json' };
http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  const file = path.join(ROOT, urlPath === '/' ? 'newtab.html' : urlPath.replace(/^\//, ''));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, {
      'content-type': MIME[path.extname(file)] || 'application/octet-stream',
      'content-security-policy': "script-src 'self'; object-src 'self'",
    });
    res.end(data);
  });
}).listen(8814, '127.0.0.1', () => console.log('csp static on 8814'));
