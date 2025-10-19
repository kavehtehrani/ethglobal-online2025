import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PrivyProviderWrapper } from "@/components/PrivyProviderWrapper";
import { ThemeProvider } from "@/contexts/ThemeContext";
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
  title: "Gasless PYUSD Payments",
  description:
    "Send PYUSD on Sepolia without paying gas fees using EIP-7702 + Pimlico + Privy",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <PrivyProviderWrapper>{children}</PrivyProviderWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}
