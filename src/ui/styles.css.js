export const styles = `
#purgecord-btn { display:flex; align-items:center; justify-content:center; width:24px; height:24px; margin:0 8px; cursor:pointer; color:var(--interactive-normal,#b5bac1); flex:0 0 auto; }
#purgecord-btn:hover { color:var(--interactive-hover,#dbdee1); }
#purgecord-btn.is-running { color:var(--status-danger,#f23f43); }

#purgecord { position:fixed; z-index:1000; top:60px; right:20px; width:720px; height:78vh; min-width:480px; min-height:420px; display:flex; flex-direction:column; background:var(--background-primary,#313338); color:var(--text-normal,#dbdee1); border:1px solid var(--background-tertiary,#1e1f22); border-radius:10px; box-shadow:0 8px 30px rgba(0,0,0,.5); overflow:hidden; font-family:var(--font-primary,'gg sans',sans-serif); }
#purgecord[hidden]{ display:none; }
#purgecord *, #purgecord *::before { box-sizing:border-box; }

.pc-header { display:flex; align-items:center; gap:10px; height:48px; padding:0 14px; background:var(--background-secondary,#2b2d31); cursor:grab; user-select:none; }
.pc-logo { font-weight:700; font-size:15px; }
.pc-sub { font-size:12px; color:var(--text-muted,#949ba4); }
.pc-spacer { flex:1; }
.pc-icon-btn { background:none; border:none; color:var(--interactive-normal,#b5bac1); font-size:16px; cursor:pointer; padding:6px; border-radius:4px; }
.pc-icon-btn:hover { background:var(--background-modifier-hover,rgba(255,255,255,.06)); color:#fff; }

.pc-tabs { display:flex; gap:2px; padding:8px 10px 0; background:var(--background-secondary,#2b2d31); }
.pc-tab { padding:8px 14px; background:none; border:none; border-radius:6px 6px 0 0; color:var(--text-muted,#949ba4); font-size:13px; font-weight:600; cursor:pointer; }
.pc-tab:hover { color:var(--interactive-hover,#dbdee1); }
.pc-tab.is-active { color:#fff; background:var(--background-primary,#313338); }

.pc-body { flex:1; overflow:auto; padding:14px; }
.pc-view[hidden]{ display:none; }

.pc-field { margin-bottom:14px; }
.pc-field > label { display:block; font-size:11px; font-weight:700; text-transform:uppercase; color:var(--header-secondary,#b5bac1); margin-bottom:6px; letter-spacing:.02em; }
.pc-row { display:flex; gap:6px; align-items:center; }
.pc-input, #purgecord input[type=text], #purgecord input[type=search], #purgecord input[type=datetime-local] { width:100%; height:38px; padding:0 10px; background:var(--input-background,#1e1f22); border:1px solid transparent; border-radius:6px; color:var(--text-normal,#dbdee1); font-size:14px; }
.pc-input:focus { border-color:var(--brand-experiment,#5865f2); outline:none; }
.pc-check { display:flex; align-items:center; gap:8px; font-size:13px; color:var(--text-normal,#dbdee1); margin:6px 0; cursor:pointer; font-weight:400; }
.pc-hint { font-size:12px; color:var(--text-muted,#949ba4); margin:6px 0; }

.pc-btn { height:36px; padding:0 16px; border:none; border-radius:6px; background:var(--button-secondary-background,#4e5058); color:#fff; font-size:14px; font-weight:600; cursor:pointer; }
.pc-btn:hover { filter:brightness(1.1); }
.pc-btn:disabled { opacity:.4; cursor:not-allowed; }
.pc-btn.pc-danger { background:var(--button-danger-background,#da373c); }
.pc-btn.pc-small { height:30px; padding:0 10px; font-size:12px; }

.pc-details { border-top:1px solid var(--background-modifier-accent,rgba(255,255,255,.06)); margin-top:10px; padding-top:10px; }
.pc-details > summary { cursor:pointer; font-size:13px; font-weight:600; color:var(--header-secondary,#b5bac1); }

.pc-footer { display:flex; align-items:center; gap:8px; padding:10px 14px; background:var(--background-secondary,#2b2d31); border-top:1px solid var(--background-tertiary,#1e1f22); }
.pc-progress { flex:1; height:8px; background:var(--background-tertiary,#1e1f22); border-radius:4px; overflow:hidden; }
.pc-progress-bar { height:100%; width:0; background:var(--brand-experiment,#5865f2); transition:width .2s; }
.pc-progress-bar.is-indeterminate { width:30%; animation:pc-indet 1.2s infinite ease-in-out; }
@keyframes pc-indet { 0%{margin-left:-30%} 100%{margin-left:100%} }
.pc-percent { font-size:12px; color:var(--text-muted,#949ba4); min-width:130px; text-align:right; }

#pc-log { margin:0; font-family:Consolas,'Courier New',monospace; font-size:12px; white-space:pre-wrap; word-break:break-word; }
.pc-log-line { margin:2px 0; }
.pc-log-info{color:#00a8fc} .pc-log-verb{color:#949ba4} .pc-log-warn{color:#f0b232} .pc-log-error{color:#f23f43} .pc-log-success{color:#23a559} .pc-log-debug{color:var(--text-normal,#dbdee1)}

.pc-dm-toolbar { display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin-bottom:10px; }
.pc-dm-count { font-size:12px; color:var(--text-muted,#949ba4); margin-left:auto; }
.pc-dm-modes { display:flex; gap:14px; font-size:13px; flex-wrap:wrap; }
.pc-dm-list { display:flex; flex-direction:column; gap:2px; }
.pc-dm-row { display:flex; align-items:center; gap:10px; padding:6px 8px; border-radius:6px; cursor:pointer; }
.pc-dm-row:hover { background:var(--background-modifier-hover,rgba(255,255,255,.04)); }
.pc-dm-avatar { width:32px; height:32px; border-radius:50%; background:var(--background-tertiary,#1e1f22); flex:0 0 auto; object-fit:cover; }
.pc-dm-meta { flex:1; min-width:0; }
.pc-dm-name { font-size:14px; color:var(--text-normal,#f2f3f5); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.pc-dm-time { font-size:11px; color:var(--text-muted,#949ba4); }
.pc-badge { font-size:10px; padding:1px 6px; border-radius:10px; background:var(--background-tertiary,#1e1f22); color:var(--text-muted,#949ba4); text-transform:uppercase; }

.pc-focus { display:flex; align-items:center; gap:10px; padding:8px 14px; background:var(--background-secondary-alt,#232428); border-top:1px solid var(--background-tertiary,#1e1f22); }
.pc-focus[hidden]{ display:none; }
.pc-focus .pc-dm-avatar { width:28px; height:28px; }
.pc-focus-name { font-size:13px; font-weight:600; }
.pc-focus-prog { font-size:11px; color:var(--text-muted,#949ba4); }

.pc-banner { display:flex; align-items:center; gap:10px; padding:10px 14px; background:rgba(240,178,50,.12); border-bottom:1px solid var(--background-tertiary,#1e1f22); font-size:13px; }
.pc-banner[hidden]{ display:none; }

.pc-resize { position:absolute; right:2px; bottom:2px; width:16px; height:16px; cursor:nwse-resize; opacity:.5; background:linear-gradient(135deg,transparent 50%,var(--text-muted,#949ba4) 50%); border-radius:0 0 6px 0; }

#purgecord.pc-redact .pc-priv { filter:blur(5px); transition:filter .1s; }
#purgecord.pc-redact .pc-priv:hover { filter:none; }
`;
