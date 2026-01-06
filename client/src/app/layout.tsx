import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "next-themes";
import { TokenRefreshProvider } from "@/components/providers/TokenRefreshProvider";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "Auth - sdjz.wiki",
  description: "管理您的账户和认证",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning className="bg-white dark:bg-[#09090b]">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.bootcdn.net/ajax/libs/inter-ui/4.0.2/inter.min.css"
        />
        {/* 防止页面切换闪白 - 在 JS 加载前就设置背景色 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var isDark = theme === 'dark' || (!theme && systemDark);
                  document.documentElement.style.backgroundColor = isDark ? '#09090b' : '#fff';
                  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
                  if (isDark) document.documentElement.classList.add('dark');
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="bg-white dark:bg-[#09090b]">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ToastProvider>
            <AuthProvider>
              <TokenRefreshProvider>
                {children}
              </TokenRefreshProvider>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
