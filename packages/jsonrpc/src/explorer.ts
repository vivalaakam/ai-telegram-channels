export const explorerHtml = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>JSON-RPC Explorer</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Inter,-apple-system,BlinkMacSystemFont,sans-serif;background:#0f0f23;color:#e0e0e0;display:flex;min-height:100vh}
.sidebar{width:260px;background:#151530;border-right:1px solid #2a2a5a;padding:20px 16px;overflow-y:auto;flex-shrink:0}
.sidebar h2{font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#6c6c9e;margin-bottom:16px}
.sidebar .info{font-size:11px;color:#6c6c9e;margin-bottom:20px;line-height:1.5}
.method{padding:10px 12px;margin:2px 0;border-radius:6px;cursor:pointer;font-size:13px;font-family:'SF Mono',Menlo,monospace;transition:background .15s}
.method:hover{background:#2a2a5a}
.method.active{background:#4a3aff;color:#fff}
.main{flex:1;overflow-y:auto;display:flex;flex-direction:column}
.topbar{padding:20px 32px;border-bottom:1px solid #2a2a5a;background:#151530}
.topbar h1{font-size:16px;font-family:'SF Mono',Menlo,monospace;color:#fff}
.topbar .meta{font-size:12px;color:#6c6c9e;margin-top:4px}
.content{flex:1;padding:24px 32px;overflow-y:auto}
.empty{color:#6c6c9e;text-align:center;margin-top:120px;font-size:14px}
.method-title{font-size:20px;font-family:'SF Mono',Menlo,monospace;color:#fff;margin-bottom:4px}
.method-desc{color:#8888bb;margin-bottom:24px;font-size:14px}
.params-section{margin-bottom:24px}
.params-section h3{font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#6c6c9e;margin-bottom:12px}
.param-row{margin-bottom:14px}
.param-label{display:flex;align-items:center;gap:6px;font-size:13px;font-family:'SF Mono',Menlo,monospace;margin-bottom:4px}
.param-label .name{color:#fff}
.param-label .type{color:#4a9eff;font-size:11px}
.param-label .required{color:#ff4a6a;font-size:10px;font-weight:700}
.param-hint{font-size:12px;color:#6c6c9e;margin-bottom:4px}
.param-input{width:100%;max-width:480px;padding:8px 12px;background:#1a1a3e;border:1px solid #2a2a5a;border-radius:6px;color:#e0e0e0;font-size:14px;font-family:'SF Mono',Menlo,monospace;outline:none;transition:border-color .15s}
.param-input:focus{border-color:#4a3aff}
.param-input::placeholder{color:#4a4a7a}
.btn{padding:10px 28px;background:#4a3aff;color:#fff;border:none;border-radius:6px;font-size:14px;font-weight:600;cursor:pointer;transition:background .15s}
.btn:hover{background:#3a2aee}
.response-section{margin-top:24px}
.response-section h3{font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#6c6c9e;margin-bottom:12px}
.response-box{background:#0a0a1a;border:1px solid #2a2a5a;border-radius:8px;padding:16px;font-family:'SF Mono',Menlo,monospace;font-size:13px;white-space:pre-wrap;overflow-x:auto;max-height:60vh;overflow-y:auto;line-height:1.6}
.response-box.error{border-color:#ff4a6a33;color:#ff6a8a}
.response-box.success{border-color:#4aff8a33;color:#aaffcc}
.response-meta{display:flex;gap:16px;margin-bottom:8px;font-size:11px;color:#6c6c9e}
.schema-toggle{cursor:pointer;color:#4a9eff;font-size:12px;margin-top:8px;display:inline-block}
.schema-block{margin-top:8px;background:#0a0a1a;border:1px solid #2a2a5a;border-radius:6px;padding:12px;font-family:'SF Mono',Menlo,monospace;font-size:12px;display:none;white-space:pre-wrap;color:#8888bb}
</style></head><body>
<div class="sidebar">
  <h2>JSON-RPC Explorer</h2>
  <div class="info" id="info"></div>
  <h2>Methods</h2>
  <div id="methods"></div>
</div>
<div class="main">
  <div class="topbar"><h1 id="topbar-title">Select a method</h1><div class="meta" id="topbar-meta"></div></div>
  <div class="content" id="content"><div class="empty">Select a method from the sidebar to explore</div></div>
</div>
<script>
const SPEC_URL = '/openrpc.json';
let spec = null;

async function loadSpec() {
  const res = await fetch(SPEC_URL);
  spec = await res.json();
  document.getElementById('info').textContent = spec.info.title + ' v' + spec.info.version;
  const methodsEl = document.getElementById('methods');
  for (const m of spec.methods) {
    const d = document.createElement('div');
    d.className = 'method';
    d.textContent = m.name;
    d.onclick = () => showMethod(m, d);
    methodsEl.appendChild(d);
  }
}

function showMethod(m, el) {
  document.querySelectorAll('.method').forEach(e => e.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('topbar-title').textContent = m.name;
  document.getElementById('topbar-meta').textContent = m.summary || '';

  let html = '<div class="method-desc">' + (m.description || m.summary || '') + '</div>';
  html += '<div class="params-section"><h3>Parameters</h3>';
  for (const p of (m.params || [])) {
    const req = p.required ? '<span class="required">required</span>' : '';
    const def = p.schema.default != null ? ' = ' + JSON.stringify(p.schema.default) : '';
    html += '<div class="param-row">';
    html += '<div class="param-label"><span class="name">' + p.name + '</span> <span class="type">' + p.schema.type + '</span> ' + req + def + '</div>';
    html += '<div class="param-hint">' + (p.schema.description || '') + '</div>';
    html += '<input class="param-input" id="p-' + p.name + '" placeholder="' + p.schema.type + (p.schema.default != null ? ' (default: ' + p.schema.default + ')' : '') + '">';
    html += '</div>';
  }
  if (!m.params || m.params.length === 0) html += '<div style="color:#6c6c9e;font-size:13px">No parameters</div>';
  html += '</div>';
  html += '<button class="btn" onclick="callMethod(\\'' + m.name + '\\')">Execute</button>';
  html += '<span class="schema-toggle" onclick="toggleSchema()">Show result schema &#9662;</span>';
  html += '<div class="schema-block" id="schema-block">' + JSON.stringify(m.result.schema, null, 2) + '</div>';
  html += '<div class="response-section" id="response-section" style="display:none"><h3>Response</h3><div class="response-meta" id="response-meta"></div><div class="response-box" id="response-box"></div></div>';
  document.getElementById('content').innerHTML = html;
}

function toggleSchema() {
  const el = document.getElementById('schema-block');
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

async function callMethod(name) {
  const m = spec.methods.find(m => m.name === name);
  const params = {};
  for (const p of (m.params || [])) {
    const v = document.getElementById('p-' + p.name)?.value;
    if (!v) continue;
    params[p.name] = p.schema.type === 'integer' ? Number(v) : v;
  }
  const t0 = performance.now();
  try {
    const res = await fetch('/', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({jsonrpc: '2.0', method: name, params, id: Date.now()}) });
    const data = await res.json();
    const ms = Math.round(performance.now() - t0);
    const box = document.getElementById('response-box');
    const meta = document.getElementById('response-meta');
    document.getElementById('response-section').style.display = 'block';
    meta.textContent = data.error ? 'Error' : '200 OK' + ' \\u00b7 ' + ms + 'ms';
    box.className = 'response-box ' + (data.error ? 'error' : 'success');
    box.textContent = JSON.stringify(data.error || data.result, null, 2);
  } catch (e) {
    document.getElementById('response-section').style.display = 'block';
    document.getElementById('response-meta').textContent = 'Network error';
    document.getElementById('response-box').className = 'response-box error';
    document.getElementById('response-box').textContent = e.message;
  }
}

loadSpec();
</script></body></html>`;
