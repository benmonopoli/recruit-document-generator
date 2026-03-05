import type { GenerationContext, ContentType, ChatMessage } from "@/types";

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

interface StreamCallbacks {
  onDelta: (text: string) => void;
  onDone: () => void;
  onError?: (error: Error) => void;
}

export async function streamGenerate(
  type: ContentType | "chat",
  messages: Array<{ role: string; content: string }>,
  context: GenerationContext,
  callbacks: StreamCallbacks
): Promise<void> {
  try {
    const response = await fetch(`${FUNCTIONS_URL}/generate-content`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        type,
        messages,
        context,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    if (!response.body) {
      throw new Error("No response body");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
        let line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") {
          callbacks.onDone();
          return;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            callbacks.onDelta(content);
          }
        } catch {
          // Incomplete JSON, put back and wait for more
          buffer = line + "\n" + buffer;
          break;
        }
      }
    }

    callbacks.onDone();
  } catch (error) {
    if (callbacks.onError) {
      callbacks.onError(error instanceof Error ? error : new Error(String(error)));
    } else {
      throw error;
    }
  }
}

export async function generateContent(
  type: ContentType | "chat",
  messages: Array<{ role: string; content: string }>,
  context: GenerationContext
): Promise<string> {
  const response = await fetch(`${FUNCTIONS_URL}/generate-content`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({
      type,
      messages,
      context,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

// Greenhouse API
export async function fetchGreenhouseJobs(forceRefresh = false) {
  const response = await fetch(`${FUNCTIONS_URL}/greenhouse`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ action: "list_jobs", forceRefresh }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function fetchGreenhouseJob(jobId: string) {
  const response = await fetch(`${FUNCTIONS_URL}/greenhouse`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ action: "get_job", jobId }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function searchGreenhouseJobs(query: string) {
  const response = await fetch(`${FUNCTIONS_URL}/greenhouse`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ action: "search_jobs", query }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  return response.json();
}
