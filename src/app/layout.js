import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
// 1. Imported the optimized Next.js Script component
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Feel free to change these strings to match GNIS!
export const metadata = {
  title: "GNIS Platform",
  description: "Global Network Integration System",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}

        {/* 2. Your Live-Chat Support Widget Script with your actual Website ID */}
        <Script id="crisp-chat-widget" strategy="afterInteractive">
          {`
            window.$crisp=[];
            window.CRISP_WEBSITE_ID = "6f018d28-cc01-4a9c-a232-4011a72612f6";
            (function(){
              d=document;
              s=d.createElement("script");
              s.src="https://client.crisp.chat/l.js";
              s.async=1;
              d.getElementsByTagName("head")[0].appendChild(s);
            })();
          `}
        </Script>
      </body>
    </html>
  );
}