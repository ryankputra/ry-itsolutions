"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function VideosRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/ai");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh] text-sm text-zinc-500">
      Mengalihkan ke AI Chat...
    </div>
  );
}
