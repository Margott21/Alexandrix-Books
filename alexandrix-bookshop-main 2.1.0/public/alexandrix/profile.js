// Alexandrix Books — Profile page
const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => Array.from(el.querySelectorAll(s));

// Exige conta: perfil é sempre de um usuário cadastrado
if (window.AX && !AX.requireAuth()) throw new Error('sem sessão');

const K = (b) => (window.AX ? AX.key(b) : b);
const KEYS = {
  user: K('alexandrix_user'),
  shelf: K('alexandrix_shelf'),
  fav: K('alexandrix_favorites'),
  read: K('alexandrix_reading_minutes'),
  reading: K('alexandrix_currently_reading'),
  activity: K('alexandrix_activity'), // { 'YYYY-MM-DD': minutes }
  prefs: K('alexandrix_prefs'),
  finished: K('alexandrix_finished')
};

const defaults = {
  name: 'Viajante Cósmico',
  handle: '@leitor.estelar',
  bio: 'Explorador de constelações literárias. Apaixonado por clássicos, ficção científica e poesia.',
  initial: 'A',
  photo: null
};

const loadJSON = (k, fallback) => {
  try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v ?? fallback; }
  catch { return fallback; }
};
const saveJSON = (k, v) => localStorage.setItem(k, JSON.stringify(v));

let user = { ...defaults, ...(loadJSON(KEYS.user, {}) || {}) };

/* ===== Identity ===== */
function renderIdentity() {
  $('#profileName').textContent = user.name;
  $('#profileHandle').textContent = user.handle.startsWith('@') ? user.handle : '@' + user.handle;
  $('#profileBio').textContent = user.bio;
  const em = document.getElementById('profileEmail');
  if (em) { const ses = window.AX && AX.session(); em.textContent = ses ? ses.email : ''; }
  const avatar = $('#profileAvatar');
  if (user.photo) {
    avatar.textContent = '';
    avatar.style.background = `url(${user.photo}) center/cover`;
    $('#avatarRemove').style.display = 'flex';
  } else {
    avatar.textContent = user.initial;
    avatar.style.background = '';
    $('#avatarRemove').style.display = 'none';
  }
}

/* ===== Stats ===== */
function getFinished() { return loadJSON(KEYS.finished, []); }
function getMinutes() { return +(localStorage.getItem(KEYS.read) || 0); }
function todayKey() { return new Date().toISOString().slice(0, 10); }
function getActivity() { return loadJSON(KEYS.activity, {}); }

function renderStats() {
  const shelf = loadJSON(KEYS.shelf, []);
  const favs = loadJSON(KEYS.fav, []);
  $('#statShelf').textContent = shelf.length;
  $('#statFav').textContent = favs.length;
  $('#statRead').textContent = getFinished().length;
  const m = getMinutes();
  const h = Math.floor(m / 60);
  $('#statTime').textContent = h > 0 ? `${h}h` : `${m}min`;
  $('#statStreak').textContent = computeStreak();
}
function computeStreak() {
  const act = getActivity();
  let streak = 0;
  const d = new Date();
  while (true) {
    const key = d.toISOString().slice(0, 10);
    if (act[key] && act[key] > 0) { streak++; d.setDate(d.getDate() - 1); }
    else break;
  }
  return streak;
}

/* ===== Book grids ===== */
function bookCard(b) {
  const grad = `linear-gradient(160deg, ${b.color[0]}, ${b.color[1]})`;
  return `
    <article class="book-card" data-id="${b.id}">
      <div class="book-cover" style="background:${grad}"><span>${b.title}</span></div>
      <div class="book-info">
        <h3>${b.title}</h3>
        <div class="author">${b.author}</div>
        <div class="meta-row">
          <span class="genre-tag">${b.genre}</span>
          <button class="mini-btn" data-remove="${b.id}" title="Remover">×</button>
        </div>
      </div>
    </article>`;
}

function renderShelf() {
  const ids = loadJSON(KEYS.shelf, []);
  const list = (window.books || []).filter(b => ids.includes(b.id));
  $('#shelfCount').textContent = `${list.length} livro${list.length === 1 ? '' : 's'}`;
  const grid = $('#shelfGrid');
  grid.innerHTML = list.length
    ? list.map(bookCard).join('')
    : `<div class="empty-state">Sua estante está vazia. <a href="./index.html#catalogo">Explore o catálogo</a> e adicione livros.</div>`;
  grid.querySelectorAll('[data-remove]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = +btn.dataset.remove;
      saveJSON(KEYS.shelf, loadJSON(KEYS.shelf, []).filter(x => x !== id));
      renderAll();
    });
  });
}

function renderFavorites() {
  const ids = loadJSON(KEYS.fav, []);
  const list = (window.books || []).filter(b => ids.includes(b.id));
  $('#favCount').textContent = `${list.length} livro${list.length === 1 ? '' : 's'}`;
  const grid = $('#favGrid');
  grid.innerHTML = list.length
    ? list.map(bookCard).join('')
    : `<div class="empty-state">Você ainda não tem favoritos. Marque ★ nos seus livros preferidos.</div>`;
  grid.querySelectorAll('[data-remove]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = +btn.dataset.remove;
      saveJSON(KEYS.fav, loadJSON(KEYS.fav, []).filter(x => x !== id));
      renderAll();
    });
  });
}

/* ===== Reading now ===== */
function renderReading() {
  const id = +localStorage.getItem(KEYS.reading);
  const b = (window.books || []).find(x => x.id === id);
  const wrap = $('#readingNow');
  if (!b) {
    wrap.innerHTML = `<div class="empty-state">Nenhum livro em leitura. Abra um livro do catálogo e clique em "Começar a ler".</div>`;
  } else {
    const grad = `linear-gradient(135deg, ${b.color[0]}, ${b.color[1]})`;
    const progress = Math.min(100, Math.round((getMinutes() % 600) / 6));
    wrap.innerHTML = `
      <div class="reading-cover" style="background:${grad}"></div>
      <div class="reading-info">
        <h4>${b.title}</h4>
        <p class="muted">${b.author} · ${b.year}</p>
        <p>${b.desc}</p>
        <div class="progress"><div class="progress-bar" style="width:${progress}%"></div></div>
        <span class="muted small">${progress}% concluído</span>
        <div class="modal-actions" style="margin-top:12px;">
          <button class="btn-primary" id="addSessionBtn">+15 min de leitura</button>
          <button class="btn-secondary" id="finishBookBtn">Marcar como lido</button>
        </div>
      </div>`;
    $('#addSessionBtn').addEventListener('click', () => addReadingMinutes(15));
    $('#finishBookBtn').addEventListener('click', () => finishCurrentBook(b.id));
  }
  const m = getMinutes();
  $('#readingTimeBig').textContent = `${Math.floor(m / 60)}h ${m % 60}min`;
  const today = (getActivity()[todayKey()] || 0);
  $('#todayTime').textContent = `${today} min`;
  $('#dailyBar').style.width = `${Math.min(100, (today / 30) * 100)}%`;
}

function addReadingMinutes(min) {
  const total = getMinutes() + min;
  localStorage.setItem(KEYS.read, String(total));
  const act = getActivity();
  act[todayKey()] = (act[todayKey()] || 0) + min;
  saveJSON(KEYS.activity, act);
  renderAll();
}
function finishCurrentBook(id) {
  const finished = getFinished();
  if (!finished.includes(id)) finished.push(id);
  saveJSON(KEYS.finished, finished);
  localStorage.removeItem(KEYS.reading);
  renderAll();
}

/* ===== Activity heatmap ===== */
function renderActivity() {
  const act = getActivity();
  const grid = $('#activityGrid');
  const cells = [];
  const today = new Date();
  for (let i = 48; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const mins = act[key] || 0;
    let level = 0;
    if (mins > 0) level = 1;
    if (mins >= 15) level = 2;
    if (mins >= 30) level = 3;
    if (mins >= 60) level = 4;
    cells.push(`<div class="cell level-${level}" title="${key}: ${mins} min"></div>`);
  }
  grid.innerHTML = cells.join('');
}

/* ===== Preferences ===== */
function renderPrefs() {
  const prefs = loadJSON(KEYS.prefs, { news: false, dark: true, weekly: false, goals: false });
  $$('input[data-pref]').forEach(input => {
    input.checked = !!prefs[input.dataset.pref];
    input.addEventListener('change', () => {
      prefs[input.dataset.pref] = input.checked;
      saveJSON(KEYS.prefs, prefs);
    });
  });
}

/* ===== Tabs ===== */
$$('#profileTabs .tab').forEach(tab => {
  tab.addEventListener('click', () => {
    $$('#profileTabs .tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    $$('.tab-panel').forEach(p => p.classList.remove('active'));
    $(`.tab-panel[data-panel="${tab.dataset.tab}"]`).classList.add('active');
  });
});

/* ===== Avatar upload ===== */
$('#avatarInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    alert('Imagem muito grande. Use uma imagem de até 2MB.');
    return;
  }
  const reader = new FileReader();
  reader.onload = (ev) => {
    user.photo = ev.target.result;
    saveJSON(KEYS.user, user);
    renderIdentity();
  };
  reader.readAsDataURL(file);
});
$('#avatarRemove').addEventListener('click', () => {
  user.photo = null;
  saveJSON(KEYS.user, user);
  renderIdentity();
});

/* ===== Edit modal ===== */
const modal = $('#profileModal');
const openEdit = () => {
  $('#fieldName').value = user.name;
  $('#fieldHandle').value = user.handle;
  $('#fieldBio').value = user.bio;
  $('#fieldInitial').value = user.initial;
  modal.setAttribute('aria-hidden', 'false');
};
const closeEdit = () => modal.setAttribute('aria-hidden', 'true');
$('#editProfileBtn').addEventListener('click', openEdit);
modal.querySelectorAll('[data-close-profile]').forEach(el => el.addEventListener('click', closeEdit));
$('#profileForm').addEventListener('submit', (e) => {
  e.preventDefault();
  user.name = $('#fieldName').value.trim() || defaults.name;
  user.handle = $('#fieldHandle').value.trim() || defaults.handle;
  user.bio = $('#fieldBio').value.trim() || defaults.bio;
  user.initial = ($('#fieldInitial').value.trim() || user.name[0] || 'A').toUpperCase();
  saveJSON(KEYS.user, user);
  renderIdentity();
  closeEdit();
});

/* ===== Reset ===== */
$('#resetData').addEventListener('click', () => {
  if (!confirm('Tem certeza? Isso apagará todos os dados do seu perfil.')) return;
  Object.values(KEYS).forEach(k => localStorage.removeItem(k));
  user = { ...defaults };
  renderAll();
});

function renderMyBooks() {
  const wrap = document.getElementById('myBooksList');
  if (!wrap) return;
  let mineIds = [];
  let all = [];
  try { mineIds = JSON.parse(localStorage.getItem(K('alexandrix_my_books')) || '[]'); } catch {}
  try { all = JSON.parse(localStorage.getItem('alexandrix_community') || '[]'); } catch {}
  const mine = all.filter(p => mineIds.includes(p.id));
  if (!mine.length) {
    wrap.innerHTML = `<div class="empty-state">Você ainda não publicou nenhum livro. <a href="./community.html#publicar">Publicar agora</a>.</div>`;
    return;
  }
  const esc = s => (s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  wrap.innerHTML = mine.map(p => {
    const badge = p.status === 'approved'
      ? '<span class="badge ok">Aprovado</span>'
      : '<span class="badge pending">Em análise</span>';
    const reasons = p.reasons?.length ? `<ul class="cc-reasons">${p.reasons.map(r=>`<li>${esc(r)}</li>`).join('')}</ul>` : '';
    return `<article class="community-card">
      <div class="cc-cover" style="background:linear-gradient(160deg,#2a2c5e,#0a0c2a)"><span>${esc(p.title)}</span></div>
      <div class="cc-body">
        <div class="cc-title">${esc(p.title)}</div>
        <div class="cc-meta">${esc(p.author)} · ${esc(p.genre)}</div>
        <p class="cc-desc">${esc((p.desc||'').slice(0,140))}${(p.desc||'').length>140?'…':''}</p>
        ${badge}${reasons}
      </div>
    </article>`;
  }).join('');
}

function renderAll() {
  renderIdentity();
  renderStats();
  renderShelf();
  renderFavorites();
  renderMyBooks();
  renderReading();
  renderActivity();
}

renderAll();
renderPrefs();
$('#year').textContent = new Date().getFullYear();

/* ===== Sair da conta ===== */
document.getElementById('logoutBtn')?.addEventListener('click', () => {
  if (!confirm('Deseja sair da sua conta?')) return;
  AX.logout('./auth.html?stay=1');
});
