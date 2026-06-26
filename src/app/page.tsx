"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getConnection } from "@/lib/connection";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router.replace(getConnection() ? "/dashboard" : "/connect");
  }, [router]);
  return null;
}
