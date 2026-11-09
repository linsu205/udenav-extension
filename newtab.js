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

/* 接收内嵌页（UDeNav）同步的背景（壁纸/主题），让加载遮罩与站内一致、无黑底跳变；
   并缓存到本地，二次打开新标签首帧即壁纸，不再闪深色 */
function applyBgToBoot(bg) {
  const boot = document.getElementById('boot');
  const root = document.documentElement;
  if (bg.isDark === false) root.setAttribute('data-xtheme', 'light');
  else root.removeAttribute('data-xtheme');
  if (bg.url) {
    const mv = (bg.maskV == null ? 0.2 : bg.maskV);
    const tint = bg.isDark ? `rgba(0,0,0,${mv})` : `rgba(255,255,255,${mv})`;
    const img = `url("${String(bg.url).replace(/"/g, '')}")`;
    boot.style.background = `linear-gradient(${tint},${tint}), ${img} center / cover no-repeat fixed`;
  } else {
    boot.style.background = '';
  }
}
async function getBgCache() {
  try {
    if (window.chrome?.storage?.local) {
      return await new Promise((res) => chrome.storage.local.get('udenav_bg_cache', (o) => res(o.udenav_bg_cache || null)));
    }
  } catch (e) { /* fallthrough */ }
  try { return JSON.parse(localStorage.getItem('udenav_bg_cache')) || null; } catch (e) { return null; }
}
window.addEventListener('message', (e) => {
  const d = e.data;
  if (!d || !d.__udenav_bg) return;
  const bg = d.__udenav_bg;
  applyBgToBoot(bg);
  try {
    if (window.chrome?.storage?.local) chrome.storage.local.set({ udenav_bg_cache: bg });
    else localStorage.setItem('udenav_bg_cache', JSON.stringify(bg));
  } catch (e2) {}
});

async function render() {
  cfg = (await store.get()) || cfg;
  const cachedBg = await getBgCache();
  if (!cfg.url) { $('#setup').style.display = 'flex'; return; }
  $('#setup').style.display = 'none';
  if (cfg.mode === 'redirect') {
    $('#frame').style.display = 'none';
    $('#boot').classList.remove('show');
    $('#rd-url').textContent = cfg.url;
    $('#rd').style.display = 'block';
    redirectTimer = setTimeout(() => location.replace(cfg.url), 700);
  } else {
    const f = $('#frame');
    const boot = $('#boot');
    f.style.display = 'block';
    // 先用缓存的壁纸/主题铺底（二次打开首帧即壁纸），再等内嵌页同步最新背景
    if (cachedBg) applyBgToBoot(cachedBg);
    // 加载遮罩盖住 iframe 的 about:blank 黑屏，等内嵌页真正就绪再淡出
    boot.classList.remove('hide');
    boot.classList.add('show');
    const settleBoot = () => {
      setTimeout(() => {
        boot.classList.add('hide');
        setTimeout(() => boot.classList.remove('show'), 520);
      }, 240);
    };
    if (f.getAttribute('data-url') !== cfg.url) {
      f.onload = settleBoot;
      f.src = cfg.url;
      f.setAttribute('data-url', cfg.url);
    } else {
      settleBoot();
    }
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
