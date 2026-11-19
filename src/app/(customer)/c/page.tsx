import type { Metadata } from "next";
import { appConfig } from "@/config";

export const metadata: Metadata = { title: "Welcome" };

export default function CustomerHomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-2 p-6 text-center">
      <h1 className="text-2xl font-semibold">{appConfig.appName}</h1>
      <p className="text-muted-foreground">Our menu and ordering are coming soon.</p>
    </main>
  );
}
