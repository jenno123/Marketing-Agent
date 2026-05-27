import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { Toaster } from "sonner";
import { createAuthServerClient } from "@/lib/supabase-auth-server";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "Push.ai",
  description: "Marketing platform for De Kulturhistoriske Museer i Holstebro Kommune",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createAuthServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html lang="da" className={poppins.variable}>
      <body style={{ fontFamily: "var(--font-poppins), system-ui, sans-serif" }}>
        {user ? (
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto px-8 py-7 bg-[#F7F5F2]">
              {children}
            </main>
          </div>
        ) : (
          <>{children}</>
        )}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
