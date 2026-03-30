export function createWidgetApi(baseUrl: string) {
  async function getAgentConfig(agentId: string) {
    const res = await fetch(`${baseUrl}/api/widget/agents/${agentId}`);
    const json = await res.json();
    return json.data;
  }

  async function* streamChat(agentId: string, message: string, conversationId?: string) {
    const res = await fetch(`${baseUrl}/api/widget/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent_id: agentId,
        message,
        conversation_id: conversationId,
      }),
    });

    if (!res.ok) throw new Error('Chat request failed');

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const parsed = JSON.parse(line.slice(6));
          yield parsed;
        } catch {
          // skip
        }
      }
    }
  }

  return { getAgentConfig, streamChat };
}
