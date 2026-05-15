"use client";

import { useState, useEffect, useCallback } from "react";
import type { Course } from "@/lib/types";

export function useCourses() {
  const [courses, setCourses] = useState<Course[]>();
  const [loading, setLoading] = useState(true);

  const fetchCourses = useCallback(async () => {
    try {
      const res = await fetch("/api/courses");
      const data = await res.json();
      setCourses(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  async function addCourse(name: string): Promise<string> {
    const res = await fetch("/api/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const course = await res.json();
    await fetchCourses();
    return course.id;
  }

  async function renameCourse(id: string, name: string) {
    await fetch(`/api/courses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    await fetchCourses();
  }

  async function deleteCourse(id: string) {
    await fetch(`/api/courses/${id}`, { method: "DELETE" });
    await fetchCourses();
  }

  return { courses, loading, addCourse, renameCourse, deleteCourse };
}
