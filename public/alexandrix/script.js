// Alexandrix Books — front-end only (catalog data lives in books.js)
const books = window.books;

const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => Array.from(el.querySelectorAll(s));

const bookGrid = $("#bookGrid");
const featuredGrid = $("#featuredGrid");
const genreChips = $("#genreChips");
const genreFilter = $("#genreFilter");
const searchInput = $("#searchInput");
const resultCount = $("#resultCount");

const state = { search: "", genre: "" };

function genres() {
  return ["Todos", ...Array.from(new Set(books.map(b => b.genre))).sort()];
}

function renderGenres() {
  const list = genres();
  genreChips.innerHTML = list.map(g => `<button class="chip ${ (g==="Todos" && !state.genre) || g===state.genre ? "active":""}" data-genre="${g==="Todos"?"":g}">${g}</button>`).join("");
  genreFilter.innerHTML = list.map(g => `<option value="${g==="Todos"?"":g}" ${g===state.genre?"selected":""}>${g==="Todos"?"Todos os gêneros":g}</option>`).join("");
  $$(".chip", genreChips).forEach(c => c.addEventListener("click", () => {
    state.genre = c.dataset.genre;
    renderGenres(); renderCatalog();
  }));
}

function coverHTML(b, cls = "book-cover") {
  const grad = `linear-gradient(160deg, ${b.color[0]}, ${b.color[1]})`;
  const img = b.cover
    ? `<img src="${b.cover}" alt="Capa de ${b.title}" loading="lazy" onerror="this.remove()">`
    : "";
  return `<div class="${cls}" style="background:${grad}">${img}<span>${b.title}</span></div>`;
}
window.coverHTML = coverHTML;

function bookCardHTML(b) {
  return `
    <article class="book-card" data-id="${b.id}">
      ${coverHTML(b)}
      <div class="book-meta">
        <div class="title">${b.title}</div>
        <div class="author">${b.author}</div>
      </div>
    </article>`;
}

function renderFeatured() {
  const picks = [books[0], books[12], books[27], books[28]].filter(Boolean);
  featuredGrid.innerHTML = picks.map(b => `
    <div class="featured-card" data-id="${b.id}">
      <span class="author">${b.genre} · ${b.year}</span>
      <h3>${b.title}</h3>
      <p>${b.desc.slice(0,100)}...</p>
    </div>`).join("");
  $$(".featured-card", featuredGrid).forEach(c => c.addEventListener("click", () => openBook(+c.dataset.id)));
}

function renderCatalog() {
  const q = state.search.toLowerCase().trim();
  const filtered = books.filter(b => {
    const matchG = !state.genre || b.genre === state.genre;
    const matchQ = !q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q) || b.genre.toLowerCase().includes(q);
    return matchG && matchQ;
  });
  resultCount.textContent = `${filtered.length} ${filtered.length===1?"livro":"livros"}`;
  bookGrid.innerHTML = filtered.length
    ? filtered.map(bookCardHTML).join("")
    : `<div class="empty-state">Nenhum livro encontrado nesta busca cósmica.</div>`;
  $$(".book-card", bookGrid).forEach(c => c.addEventListener("click", () => openBook(+c.dataset.id)));
}

/* Modal */
const modal = $("#bookModal");
const modalBody = $("#modalBody");
function openBook(id) {
  const b = books.find(x => x.id === id);
  if (!b) return;
  const grad = `linear-gradient(160deg, ${b.color[0]}, ${b.color[1]})`;
  modalBody.innerHTML = `
    <div class="book-cover" style="background:${grad}"><span>${b.title}</span></div>
    <div class="modal-info">
      <h3>${b.title}</h3>
      <div class="author">${b.author} · ${b.year}</div>
      <span class="genre-tag">${b.genre}</span>
      <p>${b.desc}</p>
      <div class="modal-actions">
        <button class="btn-primary" data-action="read" data-id="${b.id}">Começar a ler</button>
        <button class="btn-secondary" data-action="shelf" data-id="${b.id}">${isInShelf(b.id) ? '✓ Na estante' : 'Adicionar à estante'}</button>
        <button class="btn-secondary" data-action="fav" data-id="${b.id}">${isFav(b.id) ? '★ Favorito' : '☆ Favoritar'}</button>
      </div>
    </div>`;
  modal.setAttribute("aria-hidden", "false");
  modalBody.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => handleBookAction(btn.dataset.action, +btn.dataset.id));
  });
}

/* Shelf / Favorites / Reading time persistence */
const SHELF_KEY = 'alexandrix_shelf';
const FAV_KEY = 'alexandrix_favorites';
const READ_KEY = 'alexandrix_reading_minutes';
const READING_KEY = 'alexandrix_currently_reading';
const getList = (k) => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; } };
const setList = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const isInShelf = (id) => getList(SHELF_KEY).includes(id);
const isFav = (id) => getList(FAV_KEY).includes(id);
function toggle(key, id) {
  const list = getList(key);
  const i = list.indexOf(id);
  if (i >= 0) list.splice(i, 1); else list.push(id);
  setList(key, list);
}
function handleBookAction(action, id) {
  if (action === 'shelf') { toggle(SHELF_KEY, id); openBook(id); }
  else if (action === 'fav') { toggle(FAV_KEY, id); openBook(id); }
  else if (action === 'read') {
    localStorage.setItem(READING_KEY, String(id));
    window.location.href = './reader.html?id=' + id;
  }
}
function closeModal() { modal.setAttribute("aria-hidden", "true"); }
modal.addEventListener("click", e => { if (e.target.dataset.close !== undefined) closeModal(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });

/* Search */
searchInput.addEventListener("input", e => { state.search = e.target.value; renderCatalog(); });
genreFilter.addEventListener("change", e => { state.genre = e.target.value; renderGenres(); renderCatalog(); });



/* Stats counter */
function animateCount(el, target, duration=1600) {
  const start = performance.now();
  function step(now) {
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.floor(eased * target).toLocaleString("pt-BR");
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

document.addEventListener("DOMContentLoaded", () => {
  $("#year").textContent = new Date().getFullYear();
  renderGenres();
  renderFeatured();
  renderCatalog();
  animateCount($("#statBooks"), 12480);
  animateCount($("#statAuthors"), 3210);
  animateCount($("#statReaders"), 48920);
});

// ===== User Profile =====
// Reflect saved avatar/initial in navbar + open profile page
(function navUser(){
  const UKEY = window.AX ? AX.key('alexandrix_user') : 'alexandrix_user';
  const user = (() => { try { return JSON.parse(localStorage.getItem(UKEY) || '{}'); } catch { return {}; } })();
  const avatar = document.getElementById('navAvatar');
  if (avatar) {
    if (user.photo) {
      avatar.textContent = '';
      avatar.style.background = `url(${user.photo}) center/cover`;
    } else if (user.initial) {
      avatar.textContent = user.initial;
    }
  }
  document.getElementById('openUser')?.addEventListener('click', () => {
    window.location.href = (window.AX && !AX.session()) ? './auth.html?next=profile' : './profile.html';
  });

  // Reflete sessão no link "Entrar / Sair"
  const authLink = document.getElementById('authLink');
  const session = (() => { try { return JSON.parse(localStorage.getItem('alexandrix_session') || 'null'); } catch { return null; } })();
  if (authLink) {
    if (session) {
      authLink.textContent = 'Sair';
      authLink.href = '#';
      authLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('Deseja sair da sua conta?')) {
          if (window.AX) AX.logout('./auth.html?stay=1');
          else { localStorage.removeItem('alexandrix_session'); window.location.reload(); }
        }
      });
    } else {
      authLink.textContent = 'Entrar';
      authLink.href = './auth.html';
    }
  }
})();

/* ===== Comunidade — publicação com verificação de segurança ===== */
(function community(){
  const form = document.getElementById('communityForm');
  if (!form) return;
  const KEY = 'alexandrix_community';
  const approvedEl = document.getElementById('communityApproved');
  const pendingEl  = document.getElementById('communityPending');
  const statusEl   = document.getElementById('cStatus');

  const banned = [
    // ódio / violência explícita / adulto / spam
    'porn','pornografia','sexo explicito','nazi','nazista','matar ','suicidio','suicídio',
    'estupro','pedofil','drogas','cocaina','cocaína','heroína','heroina',
    'compre agora','clique aqui','http://','https://','www.','.com','.net','.xyz',
    'idiota','imbecil','retardado','viado','bicha','puta','caralho','foda-se','merda'
  ];

  function loadAll() { try { return JSON.parse(localStorage.getItem(KEY)||'[]'); } catch { return []; } }
  function saveAll(list) { localStorage.setItem(KEY, JSON.stringify(list)); }

  function moderate({ title, author, desc }) {
    const reasons = [];
    const text = `${title} ${author} ${desc}`.toLowerCase();
    for (const w of banned) if (text.includes(w)) reasons.push(`Conteúdo impróprio detectado ("${w.trim()}")`);
    if (desc.length < 60) reasons.push('Sinopse muito curta (mínimo 60 caracteres)');
    if (/(.)\1{6,}/.test(text)) reasons.push('Texto com repetição suspeita (spam)');
    if ((text.match(/[A-Z]/g)||[]).length > text.length * 0.5) reasons.push('Excesso de caixa alta');
    if (/\d{6,}/.test(text)) reasons.push('Sequência numérica suspeita');
    return { safe: reasons.length === 0, reasons };
  }

  function card(p) {
    const grad = `linear-gradient(160deg, #2a2c5e, #0a0c2a)`;
    return `<article class="community-card">
      <div class="cc-cover" style="background:${grad}"><span>${p.title}</span></div>
      <div class="cc-body">
        <div class="cc-title">${p.title}</div>
        <div class="cc-meta">${p.author} · ${p.genre}</div>
        <p class="cc-desc">${p.desc.slice(0,140)}${p.desc.length>140?'…':''}</p>
        ${p.status==='pending' ? `<span class="badge pending">Em análise</span>` : `<span class="badge ok">Aprovado</span>`}
        ${p.reasons?.length ? `<ul class="cc-reasons">${p.reasons.map(r=>`<li>${r}</li>`).join('')}</ul>` : ''}
      </div>
    </article>`;
  }

  function render() {
    const all = loadAll();
    const ok = all.filter(p => p.status === 'approved');
    const pend = all.filter(p => p.status === 'pending');
    approvedEl.innerHTML = ok.length ? ok.map(card).join('') : `<div class="empty-state">Nenhuma publicação aprovada ainda.</div>`;
    pendingEl.innerHTML  = pend.length ? pend.map(card).join('') : `<div class="empty-state">Nada em análise.</div>`;
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    const payload = {
      id: Date.now(),
      title: document.getElementById('cTitle').value.trim(),
      author: document.getElementById('cAuthor').value.trim(),
      genre: document.getElementById('cGenre').value,
      desc: document.getElementById('cDesc').value.trim(),
      createdAt: new Date().toISOString()
    };
    statusEl.textContent = 'Analisando conteúdo...';
    statusEl.className = 'muted small';
    setTimeout(() => {
      const { safe, reasons } = moderate(payload);
      const all = loadAll();
      if (safe) {
        all.unshift({ ...payload, status: 'approved' });
        statusEl.textContent = '✓ Livro aprovado e publicado na comunidade!';
        statusEl.className = 'small ok-msg';
        form.reset();
      } else {
        all.unshift({ ...payload, status: 'pending', reasons });
        statusEl.textContent = '⚠ Envio em análise: ' + reasons.join(' · ');
        statusEl.className = 'small warn-msg';
      }
      saveAll(all);
      render();
    }, 700);
  });

  render();
})();
