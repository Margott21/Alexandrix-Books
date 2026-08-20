import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { json, preflight } from "@/lib/api-cors";
import { books } from "@/lib/catalog";

const querySchema = z.object({
  id: z.coerce.number().int().min(1).max(100000),
});

export const Route = createFileRoute("/api/public/read")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const parsed = querySchema.safeParse({ id: url.searchParams.get("id") });
        if (!parsed.success) return json({ error: "Parâmetro 'id' inválido" }, 400);

        const book = books.find((b) => b.id === parsed.data.id);
        if (!book) return json({ error: "Livro não encontrado" }, 404);

        const gid = book.gutenbergId;
        const candidates = [
          `https://www.gutenberg.org/cache/epub/${gid}/pg${gid}.txt`,
          `https://www.gutenberg.org/ebooks/${gid}.txt.utf-8`,
          `https://www.gutenberg.org/files/${gid}/${gid}-0.txt`,
        ];

        let raw = "";
        for (const candidate of candidates) {
          try {
            const res = await fetch(candidate, {
              headers: { accept: "text/plain", "user-agent": "AlexandrixBooks/1.0" },
            });
            if (!res.ok) continue;
            const body = await res.text();
            if (body.length > 2000) {
              raw = body;
              break;
            }
          } catch {
            // tenta a próxima fonte
          }
        }

        if (!raw) {
          return json(
            {
              id: book.id,
              title: book.title,
              author: book.author,
              available: false,
              reason: "Não foi possível obter o texto integral neste momento. Tente novamente em instantes.",
            },
            200,
          );
        }

        // Remove cabeçalho/rodapé de licença do Project Gutenberg
        const startMatch = raw.match(/\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^*]*\*\*\*/i);
        const endMatch = raw.match(/\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^*]*\*\*\*/i);
        const from = startMatch ? (startMatch.index ?? 0) + startMatch[0].length : 0;
        const to = endMatch ? endMatch.index : raw.length;
        const text = raw.slice(from, to).trim();

        return json({
          id: book.id,
          title: book.title,
          author: book.author,
          available: true,
          source: "Project Gutenberg (domínio público)",
          sourceUrl: `https://www.gutenberg.org/ebooks/${gid}`,
          language: "pt",
          chars: text.length,
          text,
        });
      },
    },
  },
});
