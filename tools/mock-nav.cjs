const http = require('node:http');
http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end('<!DOCTYPE html><html><head><title>MockNav</title></head><body style="margin:0;background:linear-gradient(135deg,#2b5876,#4e4376);color:#fff;font:600 40px sans-serif;display:flex;align-items:center;justify-content:center;height:100vh">导航站加载成功</body></html>');
}).listen(8813, '127.0.0.1', () => console.log('mock nav on 8813'));
