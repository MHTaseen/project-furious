import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import CategoryDrawer from "@/components/CategoryDrawer";
import Footer from "@/components/Footer";
import FloatingChat from "@/components/FloatingChat";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  weight: ["600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "FURIOUS",
  description: "FURIOUS Official Store",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plusJakartaSans.variable} ${spaceGrotesk.variable}`}
    >
      <body className="bg-matte-black min-h-screen flex flex-col antialiased">
        {/* Universal Sticky Top Navbar across all pages */}
        <Navbar />

        {/* Universal Category Button & Slide-out Drawer across all pages */}
        <CategoryDrawer />

        {/* Page Content — slides underneath the fixed top navbar & category button */}
        <main style={{ paddingTop: "9.75rem" }} className="flex-1">
          {children}
        </main>

        {/* Universal Footer across all pages */}
        <Footer />

        {/* Universal Floating Live Messenger / Chat across all pages */}
        <FloatingChat />
      </body>
    </html>
  );
}
