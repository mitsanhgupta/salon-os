import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { inter, interTight } from "../lib/fonts";
import { AuthProvider } from "../components/auth/AuthContext";

export const metadata: Metadata = {
  title: "Direktor — AI Operating System for Salons",
  description:
    "One salon. One system. Three experiences. AI-powered salon management for owners, receptionists, and customers.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      signInUrl="/login"
      signUpUrl="/register"
      afterSignOutUrl="/login"
    >
      <html lang="en">
        <body className={`${inter.variable} ${interTight.variable} font-body bg-bg text-text-primary antialiased`}>
          <AuthProvider>{children}</AuthProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}