import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Hosthell — Raise Hell. Own Your Infra.",
  description:
    "The AI-powered hosting business OS. Launch, run, and scale a full hosting company in minutes. White-labeled storefronts, client dashboards, billing, automated provisioning, and an AI DevOps agent that handles everything.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${spaceGrotesk.variable} font-sans`}>
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "hsl(0 0% 8%)",
              color: "hsl(0 0% 95%)",
              border: "1px solid hsl(0 0% 14%)",
            },
          }}
        />
        {children}
      </body>
    </html>
  );
}
