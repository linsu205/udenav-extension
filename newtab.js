const $ = (s) => document.querySelector(s);
const KEY = 'udenav_ext_cfg';

/* chrome.storage 优先，文件方式预览时退回 localStorage */
const store = {
  async get() {
    try {
      if (window.chrome?.storage?.local) {
        return await new Promise((res) => chrome.storage.local.get(KEY, (o) => res(o[KEY] || null)));
      }
    } catch (e) { /* fallthrough */ }
    try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; }
  },
  async set(cfg) {
    try {
      if (window.chrome?.storage?.local) { await chrome.storage.local.set({ [KEY]: cfg }); return; }
    } catch (e) { /* fallthrough */ }
    localStorage.setItem(KEY, JSON.stringify(cfg));
  },
};

function normUrl(v) {
  v = String(v || '').trim();
  if (!v) return '';
  if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
  try { const u = new URL(v); return u.origin + u.pathname === u.origin + '/' ? u.origin + '/' : u.href; }
  catch (e) { return ''; }
}

let cfg = { url: '', mode: 'embed' };

async function render() {
  cfg = (await store.get()) || cfg;
  if (!cfg.url) { $('#setup').style.display = 'flex'; return; }
  $('#setup').style.display = 'none';
  if (cfg.mode === 'redirect') {
    $('#frame').style.display = 'none';
    $('#rd-url').textContent = cfg.url;
    $('#rd').style.display = 'block';
    redirectTimer = setTimeout(() => location.replace(cfg.url), 700);
  } else {
    const f = $('#frame');
    f.style.display = 'block';
    if (f.src !== cfg.url) f.src = cfg.url;
  }
}

let redirectTimer = null;
$('#rd-cancel').addEventListener('click', () => {
  if (redirectTimer) { clearTimeout(redirectTimer); redirectTimer = null; }
  $('#rd').style.display = 'none';
  openPanel();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && redirectTimer) {
    clearTimeout(redirectTimer); redirectTimer = null;
    $('#rd').style.display = 'none';
    openPanel();
  }
});

/* ---- 首次设置 ---- */
$('#s-go').addEventListener('click', async () => {
  const url = normUrl($('#s-url').value);
  if (!url) { $('#s-err').style.display = 'block'; return; }
  cfg = { url, mode: 'embed' };
  await store.set(cfg);
  location.reload();
});
$('#s-url').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#s-go').click(); });

/* ---- 设置面板 ---- */
function openPanel() {
  $('#p-url').value = cfg.url || '';
  document.querySelector(`input[name="mode"][value="${cfg.mode || 'embed'}"]`).checked = true;
  $('#panel').classList.add('open');
}
$('#gear').addEventListener('click', () => {
  /* 打开时要回填当前地址/模式，不能只 toggle 显隐 */
  if ($('#panel').classList.contains('open')) $('#panel').classList.remove('open');
  else openPanel();
});
$('#p-close').addEventListener('click', () => $('#panel').classList.remove('open'));
$('#p-save').addEventListener('click', async () => {
  const url = normUrl($('#p-url').value);
  if (!url) { $('#p-url').focus(); return; }
  const mode = document.querySelector('input[name="mode"]:checked').value;
  cfg = { url, mode };
  await store.set(cfg);
  $('#panel').classList.remove('open');
  if (redirectTimer) { clearTimeout(redirectTimer); redirectTimer = null; }
  $('#rd').style.display = 'none';
  render();
});
$('#p-url').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#p-save').click(); });

render();
