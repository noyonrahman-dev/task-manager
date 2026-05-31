import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import { OfflineBanner } from "@/components/pwa/offline-banner";
import { Pwa } from "@/components/pwa/pwa";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Toaster } from "@/components/ui/sonner";
import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE, APP_URL } from "@/lib/constants";

import "./globals.css";

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: `${APP_NAME} — ${APP_TAGLINE}`,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  keywords: [
    "task manager",
    "to-do",
    "productivity",
    "priorities",
    "developer tools",
    "Next.js",
    "open source",
  ],
  authors: [{ name: APP_NAME }],
  creator: APP_NAME,
  category: "productivity",
  openGraph: {
    type: "website",
    url: APP_URL,
    title: `${APP_NAME} — ${APP_TAGLINE}`,
    description: APP_DESCRIPTION,
    siteName: APP_NAME,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: `${APP_NAME} — ${APP_TAGLINE}`,
    description: APP_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: "/manifest.webmanifest",
  // iOS-specific PWA hints. Tells Safari to treat the app as a standalone
  // application when launched from the home screen, with a translucent
  // status bar that blends into our dark/light themes.
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: APP_NAME,
  },
  // Stop iOS Safari from auto-linking phone numbers / addresses inside
  // task descriptions — purely a polish thing for the standalone shell.
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  other: {
    // Windows tile customisation when pinned via Edge.
    "msapplication-TileColor": "#6366f1",
    "msapplication-tap-highlight": "no",
    // Hint Chromium to keep the SW + cache warm during background sync.
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0c" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${fontSans.variable} ${fontMono.variable}`}>
      <body className="min-h-dvh font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <Pwa />
          <div className="flex min-h-dvh flex-col">
            <SiteHeader />
            <OfflineBanner />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </div>
          <Toaster richColors position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
