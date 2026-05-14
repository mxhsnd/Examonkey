"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppStore } from "@/lib/store";
import { DEFAULT_MODELS } from "@/lib/ai";
import { toast } from "sonner";
import { Check, ChevronDown, Key, Globe, Bot } from "lucide-react";
import type { AISettings } from "@/lib/db";

type Provider = AISettings["provider"];

const providerLabels: Record<Provider, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic (Claude)",
  custom: "自定义 (兼容 OpenAI 格式)",
};

export default function SettingsPage() {
  const { aiSettings, setAISettings } = useAppStore();
  const [provider, setProvider] = useState<Provider>(aiSettings?.provider || "openai");
  const [apiKey, setApiKey] = useState(aiSettings?.apiKey || "");
  const [model, setModel] = useState(aiSettings?.model || "gpt-4o");
  const [baseUrl, setBaseUrl] = useState(aiSettings?.baseUrl || "");

  useEffect(() => {
    if (aiSettings) {
      setProvider(aiSettings.provider);
      setApiKey(aiSettings.apiKey);
      setModel(aiSettings.model);
      setBaseUrl(aiSettings.baseUrl || "");
    }
  }, [aiSettings]);

  function handleSave() {
    if (!apiKey.trim()) {
      toast.error("请输入 API Key");
      return;
    }
    if (!model.trim()) {
      toast.error("请输入模型名称");
      return;
    }

    const settings: AISettings = {
      provider,
      apiKey: apiKey.trim(),
      model: model.trim(),
      baseUrl: baseUrl.trim() || undefined,
    };
    setAISettings(settings);
    toast.success("设置已保存");
  }

  const models = DEFAULT_MODELS[provider] || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">设置</h2>
        <p className="text-muted-foreground">配置 AI 模型接入，所有数据仅存储在本地浏览器中</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            AI 模型配置
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">提供商</label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(providerLabels) as Provider[]).map((p) => (
                <Badge
                  key={p}
                  variant={provider === p ? "default" : "outline"}
                  className="cursor-pointer px-3 py-1.5"
                  onClick={() => {
                    setProvider(p);
                    const defaultModel = DEFAULT_MODELS[p]?.[0]?.id || "";
                    setModel(defaultModel);
                  }}
                >
                  {provider === p && <Check className="mr-1 h-3 w-3" />}
                  {providerLabels[p]}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1">
              <Key className="h-3.5 w-3.5" />
              API Key
            </label>
            <Input
              type="password"
              placeholder={provider === "openai" ? "sk-..." : provider === "anthropic" ? "sk-ant-..." : "输入你的 API Key"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>

          {(provider === "custom" || baseUrl) && (
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1">
                <Globe className="h-3.5 w-3.5" />
                Base URL {provider !== "custom" && "(可选)"}
              </label>
              <Input
                placeholder="https://api.example.com/v1"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1">
              <Bot className="h-3.5 w-3.5" />
              模型
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="模型 ID，如 gpt-4o"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="flex-1"
              />
              {models.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground">
                    <ChevronDown className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {models.map((m) => (
                      <DropdownMenuItem key={m.id} onClick={() => setModel(m.id)}>
                        {m.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          <Button onClick={handleSave} className="w-full">
            保存设置
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>关于数据安全</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>所有课件、笔记、对话记录均存储在浏览器本地 (IndexedDB)，不会上传到任何服务器。</p>
          <p>API Key 仅存储在本地，调用 AI 时直接从浏览器发送到对应的 AI 服务商。</p>
          <p>清除浏览器数据会导致所有本地数据丢失，请注意备份重要内容。</p>
        </CardContent>
      </Card>
    </div>
  );
}
