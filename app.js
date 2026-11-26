/* GearFlow PDV — 100% front-end. Os dados ficam no localStorage do navegador. */
const KEY = 'gearflow_v1';
const $ = id => document.getElementById(id);
const R = n => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const D = d => new Date(d).toLocaleDateString('pt-BR');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- Dados ---------- */
function seed() {
  const P = [
    ['TEC-001', 'Teclado Mecânico Kumara', 'Redragon', 229.9, 15, 5],
    ['MOU-002', 'Mouse Gamer G203', 'Logitech', 119.9, 3, 5],
    ['HEA-003', 'Headset Cloud Stinger', 'HyperX', 249.0, 8, 4],
    ['MON-004', 'Monitor 24" Full HD', 'LG', 799.0, 6, 3],
    ['WEB-005', 'Webcam C920 HD Pro', 'Logitech', 389.0, 0, 3],
    ['PAD-006', 'Mousepad Speed XL', 'Havit', 59.9, 25, 8],
    ['SSD-007', 'SSD 480GB SATA', 'Kingston', 219.0, 12, 5],
    ['HUB-008', 'Hub USB 3.0 4 portas', 'Multilaser', 49.9, 20, 6],
  ];
  const products = P.map((p, i) => ({ id: i + 1, sku: p[0], name: p[1], brand: p[2], price: p[3], stock: p[4], min: p[5] }));
  const users = [
    { id: 1, user: 'admin', pass: 'admin123', name: 'Administrador', role: 'admin' },
    { id: 2, user: 'vendedor', pass: 'vend123', name: 'Vendedor Demo', role: 'vendedor' },
    { id: 3, user: 'cliente', pass: 'cli123', name: 'Cliente Demo', role: 'cliente' },
  ];
  const sales = [];
  for (let i = 0; i < 12; i++) {
    const p = products[i % 8], q = 1 + (i % 3);
    sales.push({ id: i + 1, date: new Date(Date.now() - (i % 7) * 864e5).toISOString(), by: 2, byName: 'Vendedor Demo',
      client: 'Cliente balcão', items: [{ id: p.id, name: p.name, qty: q, price: p.price }], discount: 0, total: p.price * q });
  }
  return { products, users, sales };
}
function load() {
  try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && d.products) return d; } catch (e) {}
  return seed();
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} }

let db = load(), me = null, view = '', cart = [], q = '';

/* ---------- Perfis e permissões (RN) ---------- */
const MENUS = {
  admin: [['dashboard', 'Dashboard', '📊'], ['produtos', 'Produtos', '📦'], ['estoque', 'Estoque', '🏷️'], ['usuarios', 'Usuários', '👥'], ['vendas', 'Vendas', '💰'], ['relatorios', 'Relatórios', '📈']],
  vendedor: [['dashboard', 'Dashboard', '📊'], ['produtos', 'Produtos', '📦'], ['pdv', 'Nova Venda', '🛒'], ['historico', 'Histórico', '🧾']],
  cliente: [['inicio', 'Início', '🏠'], ['produtos', 'Produtos', '📦'], ['carrinho', 'Carrinho', '🛒'], ['pedidos', 'Meus Pedidos', '🧾'], ['perfil', 'Perfil', '👤']],
};
const PERM = { admin: ['product.edit', 'stock.edit', 'user.edit'], vendedor: [], cliente: [] };
function need(a) { if (!PERM[me.role].includes(a)) { toast('Sem permissão para esta ação', 1); return false; } return true; }

/* ---------- Login ---------- */
function fill(u, p) { $('lu').value = u; $('lp').value = p; }
function login(e) {
  e.preventDefault();
  const u = db.users.find(x => x.user === $('lu').value.trim() && x.pass === $('lp').value);
  if (!u) { $('lerr').textContent = 'Usuário ou senha inválidos.'; return; }
  me = u; cart = []; $('lerr').textContent = '';
  $('login').hidden = true; $('app').hidden = false;
  go(MENUS[u.role][0][0]);
}
function logout() { me = null; $('app').hidden = true; $('login').hidden = false; $('lp').value = ''; }
function resetDemo() { try { localStorage.removeItem(KEY); } catch (e) {} db = seed(); toast('Dados de demonstração restaurados'); }

/* ---------- Navegação ---------- */
function go(v) {
  view = v; q = '';
  const m = MENUS[me.role];
  $('side').innerHTML = `<div class="brand">⚙ Gear<span>Flow</span></div>` +
    m.map(x => `<button class="nav ${x[0] === v ? 'on' : ''}" onclick="go('${x[0]}')">${x[2]} ${x[1]}</button>`).join('') +
    `<button class="nav out" onclick="logout()">⎋ Sair</button>`;
  $('side').classList.remove('open');
  $('who').innerHTML = `<b>${esc(me.name)}</b> · <small>${me.role}</small>`;
  $('main').innerHTML = `<h2>${m.find(x => x[0] === v)[1]}</h2>` + VIEWS[v]();
}

/* ---------- Helpers de dados ---------- */
const mySales = () => me.role === 'admin' ? db.sales : db.sales.filter(s => me.role === 'vendedor' ? s.by === me.id : s.clientId === me.id);
const card = (l, v, c = '') => `<div class="card ${c}"><small>${l}</small><strong>${v}</strong></div>`;
const subtotal = () => cart.reduce((a, c) => a + db.products.find(p => p.id === c.id).price * c.qty, 0);

function prodList(m) {
  const t = q.toLowerCase();
  const L = db.products.filter(p => (p.name + p.brand + p.sku).toLowerCase().includes(t));
  if (!L.length) return '<p class="muted">Nenhum produto encontrado.</p>';
  const badge = p => p.stock === 0 ? '<span class="tag red">Esgotado</span>' : p.stock <= p.min ? `<span class="tag amber">${p.stock} un.</span>` : `<span class="tag green">${p.stock} un.</span>`;
  if (m === 'cards') return `<div class="grid">${L.map(p => `<div class="pc"><div class="ph">⌨️</div><small>${esc(p.brand)} · ${esc(p.sku)}</small><h4>${esc(p.name)}</h4><div class="row" style="margin:0"><strong>${R(p.price)}</strong>${badge(p)}</div><button class="btn" ${p.stock ? '' : 'disabled'} onclick="add(${p.id})">Adicionar ao carrinho</button></div>`).join('')}</div>`;
  if (m === 'pdv') return L.map(p => `<div class="li"><div><b>${esc(p.name)}</b><small>${esc(p.sku)} · ${badge(p)}</small></div><strong>${R(p.price)}</strong><button class="btn sm" ${p.stock ? '' : 'disabled'} onclick="add(${p.id})">+</button></div>`).join('');
  return `<div class="tw"><table><tr><th>SKU</th><th>Produto</th><th>Marca</th><th>Preço</th><th>Estoque</th>${m !== 'ro' ? '<th></th>' : ''}</tr>${L.map(p => `<tr><td>${esc(p.sku)}</td><td>${esc(p.name)}</td><td>${esc(p.brand)}</td><td>${R(p.price)}</td><td>${badge(p)}</td>` +
    (m === 'admin' ? `<td class="act"><button class="btn sm ghost" onclick="editProduct(${p.id})">Editar</button><button class="btn sm danger" onclick="delProduct(${p.id})">Excluir</button></td>`
      : m === 'stock' ? `<td class="act"><button class="btn sm" onclick="stockIn(${p.id})">Dar entrada</button></td>` : '') + '</tr>').join('')}</table></div>`;
}
const searchBox = (m, extra = '') => `<div class="bar"><input placeholder="Buscar por nome, marca ou SKU" oninput="q=this.value;$('plist').innerHTML=prodList('${m}')">${extra}</div>`;

function salesTable(L) {
  if (!L.length) return '<p class="muted">Nenhuma venda registrada.</p>';
  return `<div class="tw"><table><tr><th>Nº</th><th>Data</th><th>Cliente</th><th>Vendedor</th><th>Itens</th><th>Desc.</th><th>Total</th><th>Garantia até</th></tr>${L.slice().reverse().map(s => `<tr><td>#${s.id}</td><td>${D(s.date)}</td><td>${esc(s.client)}</td><td>${esc(s.byName)}</td><td>${s.items.map(i => `${i.qty}× ${esc(i.name)}`).join('<br>')}</td><td>${s.discount}%</td><td><b>${R(s.total)}</b></td><td>${D(new Date(s.date).getTime() + 90 * 864e5)}</td></tr>`).join('')}</table></div>`;
}

/* ---------- Telas ---------- */
const VIEWS = {
  dashboard() {
    const s = mySales(), tot = s.reduce((a, x) => a + x.total, 0), low = db.products.filter(p => p.stock <= p.min);
    const days = [...Array(7)].map((_, i) => {
      const d = new Date(Date.now() - (6 - i) * 864e5);
      return [d.toLocaleDateString('pt-BR', { weekday: 'short' }), s.filter(x => new Date(x.date).toDateString() === d.toDateString()).reduce((a, x) => a + x.total, 0)];
    });
    const mx = Math.max(...days.map(d => d[1]), 1);
    return `<div class="cards">${card('Faturamento', R(tot))}${card('Vendas', s.length)}${card('Ticket médio', R(s.length ? tot / s.length : 0))}${card('Estoque baixo', low.length, low.length ? 'warn' : '')}</div>
    <div class="box"><h3>Vendas nos últimos 7 dias</h3><div class="bars">${days.map(d => `<div><b>${d[1] ? R(d[1]) : '—'}</b><em><i style="height:${d[1] / mx * 100}%"></i></em><span>${d[0]}</span></div>`).join('')}</div></div>
    ${low.length ? `<div class="box"><h3>⚠️ Repor estoque</h3>${low.map(p => `<p>${esc(p.name)} — <b>${p.stock}</b> un. (mínimo ${p.min})</p>`).join('')}</div>` : ''}`;
  },
  produtos() {
    const m = me.role === 'admin' ? 'admin' : me.role === 'cliente' ? 'cards' : 'ro';
    return searchBox(m, m === 'admin' ? '<button class="btn" onclick="editProduct()">+ Novo produto</button>' : '') + `<div id="plist">${prodList(m)}</div>`;
  },
  estoque() { return searchBox('stock') + `<div id="plist">${prodList('stock')}</div>`; },
  usuarios() {
    return `<div class="bar"><button class="btn" onclick="newUser()">+ Novo usuário</button></div><div class="tw"><table><tr><th>Nome</th><th>Login</th><th>Perfil</th><th></th></tr>${db.users.map(u => `<tr><td>${esc(u.name)}</td><td>${esc(u.user)}</td><td>${u.role}</td><td class="act">${u.id === me.id ? '<small>(você)</small>' : `<button class="btn sm danger" onclick="delUser(${u.id})">Excluir</button>`}</td></tr>`).join('')}</table></div>`;
  },
  vendas() { return salesTable(db.sales); },
  historico() { return salesTable(mySales()); },
  pedidos() { return salesTable(mySales()); },
  relatorios() {
    const m = {}, v = {};
    db.sales.forEach(s => { s.items.forEach(i => m[i.name] = (m[i.name] || 0) + i.qty); v[s.byName] = (v[s.byName] || 0) + s.total; });
    const bar = (o, f) => { const e = Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 6), mx = e[0] ? e[0][1] : 1; return e.map(([k, x]) => `<div class="hb"><span>${esc(k)}</span><i style="width:${x / mx * 100}%"></i><b>${f(x)}</b></div>`).join('') || '<p class="muted">Sem dados.</p>'; };
    return `<div class="box"><h3>Produtos mais vendidos</h3>${bar(m, x => x + ' un.')}</div><div class="box"><h3>Faturamento por vendedor / canal</h3>${bar(v, R)}</div>`;
  },
  pdv() {
    return `<div class="pdv"><div class="box">${searchBox('pdv')}<div id="plist">${prodList('pdv')}</div></div><div class="box" id="cart">${cartPanel()}</div></div>`;
  },
  carrinho() { return `<div class="box" id="cart" style="max-width:520px">${cartPanel()}</div>`; },
  inicio() {
    const s = mySales();
    return `<div class="hero"><h3>Olá, ${esc(me.name)}! 👋</h3><p>Confira os periféricos disponíveis e monte seu pedido.</p><button class="btn" style="margin-top:.8rem" onclick="go('produtos')">Ver produtos</button></div>
    <div class="cards">${card('Meus pedidos', s.length)}${card('Total gasto', R(s.reduce((a, x) => a + x.total, 0)))}</div>`;
  },
  perfil() {
    return `<div class="box" style="max-width:420px"><p><small>Nome</small><br><b>${esc(me.name)}</b></p><br><p><small>Usuário</small><br><b>${esc(me.user)}</b></p><br><p><small>Perfil</small><br><b>${me.role}</b></p><button class="btn" style="margin-top:1rem" onclick="editProfile()">Editar dados</button></div>`;
  },
};

/* ---------- Carrinho / PDV ---------- */
function cartPanel() {
  const L = cart.map(c => ({ ...db.products.find(p => p.id === c.id), qty: c.qty })), sel = me.role === 'vendedor';
  return `<h3>🛒 ${sel ? 'Venda atual' : 'Seu carrinho'}</h3>` +
    (L.length ? L.map(x => `<div class="li"><div><b>${esc(x.name)}</b><small>${R(x.price)}</small></div><div class="qty"><button onclick="qty(${x.id},-1)">−</button><span>${x.qty}</span><button onclick="qty(${x.id},1)">+</button></div></div>`).join('') : '<p class="muted">Carrinho vazio.</p>') +
    (sel ? `<label>Cliente<input id="cli" placeholder="Nome do cliente (garantia de 90 dias)"></label><label>Desconto (%) — máx. 10%<input id="disc" type="number" min="0" max="10" value="0" oninput="upd()"></label>` : '') +
    `<div class="tot"><span>Total</span><strong id="tot">${R(subtotal())}</strong></div><button class="btn full" onclick="checkout()" ${L.length ? '' : 'disabled'}>Finalizar ${sel ? 'venda' : 'pedido'}</button>`;
}
function refreshCart() {
  if (!$('cart')) return;
  const c = $('cli') && $('cli').value, d = $('disc') && $('disc').value;
  $('cart').innerHTML = cartPanel();
  if ($('cli')) { $('cli').value = c || ''; $('disc').value = d || 0; upd(); }
}
function upd() {
  const d = Math.min(Math.max(+($('disc') ? $('disc').value : 0) || 0, 0), 100);
  $('tot').textContent = R(subtotal() * (1 - d / 100));
}
function add(id) {
  const p = db.products.find(x => x.id === id), c = cart.find(x => x.id === id);
  if ((c ? c.qty : 0) + 1 > p.stock) return toast('Estoque insuficiente (RN-01)', 1);
  c ? c.qty++ : cart.push({ id, qty: 1 });
  refreshCart(); toast(p.name + ' adicionado');
}
function qty(id, d) {
  const c = cart.find(x => x.id === id), p = db.products.find(x => x.id === id);
  if (c.qty + d > p.stock) return toast('Estoque insuficiente (RN-01)', 1);
  c.qty += d;
  if (c.qty <= 0) cart = cart.filter(x => x.id !== id);
  refreshCart();
}
function checkout() {
  if (!cart.length) return toast('Carrinho vazio', 1);
  const sel = me.role === 'vendedor', disc = sel ? +$('disc').value || 0 : 0;
  if (disc < 0 || disc > 10) return toast('Vendedor pode dar no máximo 10% de desconto (RN-02)', 1);
  for (const c of cart) { const p = db.products.find(x => x.id === c.id); if (!p || p.stock < c.qty) return toast('Estoque insuficiente para ' + (p ? p.name : 'item'), 1); }
  const items = cart.map(c => { const p = db.products.find(x => x.id === c.id); p.stock -= c.qty; return { id: p.id, name: p.name, qty: c.qty, price: p.price }; });
  db.sales.push({
    id: db.sales.length + 1, date: new Date().toISOString(), items, discount: disc, total: subtotal() * (1 - disc / 100),
    by: sel ? me.id : null, byName: sel ? me.name : 'Loja online', clientId: sel ? null : me.id,
    client: sel ? ($('cli').value.trim() || 'Cliente balcão') : me.name,
  });
  cart = []; save(); toast('Venda concluída! Estoque atualizado.');
  go(sel ? 'historico' : 'pedidos');
}

/* ---------- Formulários (admin) ---------- */
function openForm(t, F, cb) {
  $('dt').textContent = t;
  $('df').innerHTML = F.map(f => `<label>${f.l}` + (f.o
    ? `<select name="${f.k}">${f.o.map(o => `<option value="${o[0]}" ${o[0] == f.v ? 'selected' : ''}>${o[1]}</option>`).join('')}</select>`
    : `<input name="${f.k}" type="${f.t || 'text'}" ${f.t === 'number' ? 'min="0" step="any"' : ''} value="${esc(f.v ?? '')}" required>`) + '</label>').join('') +
    '<div class="row"><button type="button" class="btn ghost" id="dcancel">Cancelar</button><button class="btn">Salvar</button></div>';
  $('dcancel').onclick = () => $('dlg').close();
  $('df').onsubmit = e => { e.preventDefault(); if (cb(Object.fromEntries(new FormData($('df')))) !== false) $('dlg').close(); };
  $('dlg').showModal();
}
function editProduct(id) {
  if (!need('product.edit')) return;
  const p = id ? db.products.find(x => x.id === id) : {};
  openForm(id ? 'Editar produto' : 'Novo produto', [
    { k: 'sku', l: 'SKU', v: p.sku }, { k: 'name', l: 'Nome', v: p.name }, { k: 'brand', l: 'Marca', v: p.brand },
    { k: 'price', l: 'Preço (R$)', t: 'number', v: p.price }, { k: 'stock', l: 'Estoque', t: 'number', v: p.stock }, { k: 'min', l: 'Estoque mínimo', t: 'number', v: p.min },
  ], d => {
    const o = { sku: d.sku.trim(), name: d.name.trim(), brand: d.brand.trim(), price: +d.price, stock: +d.stock, min: +d.min };
    if (id) Object.assign(p, o); else db.products.push({ id: Math.max(0, ...db.products.map(x => x.id)) + 1, ...o });
    save(); go(view); toast('Produto salvo');
  });
}
function delProduct(id) {
  if (!need('product.edit') || !confirm('Excluir este produto?')) return;
  db.products = db.products.filter(x => x.id !== id); save(); go(view); toast('Produto excluído');
}
function stockIn(id) {
  if (!need('stock.edit')) return;
  const p = db.products.find(x => x.id === id);
  openForm('Entrada de mercadoria — ' + p.name, [{ k: 'n', l: 'Quantidade recebida', t: 'number', v: 1 }], d => { p.stock += Math.round(+d.n); save(); go(view); toast('Estoque atualizado'); });
}
function newUser() {
  if (!need('user.edit')) return;
  openForm('Novo usuário', [
    { k: 'name', l: 'Nome completo' }, { k: 'user', l: 'Login' }, { k: 'pass', l: 'Senha', t: 'password' },
    { k: 'role', l: 'Perfil', v: 'vendedor', o: [['admin', 'Administrador'], ['vendedor', 'Vendedor'], ['cliente', 'Cliente']] },
  ], d => {
    if (db.users.some(u => u.user === d.user.trim())) { toast('Esse login já existe', 1); return false; }
    db.users.push({ id: Math.max(0, ...db.users.map(x => x.id)) + 1, user: d.user.trim(), pass: d.pass, name: d.name.trim(), role: d.role });
    save(); go(view); toast('Usuário criado');
  });
}
function delUser(id) {
  if (!need('user.edit') || !confirm('Excluir este usuário?')) return;
  db.users = db.users.filter(x => x.id !== id); save(); go(view);
}
function editProfile() {
  openForm('Editar meus dados', [{ k: 'name', l: 'Nome', v: me.name }, { k: 'pass', l: 'Nova senha', t: 'password', v: me.pass }], d => {
    me.name = d.name.trim(); me.pass = d.pass; save(); go(view); toast('Perfil atualizado');
  });
}

/* ---------- Aviso ---------- */
let tt;
function toast(msg, bad) {
  const t = $('toast'); t.textContent = msg; t.className = 'show' + (bad ? ' bad' : '');
  clearTimeout(tt); tt = setTimeout(() => t.className = '', 2600);
}
