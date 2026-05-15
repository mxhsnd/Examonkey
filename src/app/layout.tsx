import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = {
  title: "Examonkey - AI 期末突击助手",
  description: "AI 驱动的大学生期末复习工具，智能总结、真题分析、模拟出题、答疑对话",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex font-sans">
        <ThemeProvider>
          <Sidebar />
          <main className="flex-1 min-h-screen transition-all duration-200" id="main-content">
            {children}
          </main>
          <div className="fixed bottom-4 left-4 z-50">
            <ThemeToggle />
          </div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
