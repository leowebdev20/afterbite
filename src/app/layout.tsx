import type { Metadata } from "next";
import "./globals.css";
import { TRPCReactProvider } from "@/trpc/provider";
import { BottomNav } from "@/components/common/bottom-nav";
import { AppSessionProvider } from "@/components/providers/session-provider";
import { OnboardingModal } from "@/components/common/onboarding-modal";

export const metadata: Metadata = {
  title: "AfterBite",
  description: "Track food and symptoms to discover personal body patterns.",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AppSessionProvider>
          <TRPCReactProvider>
            <div className="mx-auto w-full max-w-md px-2 pb-28 pt-2">{children}</div>
            <BottomNav />
            <OnboardingModal />
          </TRPCReactProvider>
        </AppSessionProvider>
      </body>
    </html>
  );
}
