import { corsHeaders, HttpError, jsonResponse } from "../_shared/http.ts";

type AssistantAction = "chat" | "describe_listing" | "summarize_document";

const FAQ_ENTRIES: Array<{ keywords: string[]; answer: string }> = [
  {
    keywords: ["escrow", "hold", "release"],
    answer:
      "Escrow holds your payment securely until agreed milestones are met. Funds stay in your BaytMiftah wallet escrow balance and are released when both sides confirm the step.",
  },
  {
    keywords: ["kyc", "verify", "verification", "identity"],
    answer:
      "KYC verification confirms your identity before high-value actions. Upload a government ID in Settings → Verification.",
  },
  {
    keywords: ["rent", "lease", "tenant"],
    answer:
      "For rentals, apply from the listing page and track your application in My BaytMiftah. Leases, payments, and maintenance live under Leases and Maintenance.",
  },
  {
    keywords: ["booking", "short stay", "check-in", "guest"],
    answer:
      "Short-stay bookings can be instant or request-to-book. After payment you receive confirmation and can message the host from Messages.",
  },
  {
    keywords: ["offer", "purchase", "buy"],
    answer:
      "To buy, schedule a viewing, submit an offer from the listing page, and track deposits in Applications and Payments.",
  },
];

function pickFaqAnswer(question: string) {
  const lower = question.toLowerCase();
  for (const entry of FAQ_ENTRIES) {
    if (entry.keywords.some((keyword) => lower.includes(keyword))) {
      return entry.answer;
    }
  }
  return null;
}

function localChatAnswer(message: string, context?: string) {
  const faq = pickFaqAnswer(message);
  if (faq) return faq;

  if (context === "workspace") {
    return "BaytMiftah AI can help draft listing copy, summarize leads, and suggest follow-ups. Try asking about a neighborhood, pricing angle, or next steps for a lead.";
  }

  if (context === "property") {
    return "Ask about neighborhood fit, commute, pricing, or next steps for this listing. You can schedule a viewing or message the host from the property page.";
  }

  return "BaytMiftah AI can help with search, documents, payments, escrow, bookings, and maintenance. Add OPENAI_API_KEY to unlock smarter responses — guided help works without a key.";
}

async function chatWithOpenAI(
  message: string,
  context?: string,
  history?: Array<{ role: string; content: string }>,
) {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return null;

  const systemPrompt =
    context === "workspace"
      ? "You are BaytMiftah AI, a real estate operations copilot for agencies and landlords in Ghana and West Africa. Be concise, practical, and action-oriented."
      : "You are BaytMiftah AI, a helpful real estate assistant for property search, rentals, leases, short stays, and purchases in Ghana and West Africa. Be concise and trustworthy.";

  const messages = [
    { role: "system", content: systemPrompt },
    ...(Array.isArray(history) ? history.slice(-6) : []),
    { role: "user", content: message },
  ];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini",
      temperature: 0.4,
      messages,
    }),
  });

  if (!response.ok) {
    throw new HttpError(502, `OpenAI request failed (${response.status})`);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  return typeof content === "string" ? content.trim() : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  try {
    const body = await req.json().catch(() => null);
    const action = (body?.action as AssistantAction) || "chat";
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    const context = typeof body?.context === "string" ? body.context : undefined;
    const history = Array.isArray(body?.history) ? body.history : [];

    if (!message && action === "chat") {
      throw new HttpError(400, "message is required");
    }

    let answer: string | null = null;
    let source: "openai" | "local" = "local";

    if (action === "chat") {
      try {
        answer = await chatWithOpenAI(message, context, history);
        if (answer) source = "openai";
      } catch (error) {
        console.warn("OpenAI chat failed, using local fallback:", error);
      }

      if (!answer) {
        answer = localChatAnswer(message, context);
      }
    } else if (action === "describe_listing") {
      const input = body?.listing;
      const location = [input?.address, input?.city, input?.region].filter(Boolean).join(", ") || "Ghana";
      const prompt = `Write a compelling 2-paragraph property listing description for a ${input?.category || "property"} in ${location}. Bedrooms: ${input?.bedrooms ?? "N/A"}. Price: ${input?.currency || "GHS"} ${input?.price ?? "on request"}.`;

      try {
        answer = await chatWithOpenAI(prompt, "workspace");
        if (answer) source = "openai";
      } catch (error) {
        console.warn("OpenAI listing description failed:", error);
      }

      if (!answer) {
        answer = `Discover this ${input?.category || "property"} in ${location}. Contact the listing team to arrange a viewing.`;
      }
    } else if (action === "summarize_document") {
      const title = typeof body?.title === "string" ? body.title : "Document";
      const content = typeof body?.content === "string" ? body.content : "";

      try {
        answer = await chatWithOpenAI(`Summarize this document in 3 bullet points:\n\nTitle: ${title}\n\n${content.slice(0, 4000)}`, context);
        if (answer) source = "openai";
      } catch (error) {
        console.warn("OpenAI summarize failed:", error);
      }

      if (!answer) {
        answer = content
          ? `Summary of "${title}": ${content.replace(/\s+/g, " ").trim().slice(0, 280)}...`
          : `No readable content found in "${title}".`;
      }
    } else {
      throw new HttpError(400, "Unsupported action");
    }

    return jsonResponse(200, { answer, source });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(error.status, { error: error.message });
    }

    console.error("ai-assistant error:", error);
    return jsonResponse(500, { error: "Unable to process AI request" });
  }
});
