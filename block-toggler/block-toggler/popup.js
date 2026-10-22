(async () => {
  const $ = id => document.getElementById(id);
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  let host = '';
  try { if (/^https?:/.test(tab.url)) host = new URL(tab.url).hostname; } catch (e) {}
  if (!host) { $('host').textContent = 'Откройте обычный сайт (http/https)'; document.querySelectorAll('button,label').forEach(x => x.style.display = 'none'); return; }
  $('host').textContent = host;

  let cfg = { blocks: [], cssOff: false, imgOff: false };
  const r = await chrome.storage.local.get(host);
  cfg = Object.assign(cfg, r[host]);
  const save = () => chrome.storage.local.set({ [host]: cfg });

  function render() {
    $('css').checked = cfg.cssOff; $('img').checked = cfg.imgOff;
    const list = $('list'); list.innerHTML = '';
    if (!cfg.blocks.length) list.textContent = 'Пока пусто — нажмите «Выбрать блок».';
    cfg.blocks.forEach(b => {
      const row = document.createElement('div'); row.className = 'blk';
      const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = b.off;
      cb.onchange = () => { b.off = cb.checked; save(); };
      const t = document.createElement('span'); t.textContent = b.label; t.title = b.selector;
      const del = document.createElement('button'); del.textContent = '×';
      del.onclick = () => { cfg.blocks = cfg.blocks.filter(x => x !== b); save(); render(); };
      row.append(cb, t, del); list.appendChild(row);
    });
  }
  $('css').onchange = e => { cfg.cssOff = e.target.checked; save(); };
  $('img').onchange = e => { cfg.imgOff = e.target.checked; save(); };
  $('reset').onclick = async () => { await chrome.storage.local.remove(host); cfg = { blocks: [], cssOff: false, imgOff: false }; render(); };
  $('pick').onclick = async () => {
    try { await chrome.tabs.sendMessage(tab.id, { type: 'pick' }); window.close(); }
    catch (e) { $('msg').textContent = 'Обновите страницу (F5) и попробуйте снова.'; }
  };
  chrome.storage.onChanged.addListener(c => { if (c[host]) { cfg = Object.assign({ blocks: [], cssOff: false, imgOff: false }, c[host].newValue); render(); } });
  render();
})();
