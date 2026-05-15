import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { NextRequest } from "next/server";
import { readJson } from "@/lib/server/storage";
import type { AISettings } from "@/lib/types";

export async function POST(req: NextRequest) {
  const { messages, systemPrompt, settings: clientSettings } = await req.json();

  // Use client-provided settings or fall back to server-stored settings
  const settings = clientSettings || await readJson<AISettings | null>("settings.json", null);

  if (!settings?.apiKey) {
    return new Response("未配置 API Key", { status: 400 });
  }

  let model;
  switch (settings.provider) {
    case "anthropic": {
      const anthropic = createAnthropic({
        apiKey: settings.apiKey,
        baseURL: settings.baseUrl || undefined,
      });
      model = anthropic(settings.model);
      break;
    }
    case "openai": {
      const openai = createOpenAI({
        apiKey: settings.apiKey,
        baseURL: settings.baseUrl || undefined,
      });
      model = openai(settings.model);
      break;
    }
    case "custom": {
      const custom = createOpenAI({
        apiKey: settings.apiKey,
        baseURL: settings.baseUrl,
      } as Parameters<typeof createOpenAI>[0]);
      model = custom(settings.model);
      break;
    }
    default:
      return new Response("不支持的提供商", { status: 400 });
  }

  const result = streamText({
    model,
    system: systemPrompt,
    messages,
  });

  return result.toTextStreamResponse();
}
