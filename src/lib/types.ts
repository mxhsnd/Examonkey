export interface Course {
  id: string;
  name: string;
  createdAt: string;
}

export interface Material {
  id: string;
  courseId: string;
  name: string;
  type: "pdf" | "image" | "text";
  content: string;
  createdAt: string;
}

export interface ExamPaper {
  id: string;
  courseId: string;
  name: string;
  year?: string;
  content: string;
  analysis?: string;
  createdAt: string;
}

export interface KnowledgeEntry {
  id: string;
  courseId: string;
  materialId?: string;
  source: "upload" | "manual";
  title: string;
  content: string;
  fileName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  courseId: string;
  title: string;
  type?: "chat" | "exam-analysis";
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  courseId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface AISettings {
  provider: "openai" | "anthropic" | "custom";
  apiKey: string;
  model: string;
  baseUrl?: string;
}
