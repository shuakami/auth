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
    <html lang="zh-CN" suppressHydrationWarning className="bg-white dark:bg-black">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.bootcdn.net/ajax/libs/inter-ui/4.0.2/inter.min.css"
        />
      </head>
      <body>
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
