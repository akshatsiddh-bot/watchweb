(() => {
  if (window.__watchwebSelectorActive) return; // avoid double-injection
  window.__watchwebSelectorActive = true;

  const HIGHLIGHT_COLOR = '#3358f4';
  let hoveredEl = null;
  let overlayBox = null;
  let panelHost = null;

  function createOverlayBox() {
    const box = document.createElement('div');
    Object.assign(box.style, {
      position: 'fixed',
      pointerEvents: 'none',
      zIndex: '2147483646',
      border: `2px solid ${HIGHLIGHT_COLOR}`,
      background: 'rgba(51, 88, 244, 0.08)',
      borderRadius: '2px',
      transition: 'all 60ms ease-out',
      display: 'none',
    });
    document.documentElement.appendChild(box);
    return box;
  }

  function positionOverlay(el) {
    const rect = el.getBoundingClientRect();
    overlayBox.style.display = 'block';
    overlayBox.style.top = `${rect.top}px`;
    overlayBox.style.left = `${rect.left}px`;
    overlayBox.style.width = `${rect.width}px`;
    overlayBox.style.height = `${rect.height}px`;
  }

  function onMouseMove(e) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el === hoveredEl || el === overlayBox) return;
    hoveredEl = el;
    positionOverlay(el);
  }

  function onClick(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!hoveredEl) return;
    const target = hoveredEl;
    deactivateSelectionMode();
    openConfirmationPanel(target);
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      deactivateSelectionMode();
      removePanel();
    }
  }

  function preventNavigation(e) {
    // Prevent accidental navigation (link clicks) while in selection mode.
    e.preventDefault();
    e.stopPropagation();
  }

  function activateSelectionMode() {
    overlayBox = createOverlayBox();
    document.addEventListener('mousemove', onMouseMove, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('mousedown', preventNavigation, true);
    document.addEventListener('keydown', onKeyDown, true);
    document.body.style.cursor = 'crosshair';
  }

  function deactivateSelectionMode() {
    document.removeEventListener('mousemove', onMouseMove, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('mousedown', preventNavigation, true);
    document.removeEventListener('keydown', onKeyDown, true);
    document.body.style.cursor = '';
    if (overlayBox) {
      overlayBox.remove();
      overlayBox = null;
    }
  }

  // --- Robust selector generation ---
  // Strategy, in order of preference:
  // 1. A stable-looking id (skips ids that look auto-generated/random).
  // 2. A semantic data-* / aria attribute.
  // 3. A stable class combination.
  // 4. A structural nth-child path, capped at a reasonable depth, with a
  //    couple of ancestor fallback selectors also captured for resilience.
  function looksRandomToken(token) {
    return (
      /^[0-9a-f]{8,}$/i.test(token) ||
      /\d{4,}/.test(token) ||
      /^[a-z0-9]{10,}$/i.test(token) && /[0-9]/.test(token)
    );
  }

  function cssEscape(value) {
    return typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(value) : value.replace(/([^\w-])/g, '\\$1');
  }

  function selectorForStableId(el) {
    if (el.id && !looksRandomToken(el.id)) {
      return `#${cssEscape(el.id)}`;
    }
    return null;
  }

  function selectorForSemanticAttr(el) {
    const attrs = ['data-testid', 'data-test', 'data-qa', 'name', 'aria-label'];
    for (const attr of attrs) {
      const val = el.getAttribute(attr);
      if (val && !looksRandomToken(val)) {
        return `${el.tagName.toLowerCase()}[${attr}="${cssEscape(val)}"]`;
      }
    }
    return null;
  }

  function selectorForStableClasses(el) {
    const classes = Array.from(el.classList).filter((c) => c && !looksRandomToken(c));
    if (classes.length === 0) return null;
    const selector = `${el.tagName.toLowerCase()}.${classes.map(cssEscape).join('.')}`;
    // Only trust this if it's reasonably unique on the page.
    try {
      if (document.querySelectorAll(selector).length <= 3) return selector;
    } catch {
      return null;
    }
    return null;
  }

  function nthChildSelector(el) {
    const parts = [];
    let node = el;
    let depth = 0;
    while (node && node.nodeType === 1 && depth < 6) {
      let selector = node.tagName.toLowerCase();
      if (node.id && !looksRandomToken(node.id)) {
        parts.unshift(`#${cssEscape(node.id)}`);
        break;
      }
      const parent = node.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter((c) => c.tagName === node.tagName);
        if (siblings.length > 1) {
          const index = siblings.indexOf(node) + 1;
          selector += `:nth-of-type(${index})`;
        }
      }
      parts.unshift(selector);
      node = parent;
      depth += 1;
    }
    return parts.join(' > ');
  }

  function generateSelectorCandidates(el) {
    const candidates = [];
    const byId = selectorForStableId(el);
    if (byId) candidates.push(byId);
    const bySemantic = selectorForSemanticAttr(el);
    if (bySemantic) candidates.push(bySemantic);
    const byClasses = selectorForStableClasses(el);
    if (byClasses) candidates.push(byClasses);
    candidates.push(nthChildSelector(el)); // always available as structural fallback

    // De-duplicate while preserving order, and verify each candidate
    // actually resolves back to this element (or at least resolves to
    // something) before trusting it.
    const seen = new Set();
    const verified = [];
    for (const c of candidates) {
      if (!c || seen.has(c)) continue;
      seen.add(c);
      try {
        if (document.querySelector(c)) verified.push(c);
      } catch {
        // invalid selector syntax - skip
      }
    }
    return verified.length > 0 ? verified : [nthChildSelector(el)];
  }

  function extractPreviewText(el) {
    const clone = el.cloneNode(true);
    clone.querySelectorAll('script, style').forEach((n) => n.remove());
    return clone.textContent.replace(/\s+/g, ' ').trim().slice(0, 400);
  }

  // --- Confirmation panel (shadow DOM to avoid host page CSS collisions) ---
  function removePanel() {
    if (panelHost) {
      panelHost.remove();
      panelHost = null;
    }
  }

  function openConfirmationPanel(targetEl) {
    const candidates = generateSelectorCandidates(targetEl);
    const previewText = extractPreviewText(targetEl);

    panelHost = document.createElement('div');
    panelHost.style.position = 'fixed';
    panelHost.style.zIndex = '2147483647';
    panelHost.style.bottom = '20px';
    panelHost.style.right = '20px';
    document.documentElement.appendChild(panelHost);

    const shadow = panelHost.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>
        .panel { font-family: -apple-system, system-ui, sans-serif; width: 320px;
          background: #fff; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.2);
          border: 1px solid #e2e8f0; padding: 16px; color: #0f172a; }
        .panel h3 { margin: 0 0 4px; font-size: 14px; font-weight: 600; }
        .panel p.preview { font-size: 12px; color: #475569; background: #f8fafc; border-radius: 8px;
          padding: 8px; max-height: 80px; overflow: auto; margin: 8px 0; }
        .panel label { display:block; font-size: 12px; font-weight: 500; margin-top: 10px; margin-bottom: 4px; }
        .panel input, .panel select { width: 100%; box-sizing: border-box; padding: 6px 8px;
          border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; }
        .panel .row { display: flex; gap: 8px; margin-top: 14px; }
        .panel button { flex: 1; padding: 8px; border-radius: 8px; font-size: 13px; font-weight: 500;
          border: 1px solid #cbd5e1; background: #fff; cursor: pointer; }
        .panel button.primary { background: #3358f4; color: #fff; border-color: #3358f4; }
        .panel .msg { font-size: 12px; margin-top: 8px; }
        .panel .msg.error { color: #dc2626; }
        .panel .msg.success { color: #16a34a; }
      </style>
      <div class="panel">
        <h3>Create a WatchWeb watch</h3>
        <p class="preview">${previewText ? previewText.replace(/</g, '&lt;') : '(no visible text found)'}</p>
        <label>Name</label>
        <input id="wwName" type="text" value="${document.title.slice(0, 60).replace(/"/g, '&quot;')}" />
        <label>Check every</label>
        <select id="wwInterval">
          <option value="15">15 minutes</option>
          <option value="30">30 minutes</option>
          <option value="60" selected>1 hour</option>
          <option value="360">6 hours</option>
          <option value="720">12 hours</option>
          <option value="1440">24 hours</option>
        </select>
        <label>Notifications</label>
        <select id="wwNotif">
          <option value="every_change" selected>Every change</option>
          <option value="important_only">Important changes only</option>
          <option value="disabled">Disabled</option>
        </select>
        <div class="row">
          <button id="wwCancel">Cancel</button>
          <button id="wwCreate" class="primary">Create Watch</button>
        </div>
        <div id="wwMsg"></div>
      </div>
    `;

    shadow.getElementById('wwCancel').addEventListener('click', removePanel);

    shadow.getElementById('wwCreate').addEventListener('click', async () => {
      const msgEl = shadow.getElementById('wwMsg');
      const name = shadow.getElementById('wwName').value.trim();
      const interval = parseInt(shadow.getElementById('wwInterval').value, 10);
      const notificationPreference = shadow.getElementById('wwNotif').value;

      if (!name) {
        msgEl.textContent = 'Please enter a name.';
        msgEl.className = 'msg error';
        return;
      }

      msgEl.textContent = 'Creating…';
      msgEl.className = 'msg';

      chrome.runtime.sendMessage(
        {
          type: 'CREATE_WATCH',
          payload: {
            name,
            url: window.location.href,
            monitoringMode: 'selected',
            selector: candidates[0],
            selectorType: 'css',
            selectorFallbacks: candidates.slice(1),
            selectedText: previewText,
            interval,
            notificationPreference,
          },
        },
        (response) => {
          if (!response) {
            msgEl.textContent = 'Could not reach the extension. Please try again.';
            msgEl.className = 'msg error';
            return;
          }
          if (response.needsAuth) {
            msgEl.textContent = 'Please log in via the WatchWeb extension icon first.';
            msgEl.className = 'msg error';
            return;
          }
          if (!response.ok) {
            msgEl.textContent = response.error || 'Could not create watch.';
            msgEl.className = 'msg error';
            return;
          }
          msgEl.textContent = 'Watch created!';
          msgEl.className = 'msg success';
          setTimeout(removePanel, 1200);
        }
      );
    });
  }

  activateSelectionMode();
})();
