const STORAGE_KEY = 'gearflow_db_v1';
const SESSION_KEY = 'gearflow_session_v1';

const DEFAULT_DATA = {
  users: [
    { id: 1, name: 'Administrador', email: 'admin@gearflow.com', password: '123456', role: 'admin', active: true, address: 'Fortaleza, CE' },
    { id: 2, name: 'Vendedor', email: 'vendedor@gearflow.com', password: '123456', role: 'vendedor', active: true, address: 'Fortaleza, CE' },
    { id: 3, name: 'Cliente', email: 'cliente@gearflow.com', password: '123456', role: 'cliente', active: true, address: 'Rua Ilhéus, 167 - Fortaleza, CE' }
  ],
  products: [
    { id: 1, name: 'Mouse sem fio', category: 'Periféricos', price: 8990, promotional_price: 7490, cost: 4200, stock: 24 },
    { id: 2, name: 'Teclado mecânico', category: 'Periféricos', price: 24990, promotional_price: null, cost: 13500, stock: 12 },
    { id: 3, name: 'Monitor 24 polegadas', category: 'Monitores', price: 79990, promotional_price: 72990, cost: 51000, stock: 4 },
    { id: 4, name: 'Headset Bluetooth', category: 'Áudio', price: 15990, promotional_price: null, cost: 8000, stock: 18 },
    { id: 5, name: 'iPhone 14 128GB', category: 'Eletrônicos', price: 389900, promotional_price: 369900, cost: 295000, stock: 3 }
  ],
  coupons: [
    { id: 1, code: 'GEAR10', type: 'percent', discount: 10, min_purchase: 5000, uses: 1, active: true },
    { id: 2, code: 'BEMVINDO25', type: 'fixed', discount: 2500, min_purchase: 10000, uses: 0, active: true }
  ],
  sales: [
    {
      id: 101,
      buyer: 'Cliente',
      method: 'Pix',
      status: 'Concluído',
      total: 15990,
      cost: 8000,
      discount: 0,
      date: '2026-09-15',
      items: [{ name: 'Headset Bluetooth', qty: 1, price: 15990 }]
    },
    {
      id: 102,
      buyer: 'Cliente',
      method: 'Crédito',
      status: 'Concluído',
      total: 72990,
      cost: 51000,
      discount: 0,
      date: '2026-10-18',
      items: [{ name: 'Monitor 24 polegadas', qty: 1, price: 72990 }]
    },
    {
      id: 103,
      buyer: 'Vendedor',
      method: 'Pix',
      status: 'Concluído',
      total: 29232,
      cost: 17700,
      discount: 3248,
      date: '2026-11-25',
      items: [
        { name: 'Mouse sem fio', qty: 1, price: 7490 },
        { name: 'Teclado mecânico', qty: 1, price: 24990 }
      ]
    }
  ]
};

function getDB() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_DATA));
    return structuredClone(DEFAULT_DATA);
  }
  return JSON.parse(raw);
}

function saveDB(db) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function resetDB() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_DATA));
}

function getCurrentUser() {
  const raw = localStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
}

function setCurrentUser(user) {
  if (user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
}

function getFinalPrice(p) {
  if (p.promotional_price !== null && p.promotional_price >= 0 && p.promotional_price < p.price) {
    return p.promotional_price;
  }
  return p.price;
}

function formatBRL(cents) {
  return ((cents || 0) / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}