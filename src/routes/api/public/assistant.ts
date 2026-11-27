import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { generateResponse, GatewayError } from "@lovable.dev/ai-gateway";
import { json, preflight } from "@/lib/api-cors";

const bodySchema = z.object({
  mode: z.enum(["leitura", "escrita"]),
  context: z.string().max(6000).optional(),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(4000) }))
    .min(1)
    .max(20),
});

const SYSTEM = `Você é a Alexandra, assistente literária profissional da Alexandrix Books. Responda sempre em português do Brasil, com clareza, elegância e objetividade.
- Modo leitura: explique trechos, vocabulário antigo, contexto histórico, personagens, temas e faça resumos sem spoilers não solicitados.
- Modo escrita: ajude autores a criar livros — enredo, personagens, estrutura de capítulos, revisão de estilo, gramática, títulos e sinopses. Dê sugestões práticas e exemplos.
Nunca produza conteúdo impróprio, de ódio ou adulto explícito. Use markdown leve (listas, negrito).`;

function extractText(res: unknown): string {
  const r = res as { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
  if (typeof r.output_text === "string" && r.output_text) return r.output_text;
  return (r.output ?? [])
    .flatMap((o) => o.content ?? [])
    .filter((c) => c.type === "output_text" && c.text)
    .map((c) => c.text)
    .join("\n");
}

export const Route = createFileRoute("/api/public/assistant")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      POST: async ({ request }) => {
        let body: unknown;
        try { body = await request.json(); } catch { return json({ error: "JSON inválido" }, 400); }
        const parsed = bodySchema.safeParse(body);
        if (!parsed.success) return json({ error: "Requisição inválida" }, 400);
        const { mode, context, messages } = parsed.data;
        const instructions = `${SYSTEM}\nModo atual: ${mode}.${context ? `\nContexto do leitor/autor:\n${context}` : ""}`;
        try {
          const res = await generateResponse({
            model: "openai/gpt-6-astra",
            instructions,
            input: messages.map((m) => ({ role: m.role, content: m.content })),
          });
          return json({ reply: extractText(res) || "Não consegui formular uma resposta agora." });
        } catch (e) {
          if (e instanceof GatewayError) {
            const status = e.httpStatus === 429 ? 429 : e.httpStatus === 402 ? 402 : 502;
            const msg = status === 429 ? "Muitas perguntas seguidas. Aguarde alguns segundos." : status === 402 ? "Créditos de IA esgotados." : "A assistente está indisponível no momento.";
            return json({ error: msg }, status);
          }
          return json({ error: "Erro inesperado" }, 500);
        }
      },
    },
  },
});
