import "./globals.css";
import type { Metadata } from "next";
import AuthProvider from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "Money Calendar",
  description: "Plan bills, paychecks, and safe-to-save projections",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <AuthProvider>
          <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">{children}</div>
        </AuthProvider>
      </body>
    </html>
  );
}


