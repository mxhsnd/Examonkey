"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppStore } from "@/lib/store";
import { SYSTEM_PROMPTS } from "@/lib/ai";
import { db } from "@/lib/db";
import { CourseGuard } from "@/components/course-guard";
import { toast } from "sonner";
import {
  ClipboardList,
  Loader2,
  Sparkles,
  CheckCircle,
  XCircle,
  Send,
  RotateCcw,
} from "lucide-react";

interface Question {
  type: string;
  difficulty: string;
  question: string;
  options?: string[];
  answer: string;
  explanation: string;
  keyPoint: string;
}

export default function QuizPage() {
  const { aiSettings, currentCourseId } = useAppStore();
  const [topic, setTopic] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [selfAssess, setSelfAssess] = useState<Record<number, boolean>>({});

  async function handleGenerate() {
    if (!topic.trim()) {
      toast.error("请输入课程内容或知识点");
      return;
    }
    if (!aiSettings?.apiKey) {
      toast.error("请先在设置中配置 API Key");
      return;
    }

    setLoading(true);
    setQuestions([]);
    setUserAnswers({});
    setSubmitted(false);
    setSelfAssess({});

    try {
      let content = topic;
      if (currentCourseId) {
        const entries = await db.knowledgeEntries
          .where("courseId")
          .equals(currentCourseId)
          .toArray();
        if (entries.length > 0) {
          const kb = entries.map((e) => e.content).join("\n\n").slice(0, 8000);
          content = `知识库内容：\n${kb}\n\n用户指定范围：${topic}`;
        }
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: aiSettings,
          systemPrompt: SYSTEM_PROMPTS.generateQuestions,
          messages: [
            {
              role: "user",
              content: `请根据以下内容生成 5 道模拟考试题目（混合题型）：\n\n${content}`,
            },
          ],
        }),
      });

      if (!res.ok) throw new Error(await res.text());

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let result = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          result += decoder.decode(value, { stream: true });
        }
      }

      const jsonMatch = result.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setQuestions(parsed);
        toast.success(`已生成 ${parsed.length} 道题目`);
      } else {
        toast.error("AI 返回格式异常，请重试");
      }
    } catch (err) {
      toast.error("出题失败: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function isAutoGradable(q: Question) {
    return q.type.includes("选择") || q.type.includes("填空");
  }

  function checkAnswer(q: Question, userAnswer: string): boolean {
    if (!userAnswer) return false;
    const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, "");
    return norm(userAnswer) === norm(q.answer);
  }

  function handleSubmit() {
    setSubmitted(true);
  }

  function handleReset() {
    setQuestions([]);
    setUserAnswers({});
    setSubmitted(false);
    setSelfAssess({});
  }

  function getScore() {
    let correct = 0;
    let total = questions.length;
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (isAutoGradable(q)) {
        if (checkAnswer(q, userAnswers[i] || "")) correct++;
      } else {
        if (selfAssess[i]) correct++;
      }
    }
    return { correct, total };
  }

  const difficultyColor = (d: string) => {
    if (d === "简单") return "bg-green-100 text-green-800";
    if (d === "中等") return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const score = submitted ? getScore() : null;

  return (
    <CourseGuard>
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardList className="h-6 w-6" />
          AI 模拟出题
        </h2>
        <p className="text-muted-foreground">
          输入知识点或粘贴课件内容，AI 生成模拟考试题目
        </p>
      </div>

      {!questions.length && (
        <Card>
          <CardHeader>
            <CardTitle>输入出题范围</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="输入课程名称、知识点、或粘贴课件内容...&#10;例如：数据结构中的排序算法（冒泡、快排、归并、堆排序）"
              rows={5}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
            <Button
              onClick={handleGenerate}
              disabled={loading || !topic.trim()}
              className="w-full gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {loading ? "AI 正在出题..." : "生成模拟题"}
            </Button>
          </CardContent>
        </Card>
      )}

      {submitted && score && (
        <Card>
          <CardContent className="py-6">
            <div className="text-center space-y-3">
              <p className="text-3xl font-bold">
                {score.correct}/{score.total}
              </p>
              <Progress value={(score.correct / score.total) * 100} className="h-3" />
              <p className="text-sm text-muted-foreground">
                正确率 {Math.round((score.correct / score.total) * 100)}%
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {questions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              模拟题目 ({questions.length} 题)
            </h3>
            {submitted && (
              <Button variant="outline" size="sm" onClick={handleReset} className="gap-1">
                <RotateCcw className="h-3.5 w-3.5" />
                重新做题
              </Button>
            )}
          </div>

          {questions.map((q, i) => {
            const isCorrect = submitted && isAutoGradable(q) && checkAnswer(q, userAnswers[i] || "");
            const isWrong = submitted && isAutoGradable(q) && !checkAnswer(q, userAnswers[i] || "");
            const borderColor = submitted
              ? isCorrect || selfAssess[i]
                ? "border-l-4 border-l-green-500"
                : isWrong || (submitted && !isAutoGradable(q) && selfAssess[i] === false)
                ? "border-l-4 border-l-red-500"
                : "border-l-4 border-l-yellow-500"
              : "";

            return (
              <Card key={i} className={borderColor}>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{q.type}</Badge>
                    <Badge className={difficultyColor(q.difficulty)}>
                      {q.difficulty}
                    </Badge>
                    <Badge variant="secondary">{q.keyPoint}</Badge>
                  </div>

                  <p className="font-medium">
                    {i + 1}. {q.question}
                  </p>

                  {q.options && (
                    <div className="space-y-1 pl-4">
                      {q.options.map((opt, j) => (
                        <label
                          key={j}
                          className="flex items-center gap-2 cursor-pointer text-sm"
                        >
                          <input
                            type="radio"
                            name={`q-${i}`}
                            value={opt}
                            checked={userAnswers[i] === opt}
                            onChange={() =>
                              setUserAnswers({ ...userAnswers, [i]: opt })
                            }
                            disabled={submitted}
                            className="accent-primary"
                          />
                          {opt}
                        </label>
                      ))}
                    </div>
                  )}

                  {!q.options && q.type.includes("填空") && (
                    <Input
                      placeholder="输入答案"
                      value={userAnswers[i] || ""}
                      onChange={(e) => setUserAnswers({ ...userAnswers, [i]: e.target.value })}
                      disabled={submitted}
                    />
                  )}

                  {!q.options && !q.type.includes("填空") && (
                    <Textarea
                      placeholder="输入你的答案..."
                      rows={3}
                      value={userAnswers[i] || ""}
                      onChange={(e) => setUserAnswers({ ...userAnswers, [i]: e.target.value })}
                      disabled={submitted}
                    />
                  )}

                  {submitted && (
                    <div className="border-t pt-3 space-y-2 text-sm">
                      <p className="flex items-center gap-1 font-medium text-green-700">
                        <CheckCircle className="h-4 w-4" />
                        答案：{q.answer}
                      </p>
                      <p className="text-muted-foreground">{q.explanation}</p>

                      {!isAutoGradable(q) && (
                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-xs text-muted-foreground">自评：</span>
                          <Button
                            size="xs"
                            variant={selfAssess[i] === true ? "default" : "outline"}
                            onClick={() => setSelfAssess({ ...selfAssess, [i]: true })}
                            className="gap-1"
                          >
                            <CheckCircle className="h-3 w-3" />
                            答对了
                          </Button>
                          <Button
                            size="xs"
                            variant={selfAssess[i] === false ? "destructive" : "outline"}
                            onClick={() => setSelfAssess({ ...selfAssess, [i]: false })}
                            className="gap-1"
                          >
                            <XCircle className="h-3 w-3" />
                            答错了
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {!submitted && (
            <Button onClick={handleSubmit} className="w-full gap-2">
              <Send className="h-4 w-4" />
              提交答卷
            </Button>
          )}
        </div>
      )}
    </div>
    </CourseGuard>
  );
}
