/** OpenAI integration — uses OPENAI_API_KEY when set, otherwise returns null */

export async function chatCompletion(system: string, userMessage: string): Promise<string | null> {
  const key = Deno.env.get('OPENAI_API_KEY')
  if (!key) return null

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 600,
        temperature: 0.4,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      console.error('OpenAI error', data)
      return null
    }
    return data.choices?.[0]?.message?.content?.trim() ?? null
  } catch (error) {
    console.error('OpenAI request failed', error)
    return null
  }
}

export async function jsonCompletion<T>(system: string, userMessage: string): Promise<T | null> {
  const text = await chatCompletion(system + '\nRespond with valid JSON only.', userMessage)
  if (!text) return null
  try {
    const cleaned = text.replace(/^```json?\s*/i, '').replace(/```\s*$/, '')
    return JSON.parse(cleaned) as T
  } catch {
    return null
  }
}
