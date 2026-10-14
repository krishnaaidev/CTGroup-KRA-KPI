import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CT Group of Institutions • KRA & KPI Performance Management System",
  description: "Secure, cross-platform performance evaluation system managing Faculty, HOD, and HOI appraisals based on the institutional 1,000-mark framework.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-50 min-h-screen text-slate-900">
        {children}
      </body>
    </html>
  );
}
