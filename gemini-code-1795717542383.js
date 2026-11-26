document.getElementById('loginForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  const email = String(form.get('email') || '').trim().toLowerCase();
  const password = String(form.get('password') || '');
  const msg = document.getElementById('loginMsg');

  const db = getDB();
  const user = db.users.find((u) => u.email === email && u.password === password);

  if (!user) {
    msg.textContent = 'E-mail ou senha inválidos.';
    msg.className = 'feedback-bar error';
    return;
  }

  if (!user.active) {
    msg.textContent = 'Conta de vendedor aguardando aprovação do administrador.';
    msg.className = 'feedback-bar error';
    return;
  }

  setCurrentUser({ id: user.id, name: user.name, email: user.email, role: user.role, address: user.address || '' });
  window.location.href = 'app.html';
});

document.getElementById('registerForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  const name = String(form.get('name') || '').trim();
  const email = String(form.get('email') || '').trim().toLowerCase();
  const cpf = String(form.get('cpf') || '').trim();
  const phone = String(form.get('phone') || '').trim();
  const role = String(form.get('role') || 'cliente');
  const password = String(form.get('password') || '');
  const msg = document.getElementById('registerMsg');

  const db = getDB();
  if (db.users.some((u) => u.email === email)) {
    msg.textContent = 'Este e-mail já está cadastrado.';
    msg.className = 'feedback-bar error';
    return;
  }

  const isClient = role === 'cliente';
  db.users.push({
    id: Date.now(),
    name,
    email,
    cpf,
    phone,
    role,
    password,
    active: isClient,
    address: ''
  });
  saveDB(db);
  e.target.reset();

  msg.textContent = isClient
    ? 'Cadastro realizado! Você já pode fazer login.'
    : 'Solicitação enviada! Aguarde aprovação do administrador.';
  msg.className = 'feedback-bar ok';
});