import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import Link from "next/link";
import { BillingInspector } from "@/components/BillingInspector";
import { EntitlementProvider } from "@/components/EntitlementProvider";
import { EnvironmentSwitch } from "@/components/EnvironmentSwitch";
import { LaunchButton } from "@/components/LaunchButton";
import { LogoMark } from "@/components/LogoMark";
import { NavMenu } from "@/components/NavMenu";
import { ProBadge } from "@/components/ProBadge";
import styles from "./layout.module.css";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3100"),
  title: {
    default: "Scenar - Rehearse the conversations that matter",
    template: "%s · Scenar",
  },
  description:
    "Practise salary negotiations, saying no, and tough feedback against AI counterparts with hidden agendas. Watch the tension meter react in real time, then get a scored report and the truth they were hiding.",
  applicationName: "Scenar",
  keywords: [
    "conversation practice",
    "AI roleplay",
    "salary negotiation practice",
    "difficult conversations",
    "communication skills",
    "boundary setting",
    "feedback training",
    "RevenueCat Shipaton",
  ],
  openGraph: {
    title: "Scenar - Rehearse the conversations that matter",
    description:
      "Roleplay high-stakes conversations against AI counterparts with hidden agendas. Live tension meter, scored report, tactical rewrites.",
    type: "website",
    siteName: "Scenar",
    locale: "en_US",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Scenar - Rehearse the conversations that matter",
    description:
      "Roleplay high-stakes conversations against AI counterparts with hidden agendas. Live tension meter, scored report, tactical rewrites.",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable}`}>
      <body>
        <EntitlementProvider>
          <a href="#main" className={styles.skip}>
            Skip to content
          </a>
          <header className={styles.nav}>
            <div className={styles.navLeft}>
              <Link href="/" className={styles.brand} aria-label="Scenar home">
                <LogoMark size={28} />
                <span className={styles.wordmark}>Scenar</span>
              </Link>
              <NavMenu />
            </div>
            <div className={styles.navRight}>
              <div className={styles.navEnv}>
                <EnvironmentSwitch size="sm" />
              </div>
              <LaunchButton />
              <ProBadge />
            </div>
          </header>
          <main id="main" className={styles.main}>
            {children}
          </main>
          <BillingInspector />
        </EntitlementProvider>
      </body>
    </html>
  );
}
