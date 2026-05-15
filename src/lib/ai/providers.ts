import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import type { AISettings } from "@/lib/types";

export type AIProvider = ReturnType<typeof createOpenAI> | ReturnType<typeof createAnthropic>;

export function createProvider(settings: AISettings) {
  switch (settings.provider) {
    case "openai":
      return createOpenAI({
        apiKey: settings.apiKey,
        baseURL: settings.baseUrl || undefined,
      });
    case "anthropic":
      return createAnthropic({
        apiKey: settings.apiKey,
        baseURL: settings.baseUrl || undefined,
      });
    case "custom":
      return createOpenAI({
        apiKey: settings.apiKey,
        baseURL: settings.baseUrl,
      } as Parameters<typeof createOpenAI>[0]);
    default:
      throw new Error(`不支持的 AI 提供商: ${settings.provider}`);
  }
}

export function getModelId(settings: AISettings): string {
  return settings.model;
}

export const DEFAULT_MODELS = {
  openai: [
    { id: "gpt-4o", name: "GPT-4o" },
    { id: "gpt-4o-mini", name: "GPT-4o Mini" },
    { id: "gpt-4.1", name: "GPT-4.1" },
  ],
  anthropic: [
    { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6" },
    { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5" },
  ],
  custom: [],
} as const;
