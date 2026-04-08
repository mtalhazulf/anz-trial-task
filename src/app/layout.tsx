import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";

export const metadata: Metadata = {
  title: "Voyager Agency Booking",
  description: "Multi-tenant booking management for travel agencies.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <NextTopLoader
          color="#0d9488"
          height={2.5}
          showSpinner={false}
          shadow="0 0 10px #0d9488,0 0 5px #0d9488"
          easing="cubic-bezier(0.2, 0.7, 0.2, 1)"
          speed={400}
        />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              background: "#ffffff",
              color: "#09090b",
              border: "1px solid #e4e4e7",
              borderRadius: "8px",
              fontFamily: "Geist, system-ui, sans-serif",
              fontSize: "13px",
              padding: "10px 14px",
              boxShadow:
                "0 1px 2px rgba(0,0,0,0.04), 0 8px 24px -8px rgba(0,0,0,0.12)",
            },
            success: {
              iconTheme: {
                primary: "#0d9488",
                secondary: "#ffffff",
              },
            },
            error: {
              iconTheme: {
                primary: "#e11d48",
                secondary: "#ffffff",
              },
            },
          }}
        />
        {children}
      </body>
    </html>
  );
}
