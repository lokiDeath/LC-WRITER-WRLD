import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "L-C · Lucian Creation",
  description:
    "A private, invite-only AI writing partner for novelists — long-context memory, character hub, community, and a dark-academia workspace.",
  keywords: [
    "L-C",
    "Lucian Creation",
    "novel writing",
    "AI writing partner",
    "fiction editor",
    "writer platform",
  ],
  authors: [{ name: "L." }],
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%2316130f'/%3E%3Ctext x='16' y='22' font-family='Georgia,serif' font-size='18' fill='%23c9a96e' text-anchor='middle'%3EL%3C/text%3E%3C/svg%3E",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Theme bootstrap — runs before paint to prevent FOUC.
  // Reads saved theme from localStorage and applies the .dark/.light class.
  const themeBootstrap = `(function(){try{
    var t=localStorage.getItem('lc_theme');
    var root=document.documentElement;
    if(t==='light'){root.classList.remove('dark');root.classList.add('light');}
    else{root.classList.remove('light');root.classList.add('dark');}
  }catch(e){}})();`

  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body
        className={`${inter.variable} ${playfair.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
