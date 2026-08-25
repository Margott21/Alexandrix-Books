/* ===== Comunidade Alexandrix — leitura + publicação com verificação ===== */
(function () {
  const KEY = 'alexandrix_community';
  const form = document.getElementById('communityForm');
  const approvedEl = document.getElementById('communityApproved');
  const pendingEl = document.getElementById('communityPending');
  const statusEl = document.getElementById('cStatus');
  const countEl = document.getElementById('cCount');
  const modal = document.getElementById('readerModal');
  const modalBody = document.getElementById('readerBody');

  // Avatar nav
  try {
    const user = JSON.parse(localStorage.getItem(window.AX ? AX.key('alexandrix_user') : 'alexandrix_user') || '{}');
    const avatar = document.getElementById('navAvatar');
    if (avatar) {
      if (user.photo) { avatar.textContent = ''; avatar.style.background = `url(${user.photo}) center/cover`; }
      else if (user.initial) avatar.textContent = user.initial;
    }
  } catch {}
  document.getElementById('openUser')?.addEventListener('click', () => location.href = './profile.html');
  document.getElementById('year').textContent = new Date().getFullYear();

  const banned = [
    'porn','pornografia','sexo explicito','nazi','nazista','matar ','suicidio','suicídio',
    'estupro','pedofil','drogas','cocaina','cocaína','heroína','heroina',
    'compre agora','clique aqui','http://','https://','www.','.com','.net','.xyz',
    'idiota','imbecil','retardado','viado','bicha','puta','caralho','foda-se','merda'
  ];

  const loadAll = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
  const saveAll = (l) => localStorage.setItem(KEY, JSON.stringify(l));

  function moderate({ title, author, desc, content }) {
    const reasons = [];
    const text = `${title} ${author} ${desc} ${content || ''}`.toLowerCase();
    for (const w of banned) if (text.includes(w)) reasons.push(`Conteúdo impróprio detectado ("${w.trim()}")`);
    if (desc.length < 60) reasons.push('Sinopse muito curta (mínimo 60 caracteres)');
    if (/(.)\1{6,}/.test(text)) reasons.push('Texto com repetição suspeita (spam)');
    if ((text.match(/[A-Z]/g) || []).length > text.length * 0.5) reasons.push('Excesso de caixa alta');
    if (/\d{6,}/.test(text)) reasons.push('Sequência numérica suspeita');
    return { safe: reasons.length === 0, reasons };
  }

  function escapeHTML(s = '') {
    return s.replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }

  function card(p) {
    const grad = `linear-gradient(160deg, #2a2c5e, #0a0c2a)`;
    const isPending = p.status === 'pending';
    return `<article class="community-card" data-id="${p.id}">
      <div class="cc-cover" style="background:${grad}"><span>${escapeHTML(p.title)}</span></div>
      <div class="cc-body">
        <div class="cc-title">${escapeHTML(p.title)}</div>
        <div class="cc-meta">${escapeHTML(p.author)} · ${escapeHTML(p.genre)}</div>
        <p class="cc-desc">${escapeHTML(p.desc.slice(0,140))}${p.desc.length>140?'…':''}</p>
        ${isPending ? `<span class="badge pending">Em análise</span>` : `<span class="badge ok">Aprovado</span>`}
        ${p.reasons?.length ? `<ul class="cc-reasons">${p.reasons.map(r=>`<li>${escapeHTML(r)}</li>`).join('')}</ul>` : ''}
        ${!isPending ? `<div class="form-actions" style="margin-top:10px"><button class="btn-secondary" data-read="${p.id}">Ler</button></div>` : ''}
      </div>
    </article>`;
  }

  function render() {
    const all = loadAll();
    const ok = all.filter(p => p.status === 'approved');
    const pend = all.filter(p => p.status === 'pending');
    approvedEl.innerHTML = ok.length ? ok.map(card).join('') : `<div class="empty-state">Nenhuma publicação aprovada ainda. Seja o primeiro!</div>`;
    pendingEl.innerHTML = pend.length ? pend.map(card).join('') : `<div class="empty-state">Nada em análise.</div>`;
    if (countEl) countEl.textContent = `${ok.length} livro${ok.length===1?'':'s'} aprovado${ok.length===1?'':'s'}`;
  }

  function openReader(id) {
    const p = loadAll().find(x => String(x.id) === String(id));
    if (!p) return;
    modalBody.innerHTML = `
      <div class="modal-cover" style="background:linear-gradient(160deg,#2a2c5e,#0a0c2a)"><span>${escapeHTML(p.title)}</span></div>
      <div class="modal-info">
        <h3>${escapeHTML(p.title)}</h3>
        <p class="muted">${escapeHTML(p.author)} · ${escapeHTML(p.genre)}</p>
        <p><strong>Sinopse</strong><br/>${escapeHTML(p.desc)}</p>
        ${p.content ? `<p><strong>Leitura</strong></p><div class="reader-text">${escapeHTML(p.content).replace(/\n/g,'<br/>')}</div>` : `<p class="muted">O autor não compartilhou um trecho de leitura.</p>`}
      </div>`;
    modal.setAttribute('aria-hidden', 'false');
  }

  modal?.addEventListener('click', (e) => {
    if (e.target.matches('[data-close]')) modal.setAttribute('aria-hidden', 'true');
  });

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-read]');
    if (btn) openReader(btn.dataset.read);
  });

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const payload = {
      id: Date.now(),
      title: document.getElementById('cTitle').value.trim(),
      author: document.getElementById('cAuthor').value.trim(),
      genre: document.getElementById('cGenre').value,
      desc: document.getElementById('cDesc').value.trim(),
      content: document.getElementById('cContent').value.trim(),
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
      try {
        const MY = window.AX ? AX.key('alexandrix_my_books') : 'alexandrix_my_books';
        const mine = JSON.parse(localStorage.getItem(MY) || '[]');
        mine.unshift(payload.id);
        localStorage.setItem(MY, JSON.stringify(mine));
      } catch {}
      render();
    }, 700);
  });

  render();
})();
