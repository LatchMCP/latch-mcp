import type { Metadata, Viewport } from "next";
import { Inter, Host_Grotesk, Geist_Mono, Instrument_Serif, Darker_Grotesque } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-context";
import { UserProvider } from "@/components/providers/user";
import { Toaster } from "@/components/ui/sonner";
import Navbar from "@/components/custom-ui/navbar";
import { wagmiConfig } from "@/lib/client/config";
import { WagmiProvider } from "wagmi";
import { AppReactQueryProvider } from "@/components/providers/query-client";
import { Analytics } from "@vercel/analytics/next"

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: ["400"],
});

const darkerGrotesque = Darker_Grotesque({
  variable: "--font-darker-grotesque",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const hostGrotesk = Host_Grotesk({
  variable: "--font-host-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Latch - Payments for MCPs",
  description: "The open multichain infrastructure connecting MCP and x402",
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
    ]
  },
  openGraph: {
    type: "website",
    title: "Latch - Payments for MCPs",
    description: "The open multichain infrastructure connecting MCP and x402",
  }
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta property="og:image" content="/opengraph-image.png" />
        <meta property="og:title" content="Latch - Payments for MCPs" />
        <meta property="og:description" content="The open multichain infrastructure connecting MCP and x402" />
      </head>
      <body
        className={`${darkerGrotesque.variable} ${instrumentSerif.variable} antialiased `}
      >
        <ThemeProvider>
          <WagmiProvider config={wagmiConfig}>
            <AppReactQueryProvider>
              <UserProvider>
                <Navbar />
                {children}
                <Toaster />
              </UserProvider>
            </AppReactQueryProvider>
          </WagmiProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
