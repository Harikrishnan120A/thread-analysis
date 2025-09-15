import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";
import { SettingsProvider } from "@/lib/settings";

export const metadata: Metadata = {
  title: "CyberGuard Platform",
  description: "Real-time cybersecurity monitoring and analytics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <SettingsProvider>
          <AppShell>{children}</AppShell>
        </SettingsProvider>
      </body>
    </html>
  );
}

