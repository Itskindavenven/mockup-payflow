"use client";

import { createContext, useContext } from "react";
import type { SessionUser } from "@/lib/auth-types";

const SessionContext = createContext<SessionUser | null>(null);

export function SessionProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser: SessionUser | null;
}) {
  return (
    <SessionContext.Provider value={initialUser}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionUser | null {
  return useContext(SessionContext);
}
