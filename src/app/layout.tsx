import type {Metadata} from "next";
import {Geist, Geist_Mono} from "next/font/google";
import "./globals.css";
import AppShell from "@/components/AppShell";
import Providers from "@/components/Providers";
import {Toaster} from "react-hot-toast";
import {Config} from "@/config";

const applicationName: string = Config.app_name;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${applicationName} Billing`,
  description: `Billing system for ${applicationName}`,
};

export default function RootLayout({children}: Readonly<{ children: React.ReactNode; }>) {
  return (
    <html lang="en" suppressHydrationWarning>
    <head>
      <script dangerouslySetInnerHTML={{__html: `try{var t=localStorage.getItem('thlush:theme');if(t)document.documentElement.dataset.theme=t}catch(e){}`}}/>
    </head>
    <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
    <Providers>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {background: 'var(--raised)', color: 'var(--ink)', boxShadow: 'var(--ring-pop)', borderRadius: '10px', fontSize: '13px'},
        }}
      />
      <AppShell>{children}</AppShell>
    </Providers>
    </body>
    </html>
  );
}
