import type { Metadata } from "next";
import "./globals.css";
import { UserProvider } from "@/lib/user-context";
import { ActivityProvider } from "@/lib/activity-context";
import { CatalogProvider } from "@/lib/catalog-context";
import { ReaderProvider } from "@/lib/reader-context";
import AppShell from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "NewsMind AI — Personalized intelligence for every reader",
  description:
    "AI-powered personalized news recommendation platform using GRU sequential user behavior modeling.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased">
        <UserProvider>
          <ActivityProvider>
            <CatalogProvider>
              <ReaderProvider>
                <AppShell>{children}</AppShell>
              </ReaderProvider>
            </CatalogProvider>
          </ActivityProvider>
        </UserProvider>
      </body>
    </html>
  );
}
