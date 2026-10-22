(() => {
  const HOST = location.hostname;
  const STYLE_ID = '__blocks_ext_style';
  let cfg = { blocks: [], cssOff: false, imgOff: false };
  let timer = 0;

  function load(cb) {
    chrome.storage.local.get(HOST, r => {
      cfg = Object.assign({ blocks: [], cssOff: false, imgOff: false }, r[HOST]);
      cb && cb();
    });
  }
  function save() { chrome.storage.local.set({ [HOST]: cfg }); }

  function apply() {
    let st = document.getElementById(STYLE_ID);
    if (!st) {
      st = document.createElement('style');
      st.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(st);
    }
    const rules = cfg.blocks.filter(b => b.off).map(b => b.selector + '{display:none !important}');
    if (cfg.imgOff) rules.push('img,picture,video{visibility:hidden !important}');
    const text = rules.join('\n');
    if (st.textContent !== text) st.textContent = text;
    for (const s of document.styleSheets) {
      if (s.ownerNode && s.ownerNode.id === STYLE_ID) continue;
      try { if (s.disabled !== cfg.cssOff) s.disabled = cfg.cssOff; } catch (e) {}
    }
  }

  // Селектор по структуре (у Next.js классы часто меняются, поэтому id и позиция надёжнее)
  function cssPath(el) {
    const parts = [];
    while (el && el.nodeType === 1 && el !== document.documentElement) {
      if (el.id && document.querySelectorAll('#' + CSS.escape(el.id)).length === 1) {
        parts.unshift('#' + CSS.escape(el.id));
        break;
      }
      let part = el.tagName.toLowerCase();
      const same = [...el.parentNode.children].filter(c => c.tagName === el.tagName);
      if (same.length > 1) part += ':nth-of-type(' + (same.indexOf(el) + 1) + ')';
      parts.unshift(part);
      el = el.parentElement;
    }
    return parts.join('>');
  }

  // Режим выбора блока
  let picking = false, hoverEl = null, box = null;
  function show(el) {
    hoverEl = el;
    const r = el.getBoundingClientRect();
    Object.assign(box.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
  }
  const onMove = e => { if (e.target !== box) show(e.target); };
  const onClick = e => {
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    const el = hoverEl || e.target;
    stopPick();
    const label = el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') +
      (el.textContent.trim() ? ' — ' + el.textContent.trim().slice(0, 30) : '');
    cfg.blocks.push({ id: Date.now(), selector: cssPath(el), label, off: true });
    save(); apply();
  };
  const onKey = e => {
    if (e.key === 'Escape') stopPick();
    if (e.key === 'ArrowUp' && hoverEl && hoverEl.parentElement && hoverEl.parentElement !== document.documentElement) {
      e.preventDefault(); show(hoverEl.parentElement);
    }
  };
  function startPick() {
    if (picking) return;
    picking = true;
    box = document.createElement('div');
    box.style.cssText = 'position:fixed;z-index:2147483647;pointer-events:none;border:2px solid #22d3ee;background:rgba(34,211,238,.2)';
    document.documentElement.appendChild(box);
    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKey, true);
  }
  function stopPick() {
    picking = false;
    if (box) box.remove();
    document.removeEventListener('mousemove', onMove, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('keydown', onKey, true);
  }

  chrome.runtime.onMessage.addListener((msg, _s, reply) => {
    if (msg && msg.type === 'pick') startPick();
    reply({ ok: true });
  });
  chrome.storage.onChanged.addListener(ch => { if (ch[HOST]) load(apply); });

  // Сайты на Next.js подгружают части страницы позже — применяем правила повторно
  const again = () => { clearTimeout(timer); timer = setTimeout(apply, 300); };
  new MutationObserver(again).observe(document.documentElement, { childList: true, subtree: true });

  load(apply);
  document.addEventListener('DOMContentLoaded', apply);
  window.addEventListener('load', apply);
})();
