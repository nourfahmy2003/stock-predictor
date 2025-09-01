import { Poppins, Inter, Roboto_Mono } from "next/font/google"
import { ThemeProvider } from "next-themes"
import Navbar from "@/components/navigation/navbar"
import "./globals.css"

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
})

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
})

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-roboto-mono",
  display: "swap",
})

export const metadata = {
  title: "MarketPulse - AI-Powered Stock Analysis",
  description: "AI-powered stock analysis and prediction platform for students, analysts, and retail investors",
  generator: "v0.app",
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* No-flash: inline script decides initial class BEFORE React */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(){
  try {
    var theme = localStorage.getItem('theme');
    if (!theme) {
      var m = window.matchMedia('(prefers-color-scheme: dark)');
      theme = m.matches ? 'dark' : 'light';
    }
    var doc = document.documentElement;
    if (theme === 'dark') doc.classList.add('dark'); else doc.classList.remove('dark');
  } catch(e){}
})();`,
          }}
        />
      </head>
      <body
        className={`${poppins.variable} ${inter.variable} ${robotoMono.variable} antialiased bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100`}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Navbar />
          <main className="pt-20">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  )
}
