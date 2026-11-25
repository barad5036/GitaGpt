/**
 * Server-Side LLM Provider Abstraction Layer (OpenAI-Compatible + Ollama / vLLM)
 * Switch between local open-source models (Ollama / vLLM) and hosted OpenAI-compatible APIs
 * purely via backend environment variables (LLM_BASE_URL, LLM_MODEL, LLM_API_KEY).
 * API keys live ONLY on the backend server.
 */

export async function generateCompletionFromProvider({
  messages,
  temperature = 0.72,
  env
}) {
  const headers = {
    "Content-Type": "application/json"
  };

  if (env.llmApiKey) {
    headers.Authorization = `Bearer ${env.llmApiKey}`;
  }

  const payload = {
    model: env.llmModel || "openai",
    messages,
    temperature,
    seed: Math.floor(Math.random() * 1000000)
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 14000);

  try {
    const res = await fetch(env.llmBaseUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    if (!res.ok) {
      throw new Error(`LLM provider returned HTTP ${res.status}`);
    }

    const data = await res.json();
    const choiceMsg = data?.choices?.[0]?.message;
    return {
      content: choiceMsg?.content || "",
      reasoning: choiceMsg?.reasoning || ""
    };
  } finally {
    clearTimeout(timeout);
  }
}
