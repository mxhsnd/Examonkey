export async function streamAIResponse(
  res: Response,
  onChunk: (text: string) => void
): Promise<string> {
  const reader = res.body?.getReader();
  const decoder = new TextDecoder();
  let result = "";

  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      result += chunk;
      onChunk(result);
    }
  }

  return result;
}
