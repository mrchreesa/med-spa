import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/lib/theme-context";
import { cormorantGaramond, dmSans } from "./fonts";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Med Spa Concierge",
  description: "AI-powered patient concierge for medical spas",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider dynamic>
      <html
        lang="en"
        className={`${cormorantGaramond.variable} ${dmSans.variable}`}
        suppressHydrationWarning
      >
        <body className="min-h-screen antialiased" style={{ backgroundColor: "var(--bg)", color: "var(--text)" }}>
          <ThemeProvider>{children}</ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
