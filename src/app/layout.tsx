// Import Library
import type { JSX } from "react";
import type { Metadata } from "next";
import { Inter, Noto_Sans_Thai, Geist } from "next/font/google";
// Import Providers
import { AuthProvider } from "@/src/app/providers/AuthProvider";
// Import Shared
import { cn } from "@/src/app/lib/shared/utils";
// Import Styles
import "./globals.css";

/* -------------------------------------- Config -------------------------------------- */

// Config ฟอนต์ Geist ใช้เป็น --font-sans
const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

// Config ฟอนต์ Inter สำหรับตัวอักษรอังกฤษ
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Config ฟอนต์ Noto Sans Thai สำหรับตัวอักษรไทย
const notoThai = Noto_Sans_Thai({
  subsets: ["thai"],
  variable: "--font-thai",
  weight: ["400", "700"],
  display: "swap",
});

// Config title และ description ของเว็บ
export const metadata: Metadata = {
  title: "Admin Carpark",
  description: "Admin Carpark",
};

/* -------------------------------------- Component -------------------------------------- */

// Function layout หลักของทุกหน้า ใส่ฟอนต์และ AuthProvider
function RootLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <html lang="th" className={cn("font-sans", geist.variable)}>
      <body
        className={`${inter.variable} ${notoThai.variable} m-0 antialiased`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

export default RootLayout;
