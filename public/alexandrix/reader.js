/* Leitor de livros completos (domínio público via Project Gutenberg) */
(function () {
  const params = new URLSearchParams(location.search);
  const id = Number(params.get("id"));
  const surface = document.getElementById("readerSurface");
  const titleEl = document.getElementById("readerTitle");
  const metaEl = document.getElementById("readerMeta");
  const sourceEl = document.getElementById("readerSource");
  const progressEl = document.getElementById("readerProgress");
  const pageLabel = document.getElementById("pageLabel");
  const prevBtn = document.getElementById("prevPage");
  const nextBtn = document.getElementById("nextPage");

  const K = (base) => (window.AX && AX.key ? AX.key(base) : base);
  const FONT_KEY = "alexandrix_reader_font";
  const posKey = () => K("alexandrix_reader_pos_" + id);

  const book = (window.books || []).find((b) => b.id === id);
  if (book) {
    titleEl.textContent = book.title;
    metaEl.textContent = `${book.author} · ${book.year} · ${book.genre}`;
  }

  /* Tamanho de fonte */
  let fontSize = Number(localStorage.getItem(FONT_KEY) || 18);
  const applyFont = () => {
    surface.style.fontSize = fontSize + "px";
    localStorage.setItem(FONT_KEY, String(fontSize));
  };
  applyFont();
  document.getElementById("fontPlus").addEventListener("click", () => {
    fontSize = Math.min(30, fontSize + 2);
    applyFont();
  });
  document.getElementById("fontMinus").addEventListener("click", () => {
    fontSize = Math.max(14, fontSize - 2);
    applyFont();
  });

  /* Avatar do header */
  const avatar = document.getElementById("navAvatar");
  try {
    const u = JSON.parse(localStorage.getItem(K("alexandrix_user")) || "{}");
    if (avatar && u.photo) {
      avatar.style.background = `url(${u.photo}) center/cover`;
      avatar.textContent = "";
    } else if (avatar && u.name) {
      avatar.textContent = u.name.trim().charAt(0).toUpperCase();
    }
  } catch {}
  document.getElementById("openUser").addEventListener("click", () => {
    location.href = "./profile.html";
  });

  let pages = [];
  let page = 0;

  function paginate(text) {
    const paragraphs = text
      .replace(/\r\n/g, "\n")
      .split(/\n{2,}/)
      .map((p) => p.replace(/\n/g, " ").trim())
      .filter(Boolean);

    const CHARS_PER_PAGE = 3200;
    const out = [];
    let buf = [];
    let len = 0;
    for (const p of paragraphs) {
      buf.push(p);
      len += p.length;
      if (len >= CHARS_PER_PAGE) {
        out.push(buf);
        buf = [];
        len = 0;
      }
    }
    if (buf.length) out.push(buf);
    return out;
  }

  function render() {
    if (!pages.length) return;
    page = Math.max(0, Math.min(pages.length - 1, page));
    surface.innerHTML = pages[page].map((p) => `<p>${escapeHtml(p)}</p>`).join("");
    pageLabel.textContent = `Página ${page + 1} de ${pages.length}`;
    progressEl.style.width = ((page + 1) / pages.length) * 100 + "%";
    prevBtn.disabled = page === 0;
    nextBtn.disabled = page === pages.length - 1;
    localStorage.setItem(posKey(), String(page));
    surface.scrollIntoView({ behavior: "smooth", block: "start" });
    trackReading();
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  /* Tempo de leitura + "lendo agora" */
  function trackReading() {
    localStorage.setItem(K("alexandrix_currently_reading"), String(id));
    const mins = Number(localStorage.getItem(K("alexandrix_reading_minutes")) || 0) + 1;
    localStorage.setItem(K("alexandrix_reading_minutes"), String(mins));
  }

  prevBtn.addEventListener("click", () => {
    page--;
    render();
  });
  nextBtn.addEventListener("click", () => {
    page++;
    render();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") nextBtn.click();
    if (e.key === "ArrowLeft") prevBtn.click();
  });

  async function load() {
    if (!id || !book) {
      surface.innerHTML = `<p class="muted">Livro não encontrado. <a href="./index.html#catalogo">Voltar ao catálogo</a></p>`;
      return;
    }
    try {
      const res = await fetch(`/api/public/read?id=${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao carregar");

      if (!data.available) {
        surface.innerHTML = `
          <div class="reader-unavailable">
            <h3>Texto completo não disponível</h3>
            <p>${escapeHtml(data.reason || "")}</p>
            <p class="muted">Você ainda pode manter este título na sua estante e favoritos. Confira o catálogo para obras em domínio público, que podem ser lidas por completo aqui mesmo.</p>
            <a class="btn-primary" href="./index.html#catalogo">Ver catálogo</a>
          </div>`;
        pageLabel.textContent = "";
        prevBtn.style.display = nextBtn.style.display = "none";
        return;
      }

      pages = paginate(data.text);
      page = Number(localStorage.getItem(posKey()) || 0);
      metaEl.textContent = `${book.author} · ${book.year} · ${book.genre} · ${pages.length} páginas`;
      sourceEl.innerHTML = `Texto integral de domínio público — <a href="${data.sourceUrl}" target="_blank" rel="noopener">${escapeHtml(data.source)}</a>`;
      render();
    } catch (err) {
      surface.innerHTML = `<p class="muted">Não foi possível carregar o texto agora. Tente novamente em instantes.</p>`;
    }
  }

  load();
})();
