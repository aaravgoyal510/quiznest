import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { ReticleDev } from "./reticle-dev";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Online Quiz Management System | Educational Institution",
  description: "Secure, real-time quiz management platform for Admin, Teachers, and Students.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.className} bg-slate-950 text-slate-100 min-h-screen antialiased`} suppressHydrationWarning>
        <Providers>{children}</Providers>
        {process.env.NODE_ENV === "development" ? <ReticleDev /> : null}
      </body>
    </html>
  );
}
