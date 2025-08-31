import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "next-themes";
import { TokenRefreshProvider } from "@/components/providers/TokenRefreshProvider";

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
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        {/* @ts-expect-error // Ignore the incorrect children type error for ThemeProvider */}
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <TokenRefreshProvider>
              {children}
            </TokenRefreshProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
