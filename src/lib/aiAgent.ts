type ContentPart = 
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

type Msg = { role: "user" | "assistant"; content: string | ContentPart[] };

const AI_AGENT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-agent`;

export type ChatMessage = {
  content: string;
  sender_role: string;
  message_type?: string;
  attachment_url?: string;
};

export function buildAIMessages(chatHistory: ChatMessage[]): Msg[] {
  return chatHistory.map((m) => {
    const role: "user" | "assistant" = m.sender_role === "student" ? "user" : "assistant";

    if (m.message_type === "image" && m.attachment_url) {
      const parts: ContentPart[] = [
        { type: "image_url", image_url: { url: m.attachment_url } },
      ];
      if (m.content && m.content !== "📷 תמונה") {
        parts.unshift({ type: "text", text: m.content });
      } else {
        parts.unshift({ type: "text", text: "התלמיד שלח תמונה של גרף. נתח את הגרף." });
      }
      return { role, content: parts };
    }

    return { role, content: m.content };
  });
}

export async function getAISuggestion(chatHistory: ChatMessage[]): Promise<string> {
  const messages = buildAIMessages(chatHistory);

  // If conversation ends with assistant message, add instruction for AI to generate a suggested reply
  if (messages.length > 0 && messages[messages.length - 1].role === "assistant") {
    messages.push({
      role: "user",
      content: "בהתבסס על השיחה עד כה, הכן תשובה מוצעת שהמנטור יכול לשלוח לתלמיד. התייחס למידע שכבר נמסר בשיחה.",
    });
  }
  const resp = await fetch(AI_AGENT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages }),
  });

  if (resp.status === 429) throw new Error("rate_limit");
  if (resp.status === 402) throw new Error("payment_required");
  if (!resp.ok || !resp.body) throw new Error("ai_error");

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let textBuffer = "";
  let result = "";
  let streamDone = false;

  while (!streamDone) {
    const { done, value } = await reader.read();
    if (done) break;
    textBuffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
      let line = textBuffer.slice(0, newlineIndex);
      textBuffer = textBuffer.slice(newlineIndex + 1);

      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;

      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") { streamDone = true; break; }

      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) result += content;
      } catch {
        textBuffer = line + "\n" + textBuffer;
        break;
      }
    }
  }

  if (textBuffer.trim()) {
    for (let raw of textBuffer.split("\n")) {
      if (!raw) continue;
      if (raw.endsWith("\r")) raw = raw.slice(0, -1);
      if (raw.startsWith(":") || raw.trim() === "") continue;
      if (!raw.startsWith("data: ")) continue;
      const jsonStr = raw.slice(6).trim();
      if (jsonStr === "[DONE]") continue;
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) result += content;
      } catch { /* ignore */ }
    }
  }

  return result;
}
