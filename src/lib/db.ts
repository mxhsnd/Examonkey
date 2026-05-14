import Dexie, { type EntityTable } from "dexie";

export interface Course {
  id?: number;
  name: string;
  createdAt: Date;
}

export interface Material {
  id?: number;
  courseId: number;
  name: string;
  type: "pdf" | "image" | "text";
  content: string;
  rawFile?: Blob;
  createdAt: Date;
}

export interface ExamPaper {
  id?: number;
  courseId: number;
  name: string;
  year?: string;
  content: string;
  analysis?: string;
  createdAt: Date;
}

export interface KnowledgeEntry {
  id?: number;
  courseId: number;
  materialId?: number;
  source: "upload" | "manual";
  title: string;
  content: string;
  fileName?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Conversation {
  id?: number;
  courseId: number;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  id?: number;
  conversationId: number;
  courseId: number;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

export interface AISettings {
  id?: number;
  provider: "openai" | "anthropic" | "custom";
  apiKey: string;
  model: string;
  baseUrl?: string;
}

const db = new Dexie("ExamonkeyDB") as Dexie & {
  courses: EntityTable<Course, "id">;
  materials: EntityTable<Material, "id">;
  examPapers: EntityTable<ExamPaper, "id">;
  knowledgeEntries: EntityTable<KnowledgeEntry, "id">;
  conversations: EntityTable<Conversation, "id">;
  chatMessages: EntityTable<ChatMessage, "id">;
  aiSettings: EntityTable<AISettings, "id">;
};

db.version(1).stores({
  courses: "++id, name, createdAt",
  materials: "++id, courseId, name, type, createdAt",
  examPapers: "++id, courseId, name, createdAt",
  chatMessages: "++id, courseId, role, createdAt",
  aiSettings: "++id, provider",
});

db.version(2).stores({
  courses: "++id, name, createdAt",
  materials: "++id, courseId, name, type, createdAt",
  examPapers: "++id, courseId, name, createdAt",
  knowledgeEntries: "++id, courseId, materialId, source, createdAt",
  conversations: "++id, courseId, title, createdAt, updatedAt",
  chatMessages: "++id, conversationId, courseId, role, createdAt",
  aiSettings: "++id, provider",
});

export { db };
