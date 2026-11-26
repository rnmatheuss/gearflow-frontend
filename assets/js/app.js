const currentUser = getCurrentUser();
if (!currentUser) {
  window.location.href = 'index.html';
}

let cart = [];
let appliedCoupon = null;

function showFeedback(text, isError = false) {
  const el = document.getElementById('appFeedback');
  if (!el) return;
  el.textContent = text;
  el.className = `feedback-bar ${isError ? 'error' : 'ok'}`;
}

// Configurar usuário e permissões na interface
document.getElementById('userName').textContent = currentUser.name;
document.getElementById('userRole').textContent = currentUser.role;
document.getElementById('deliveryAddress').value = currentUser.address || '';

if (currentUser.role !== 'admin') {
  document.querySelectorAll('[data-admin-only="true"]').forEach((el) => el.classList.add('hidden'));
  switchTab('pdv');
}

function switchTab(tabName) {
  document.querySelectorAll('.nav-item').forEach((b) => b.classList.toggle('active', b.dataset.tab === tabName));
  document.querySelectorAll('.tab-panel').forEach((p) => p.classList.toggle('active', p.id === `tab-${tabName}`));

  const titles = {
    dashboard: 'Dashboard Geral',
    pdv: 'Catálogo & Ponto de Venda (PDV)',
    sales: 'Histórico de Pedidos',
    products: 'Gestão de Produtos & Estoque',
    coupons: 'Gerenciamento de Cupons'
  };
  document.getElementById('pageTitle').textContent = titles[tabName] || 'GearFlow';

  if (tabName === 'dashboard') renderDashboard();
  if (tabName === 'pdv') renderCatalog();
  if (tabName === 'sales') renderSales();
  if (tabName === 'products') renderAdminProducts();
  if (tabName === 'coupons') renderCoupons();
}

document.querySelectorAll('.nav-item').forEach((btn) => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  setCurrentUser(null);
  window.location.href = 'index.html';
});

document.getElementById('resetDemoBtn').addEventListener('click', () => {
  resetDB();
  cart = [];
  appliedCoupon = null;
  renderAll();
  showFeedback('Dados de demonstração restaurados.');
});

// ================= DASHBOARD =================
function renderDashboard() {
  const db = getDB();
  const validSales = db.sales.filter((s) => s.status !== 'Cancelado');
  const revenue = validSales.reduce((acc, s) => acc + s.total, 0);
  const cost = validSales.reduce((acc, s) => acc + (s.cost || 0), 0);
  const profit = revenue - cost;
  const lowStock = db.products.filter((p) => p.stock <= 5).length;

  document.getElementById('kpiRevenue').textContent = formatBRL(revenue);
  document.getElementById('kpiProfit').textContent = formatBRL(profit);
  document.getElementById('kpiSales').textContent = String(validSales.length);
  document.getElementById('kpiLowStock').textContent = String(lowStock);

  // Gráfico de barras mensal
  const months = ['Jul', 'Ago', 'Set', 'Out', 'Nov'];
  const values = [14200, 19800, 15990, 72990, Math.max(29232, validSales.slice(-1)[0]?.total || 29232)];
  const maxVal = Math.max(...values, 1);

  document.getElementById('salesBarChart').innerHTML = months
    .map((m, i) => {
      const pct = Math.max(15, Math.round((values[i] / maxVal) * 100));
      return `
        <div class="bar-col">
          <div class="bar-fill" style="height: ${pct}%" title="${formatBRL(values[i])}"></div>
          <span class="bar-label">${m}</span>
        </div>
      `;
    })
    .join('');

  // Legenda de categorias
  const cats = {};
  db.products.forEach((p) => {
    cats[p.category] = (cats[p.category] || 0) + p.stock;
  });
  const colors = ['var(--cyan)', 'var(--orange)', 'var(--green)', 'var(--yellow)'];
  document.getElementById('categoryLegend').innerHTML = Object.entries(cats)
    .map(([cat, qty], idx) => `
      <div class="legend-item">
        <span class="dot" style="background: ${colors[idx % colors.length]}"></span>
        <span>${cat}: <strong>${qty} un.</strong></span>
      </div>
    `)
    .join('');

  // Últimos pedidos
  document.getElementById('dashboardRecentSales').innerHTML = db.sales
    .slice()
    .reverse()
    .slice(0, 5)
    .map((s) => `
      <tr>
        <td>#${s.id}</td>
        <td>${s.buyer}</td>
        <td>${s.method}</td>
        <td><strong>${formatBRL(s.total)}</strong></td>
        <td><span class="status-pill status-${s.status}">${s.status}</span></td>
      </tr>
    `)
    .join('');
}

// ================= CATÁLOGO E CARRINHO =================
function renderCatalog() {
  const db = getDB();
  const query = (document.getElementById('searchInput').value || '').trim().toLowerCase();
  const filtered = db.products.filter(
    (p) => p.name.toLowerCase().includes(query) || p.category.toLowerCase().includes(query)
  );

  const grid = document.getElementById('catalogGrid');
  if (!filtered.length) {
    grid.innerHTML = '<p style="color: var(--text-muted);">Nenhum produto encontrado.</p>';
    return;
  }

  grid.innerHTML = filtered
    .map((p) => {
      const final = getFinalPrice(p);
      const hasPromo = final < p.price;
      return `
        <article class="prod-card">
          <div>
            <span class="prod-cat">${p.category} • Estoque: ${p.stock}</span>
            <h4>${p.name}</h4>
          </div>
          <div>
            <div class="prod-price">
              ${hasPromo ? `<span class="prod-old">${formatBRL(p.price)}</span>` : ''}
              ${formatBRL(final)}
            </div>
            <button type="button" class="btn btn-orange btn-sm" style="width:100%; margin-top:10px;"
              ${p.stock <= 0 ? 'disabled' : ''} onclick="addToCart(${p.id})">
              ${p.stock > 0 ? '+ Adicionar' : 'Sem estoque'}
            </button>
          </div>
        </article>
      `;
    })
    .join('');
}

document.getElementById('searchInput')?.addEventListener('input', renderCatalog);

window.addToCart = function (productId) {
  const db = getDB();
  const prod = db.products.find((p) => p.id === productId);
  if (!prod || prod.stock <= 0) return;

  const item = cart.find((c) => c.id === productId);
  if (item) {
    if (item.qty >= prod.stock) {
      showFeedback('Estoque máximo atingido para este item.', true);
      return;
    }
    item.qty += 1;
  } else {
    cart.push({ id: prod.id, name: prod.name, price: getFinalPrice(prod), cost: prod.cost || 0, qty: 1 });
  }

  appliedCoupon = null;
  renderCart();
  showFeedback(`${prod.name} adicionado ao carrinho.`);
};

window.changeQty = function (productId, delta) {
  const db = getDB();
  const prod = db.products.find((p) => p.id === productId);
  const idx = cart.findIndex((c) => c.id === productId);
  if (idx === -1) return;

  const nextQty = cart[idx].qty + delta;
  if (nextQty <= 0) {
    cart.splice(idx, 1);
  } else if (prod && nextQty <= prod.stock) {
    cart[idx].qty = nextQty;
  }
  appliedCoupon = null;
  renderCart();
};

function getSubtotal() {
  return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function renderCart() {
  const count = cart.reduce((sum, i) => sum + i.qty, 0);
  document.getElementById('cartBadge').textContent = String(count);

  const list = document.getElementById('cartItems');
  if (!cart.length) {
    list.innerHTML = '<p style="color: var(--text-muted); font-size:0.88rem;">Carrinho vazio.</p>';
  } else {
    list.innerHTML = cart
      .map((item) => `
        <div class="cart-row">
          <div>
            <strong>${item.name}</strong>
            <div style="color: var(--text-muted); font-size:0.8rem;">${formatBRL(item.price)} un.</div>
          </div>
          <div class="qty-controls">
            <button type="button" class="qty-btn" onclick="changeQty(${item.id}, -1)">-</button>
            <span>${item.qty}</span>
            <button type="button" class="qty-btn" onclick="changeQty(${item.id}, 1)">+</button>
          </div>
        </div>
      `)
      .join('');
  }

  const subtotal = getSubtotal();
  let discount = 0;
  if (appliedCoupon) {
    discount = appliedCoupon.type === 'percent'
      ? Math.round((subtotal * appliedCoupon.discount) / 100)
      : appliedCoupon.discount;
    discount = Math.min(discount, subtotal);
  }

  document.getElementById('subtotalText').textContent = formatBRL(subtotal);
  document.getElementById('discountText').textContent = formatBRL(discount);
  document.getElementById('totalText').textContent = formatBRL(Math.max(0, subtotal - discount));
}

document.getElementById('applyCouponBtn')?.addEventListener('click', () => {
  const code = document.getElementById('couponCode').value.trim().toUpperCase();
  const subtotal = getSubtotal();
  if (!code || subtotal <= 0) {
    showFeedback('Adicione itens e informe um código válido.', true);
    return;
  }

  const db = getDB();
  const coupon = db.coupons.find((c) => c.code === code && c.active);
  if (!coupon) {
    appliedCoupon = null;
    renderCart();
    showFeedback('Cupom inválido ou inativo.', true);
    return;
  }

  if (subtotal < coupon.min_purchase) {
    showFeedback(`Compra mínima de ${formatBRL(coupon.min_purchase)} para este cupom.`, true);
    return;
  }

  appliedCoupon = coupon;
  renderCart();
  showFeedback(`Cupom ${coupon.code} aplicado com sucesso!`);
});

document.getElementById('payMethod')?.addEventListener('change', (e) => {
  document.getElementById('installmentsWrap').classList.toggle('hidden', e.target.value !== 'Crédito');
});

document.getElementById('checkoutForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!cart.length) {
    showFeedback('Seu carrinho está vazio.', true);
    return;
  }

  const db = getDB();
  const subtotal = getSubtotal();
  let discount = 0;
  if (appliedCoupon) {
    discount = appliedCoupon.type === 'percent'
      ? Math.round((subtotal * appliedCoupon.discount) / 100)
      : appliedCoupon.discount;
    discount = Math.min(discount, subtotal);
    const cDb = db.coupons.find((c) => c.code === appliedCoupon.code);
    if (cDb) cDb.uses += 1;
  }

  const totalCost = cart.reduce((sum, i) => sum + i.cost * i.qty, 0);
  cart.forEach((item) => {
    const pDb = db.products.find((p) => p.id === item.id);
    if (pDb) pDb.stock = Math.max(0, pDb.stock - item.qty);
  });

  const newSale = {
    id: (db.sales.at(-1)?.id || 100) + 1,
    buyer: currentUser.name,
    method: document.getElementById('payMethod').value,
    status: currentUser.role === 'cliente' ? 'Pendente' : 'Concluído',
    total: subtotal - discount,
    cost: totalCost,
    discount,
    date: new Date().toISOString().slice(0, 10),
    items: cart.map(({ name, qty, price }) => ({ name, qty, price }))
  };

  db.sales.push(newSale);
  saveDB(db);

  cart = [];
  appliedCoupon = null;
  document.getElementById('couponCode').value = '';
  renderAll();
  showFeedback(`Pedido #${newSale.id} registrado (${newSale.status})!`);
});

// ================= PEDIDOS =================
function renderSales() {
  const db = getDB();
  const list = currentUser.role === 'admin'
    ? db.sales
    : db.sales.filter((s) => s.buyer === currentUser.name);

  document.getElementById('salesTableBody').innerHTML = list
    .slice()
    .reverse()
    .map((s) => `
      <tr>
        <td><strong>#${s.id}</strong></td>
        <td>${s.buyer}</td>
        <td>${s.items.map((i) => `${i.qty}x ${i.name}`).join(', ')}</td>
        <td>${s.method}</td>
        <td><strong>${formatBRL(s.total)}</strong></td>
        <td><span class="status-pill status-${s.status}">${s.status}</span></td>
        <td>
          ${currentUser.role === 'admin' && s.status !== 'Cancelado'
            ? `<button class="btn btn-sm" onclick="completeSale(${s.id})">Concluir</button>`
            : '-'}
        </td>
      </tr>
    `)
    .join('');
}

window.completeSale = function (id) {
  const db = getDB();
  const sale = db.sales.find((s) => s.id === id);
  if (sale) {
    sale.status = 'Concluído';
    saveDB(db);
    renderAll();
    showFeedback(`Pedido #${id} marcado como Concluído.`);
  }
};

// ================= PRODUTOS & CUPONS (ADMIN) =================
function renderAdminProducts() {
  const db = getDB();
  document.getElementById('adminProductsTable').innerHTML = db.products
    .map((p) => `
      <tr>
        <td><strong>${p.name}</strong></td>
        <td>${p.category}</td>
        <td>${formatBRL(getFinalPrice(p))}</td>
        <td>${p.stock} un.</td>
        <td>
          <button class="btn btn-sm" onclick="adjustStock(${p.id}, 5)">+5</button>
          <button class="btn btn-sm" onclick="adjustStock(${p.id}, -1)">-1</button>
        </td>
      </tr>
    `)
    .join('');
}

window.adjustStock = function (id, delta) {
  const db = getDB();
  const prod = db.products.find((p) => p.id === id);
  if (prod) {
    prod.stock = Math.max(0, prod.stock + delta);
    saveDB(db);
    renderAll();
    showFeedback(`Estoque de ${prod.name} atualizado para ${prod.stock}.`);
  }
};

document.getElementById('createProductForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const db = getDB();
  db.products.push({
    id: Date.now(),
    name: String(fd.get('name')).trim(),
    category: String(fd.get('category')).trim(),
    price: Math.round(Number(fd.get('price')) * 100),
    cost: Math.round(Number(fd.get('cost')) * 100),
    promotional_price: null,
    stock: Number(fd.get('stock'))
  });
  saveDB(db);
  e.target.reset();
  renderAll();
  showFeedback('Produto cadastrado com sucesso!');
});

function renderCoupons() {
  const db = getDB();
  document.getElementById('couponsTableBody').innerHTML = db.coupons
    .map((c) => `
      <tr>
        <td><strong>${c.code}</strong></td>
        <td>${c.type === 'percent' ? `${c.discount}%` : formatBRL(c.discount)}</td>
        <td>${formatBRL(c.min_purchase)}</td>
        <td>${c.uses}</td>
      </tr>
    `)
    .join('');
}

document.getElementById('createCouponForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const type = String(fd.get('type'));
  const rawDisc = Number(fd.get('discount'));
  const db = getDB();

  db.coupons.push({
    id: Date.now(),
    code: String(fd.get('code')).trim().toUpperCase(),
    type,
    discount: type === 'percent' ? Math.round(rawDisc) : Math.round(rawDisc * 100),
    min_purchase: Math.round(Number(fd.get('min_purchase') || 0) * 100),
    uses: 0,
    active: true
  });
  saveDB(db);
  e.target.reset();
  renderCoupons();
  showFeedback('Cupom criado com sucesso!');
});

function renderAll() {
  renderDashboard();
  renderCatalog();
  renderCart();
  renderSales();
  renderAdminProducts();
  renderCoupons();
}

renderAll();