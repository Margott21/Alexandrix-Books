// Alexandrix Books — Auth (front-end only, localStorage)
// Verificação: email válido, senha forte com hash SHA-256, checagem de duplicidade,
// senha comparada por hash (não em texto puro), sessão persistida.

const USERS_KEY = 'alexandrix_users';
const SESSION_KEY = 'alexandrix_session';
const USER_KEY = 'alexandrix_user';

const $ = (s) => document.querySelector(s);

async function sha256(text) {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const getUsers = () => { try { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); } catch { return []; } };
const saveUsers = (u) => localStorage.setItem(USERS_KEY, JSON.stringify(u));
const isEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);

function showMsg(el, text, type) {
  el.textContent = text;
  el.className = 'auth-msg ' + type;
}

// Tabs
document.querySelectorAll('.auth-tabs button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.auth-tabs button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const isLogin = btn.dataset.tab === 'login';
    $('#loginForm').style.display = isLogin ? '' : 'none';
    $('#signupForm').style.display = isLogin ? 'none' : '';
    $('#authTitle').textContent = isLogin ? 'Bem-vindo de volta' : 'Criar sua conta';
    $('#authSub').textContent = isLogin ? 'Entre para acessar sua estante cósmica' : 'Junte-se à biblioteca cósmica';
  });
});

// Password strength
function checkStrength(pwd) {
  const checks = {
    len: pwd.length >= 8,
    upper: /[A-Z]/.test(pwd),
    num: /\d/.test(pwd),
    sym: /[^A-Za-z0-9]/.test(pwd),
  };
  const score = Object.values(checks).filter(Boolean).length;
  return { checks, score };
}

$('#sPass').addEventListener('input', e => {
  const { checks, score } = checkStrength(e.target.value);
  document.querySelectorAll('#pwdChecks li').forEach(li => {
    li.classList.toggle('ok', checks[li.dataset.c]);
  });
  const bar = $('#pwdBar');
  const pct = (score / 4) * 100;
  bar.style.width = pct + '%';
  bar.style.background = score <= 1 ? '#ff6b6b' : score === 2 ? '#ffb86b' : score === 3 ? '#ffe66b' : '#8affb2';
  validateSignup();
});
['sName','sEmail','sPass','sPass2'].forEach(id => $('#'+id).addEventListener('input', validateSignup));

function validateSignup() {
  const name = $('#sName').value.trim();
  const email = $('#sEmail').value.trim();
  const p1 = $('#sPass').value;
  const p2 = $('#sPass2').value;
  const { score } = checkStrength(p1);
  const ok = name.length >= 2 && isEmail(email) && score === 4 && p1 === p2;
  $('#signupBtn').disabled = !ok;
}

// SIGNUP
$('#signupForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = $('#signupMsg');
  const name = $('#sName').value.trim();
  const email = $('#sEmail').value.trim().toLowerCase();
  const pass = $('#sPass').value;
  const pass2 = $('#sPass2').value;

  if (!isEmail(email)) return showMsg(msg, 'Email inválido.', 'error');
  if (pass !== pass2) return showMsg(msg, 'As senhas não coincidem.', 'error');
  if (checkStrength(pass).score < 4) return showMsg(msg, 'Senha muito fraca.', 'error');

  const users = getUsers();
  if (users.some(u => u.email === email)) return showMsg(msg, 'Este email já está cadastrado.', 'error');

  const salt = crypto.getRandomValues(new Uint8Array(8)).reduce((a,b)=>a+b.toString(16).padStart(2,'0'),'');
  const hash = await sha256(salt + pass);

  users.push({ id: Date.now(), name, email, salt, hash, createdAt: new Date().toISOString() });
  saveUsers(users);
  showMsg(msg, '✓ Conta criada! Fazendo login...', 'ok');

  await login(email, pass, msg);
});

// LOGIN
$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = $('#loginMsg');
  const email = $('#loginEmail').value.trim().toLowerCase();
  const pass = $('#loginPass').value;
  if (!isEmail(email)) return showMsg(msg, 'Email inválido.', 'error');
  if (!pass) return showMsg(msg, 'Informe a senha.', 'error');
  await login(email, pass, msg);
});

async function login(email, pass, msg) {
  const users = getUsers();
  const user = users.find(u => u.email === email);
  if (!user) return showMsg(msg, 'Email ou senha incorretos.', 'error');
  const hash = await sha256(user.salt + pass);
  if (hash !== user.hash) return showMsg(msg, 'Email ou senha incorretos.', 'error');

  // Sessão
  localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: user.id, email: user.email, loggedAt: Date.now() }));
  // Perfil (integra com o resto do site)
  const existing = (() => { try { return JSON.parse(localStorage.getItem(USER_KEY) || '{}'); } catch { return {}; } })();
  const profile = {
    ...existing,
    name: existing.name || user.name,
    handle: existing.handle || '@' + user.email.split('@')[0],
    initial: (existing.initial || user.name[0] || 'A').toUpperCase(),
  };
  localStorage.setItem(USER_KEY, JSON.stringify(profile));

  showMsg(msg, '✓ Entrando...', 'ok');
  setTimeout(() => { window.location.href = './index.html'; }, 500);
}

// Se já logado, redireciona
if (localStorage.getItem(SESSION_KEY)) {
  const params = new URLSearchParams(location.search);
  if (!params.has('stay')) window.location.replace('./index.html');
}
