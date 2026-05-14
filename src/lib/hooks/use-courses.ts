"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, type Course } from "@/lib/db";

export function useCourses() {
  const courses = useLiveQuery(() => db.courses.orderBy("createdAt").toArray());

  async function addCourse(name: string): Promise<number> {
    return db.courses.add({ name, createdAt: new Date() }) as Promise<number>;
  }

  async function renameCourse(id: number, name: string) {
    await db.courses.update(id, { name });
  }

  async function deleteCourse(id: number) {
    await db.transaction("rw", [db.courses, db.materials, db.examPapers, db.knowledgeEntries, db.conversations, db.chatMessages], async () => {
      const convIds = (await db.conversations.where("courseId").equals(id).primaryKeys()) as number[];
      if (convIds.length > 0) {
        await db.chatMessages.where("conversationId").anyOf(convIds).delete();
      }
      await db.conversations.where("courseId").equals(id).delete();
      await db.knowledgeEntries.where("courseId").equals(id).delete();
      await db.materials.where("courseId").equals(id).delete();
      await db.examPapers.where("courseId").equals(id).delete();
      await db.courses.delete(id);
    });
  }

  return { courses, addCourse, renameCourse, deleteCourse };
}
