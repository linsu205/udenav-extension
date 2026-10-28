const $ = (s) => document.querySelector(s);
const KEY = 'udenav_ext_cfg';
function normUrl(v) {
  v = String(v || '').trim();
  if (!v) return '';
  if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
  try { const u = new URL(v); return u.origin + u.pathname === u.origin + '/' ? u.origin + '/' : u.href; }
  catch (e) { return ''; }
}
async function load() {
  let cfg = null;
  try {
    if (window.chrome?.storage?.local) cfg = await new Promise((res) => chrome.storage.local.get(KEY, (o) => res(o[KEY] || null)));
  } catch (e) { /* ignore */ }
  if (!cfg) { try { cfg = JSON.parse(localStorage.getItem(KEY)); } catch (e) { /* ignore */ } }
  cfg = cfg || { url: '', mode: 'embed' };
  $('#url').value = cfg.url || '';
  document.querySelector(`input[name="mode"][value="${cfg.mode || 'embed'}"]`).checked = true;
}
$('#save').addEventListener('click', async () => {
  const v = String($('#url').value || '').trim();
  if (!v) return;
  const url = normUrl(v);
  if (!url) { $('#url').focus(); return; }
  const mode = document.querySelector('input[name="mode"]:checked').value;
  const cfg = { url, mode };
  try {
    if (window.chrome?.storage?.local) await chrome.storage.local.set({ [KEY]: cfg });
    else localStorage.setItem(KEY, JSON.stringify(cfg));
  } catch (e) { /* ignore */ }
  $('#ok').style.display = 'inline';
  setTimeout(() => { $('#ok').style.display = 'none'; }, 1800);
});
$('#test').addEventListener('click', () => {
  const url = normUrl($('#url').value);
  if (url) window.open(url, '_blank');
});
load();
