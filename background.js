/* 工具栏图标点击：直接在新标签页打开已设置的导航站（不经过新标签页覆盖页）；
   未设置过地址时打开扩展设置页 */
chrome.action.onClicked.addListener(async (tab) => {
  let cfg = null;
  try {
    cfg = await new Promise((res) => chrome.storage.local.get('udenav_ext_cfg', (o) => res(o.udenav_ext_cfg || null)));
  } catch (e) { /* ignore */ }
  if (cfg && cfg.url) chrome.tabs.create({ url: cfg.url });
  else chrome.runtime.openOptionsPage();
});
