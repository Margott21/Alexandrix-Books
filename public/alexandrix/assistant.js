/* Alexandra — assistente literária com IA (leitura e escrita) */
(function () {
  const isWriting = /community/.test(location.pathname);
  let mode = isWriting ? "escrita" : "leitura";
  const history = [];
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/^[-•] (.*)$/gm, "• $1").replace(/\n/g, "<br>");

  const root = document.createElement("div");
  root.className = "ai-root";
  root.innerHTML = `
    <button class="ai-fab" aria-label="Abrir assistente">✦ <span>Assistente</span></button>
    <section class="ai-panel" aria-hidden="true">
      <header class="ai-head">
        <div><strong>Alexandra</strong><small>Assistente literária IA</small></div>
        <div class="ai-head-actions">
          <button class="ai-expand" aria-label="Ampliar a conversa" title="Ampliar a conversa">⤢</button>
          <button class="ai-close" aria-label="Fechar">×</button>
        </div>
      </header>
      <div class="ai-modes">
        <button data-mode="leitura">📖 Leitura</button>
        <button data-mode="escrita">✍️ Escrita</button>
      </div>
      <div class="ai-log"></div>
      <div class="ai-suggest"></div>
      <form class="ai-form">
        <textarea rows="3" placeholder="Pergunte algo…" maxlength="4000"></textarea>
        <button class="btn-primary" type="submit">Enviar</button>
      </form>
    </section>`;
  document.body.appendChild(root);
  const panel = root.querySelector(".ai-panel");
  const log = root.querySelector(".ai-log");
  const ta = root.querySelector("textarea");
  const sug = root.querySelector(".ai-suggest");
  const SUG = {
    leitura: ["Resuma esta página", "Explique as palavras difíceis", "Qual o contexto histórico desta obra?"],
    escrita: ["Me ajude a criar um enredo", "Crie uma sinopse atraente", "Revise meu texto"],
  };

  function setMode(m) {
    mode = m;
    root.querySelectorAll("[data-mode]").forEach((b) => b.classList.toggle("active", b.dataset.mode === m));
    sug.innerHTML = SUG[m].map((s) => `<button type="button">${s}</button>`).join("");
    sug.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => send(b.textContent)));
  }
  function add(role, html) {
    const d = document.createElement("div");
    d.className = "ai-msg " + role;
    d.innerHTML = html;
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
    return d;
  }
  function context() {
    if (mode === "leitura") {
      const t = document.getElementById("readerTitle")?.textContent;
      const page = document.getElementById("readerSurface")?.innerText?.slice(0, 4000);
      return t && page ? `Livro: ${t}\nTrecho da página atual:\n${page}` : "";
    }
    const desc = document.getElementById("cDesc")?.value || "";
    const title = document.getElementById("cTitle")?.value || "";
    return title || desc ? `Rascunho do autor — Título: ${title}\n${desc}`.slice(0, 4000) : "";
  }
  async function send(text) {
    text = (text || "").trim();
    if (!text) return;
    add("user", esc(text));
    history.push({ role: "user", content: text });
    ta.value = "";
    const wait = add("assistant typing", "Pensando…");
    try {
      const res = await fetch("/api/public/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode, context: context(), messages: history.slice(-12) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Falha na assistente");
      wait.className = "ai-msg assistant";
      wait.innerHTML = md(data.reply);
      history.push({ role: "assistant", content: data.reply });
    } catch (e) {
      wait.className = "ai-msg error";
      wait.textContent = e.message || "Não foi possível responder agora.";
      history.pop();
    }
  }
  root.querySelector(".ai-fab").addEventListener("click", () => {
    const open = panel.getAttribute("aria-hidden") === "true";
    panel.setAttribute("aria-hidden", open ? "false" : "true");
    if (open && !log.children.length)
      add("assistant", "Olá! Sou a <strong>Alexandra</strong>. Posso explicar trechos do que você está lendo ou ajudar a escrever o seu livro. Como posso ajudar?");
    if (open) ta.focus();
  });
  root.querySelector(".ai-close").addEventListener("click", () => panel.setAttribute("aria-hidden", "true"));
  root.querySelector(".ai-expand").addEventListener("click", () => {
    const wide = root.classList.toggle("ai-wide");
    root.querySelector(".ai-expand").setAttribute("aria-label", wide ? "Reduzir a conversa" : "Ampliar a conversa");
    ta.focus();
  });
  root.querySelectorAll("[data-mode]").forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode)));
  root.querySelector(".ai-form").addEventListener("submit", (e) => { e.preventDefault(); send(ta.value); });
  ta.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(ta.value); } });
  setMode(mode);
})();
