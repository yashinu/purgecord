const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

export function makeDraggable(panel, handle) {
  let sx, sy, st, sl;
  const onMove = (e) => {
    const t = clamp(st + (e.clientY - sy), 0, window.innerHeight - 40);
    const l = clamp(sl + (e.clientX - sx), -panel.offsetWidth + 80, window.innerWidth - 80);
    panel.style.top = t + 'px';
    panel.style.left = l + 'px';
    panel.style.right = 'auto';
  };
  const onUp = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  };
  handle.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    // Don't hijack interactive header controls (the language <select>, Streamer checkbox,
    // close button, etc.) — preventDefault here would block a <select> from opening.
    if (e.target.closest('input, select, button, textarea, option, label, a')) return;
    e.preventDefault();
    const r = panel.getBoundingClientRect();
    sx = e.clientX; sy = e.clientY; st = r.top; sl = r.left;
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

export function makeResizable(panel, handle) {
  let sx, sy, sw, sh;
  const onMove = (e) => {
    panel.style.width = Math.max(480, sw + (e.clientX - sx)) + 'px';
    panel.style.height = Math.max(420, sh + (e.clientY - sy)) + 'px';
  };
  const onUp = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  };
  handle.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    sx = e.clientX; sy = e.clientY; sw = panel.offsetWidth; sh = panel.offsetHeight;
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}
