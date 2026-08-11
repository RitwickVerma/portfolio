import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ritwick Verma — Software Engineer",
  description:
    "Software engineer at eBay. Builder of homelabs, quant bots, game engines, and Android apps. UC Irvine MCS.",
  openGraph: {
    title: "Ritwick Verma — Software Engineer",
    description:
      "Software engineer at eBay. Builder of homelabs, quant bots, game engines, and Android apps.",
    url: "https://www.ritwickverma.dev",
    siteName: "ritwickverma.dev",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#0a0a0f] text-fg flex flex-col">
        <Nav />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
