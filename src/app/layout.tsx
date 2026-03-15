import type { Metadata } from "next";
import "./globals.css";
import { TRPCReactProvider } from "@/trpc/provider";

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
    <html lang="en">
      <body>
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  );
}
