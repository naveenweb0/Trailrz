"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";

const Ctx = createContext({ meta: null });

export function MetaProvider({ children }) {
  const [meta, setMeta] = useState(null);
  useEffect(() => {
    api.get("/public/meta").then((r) => setMeta(r.data)).catch(() => setMeta(null));
  }, []);
  return <Ctx.Provider value={{ meta }}>{children}</Ctx.Provider>;
}

export const useMeta = () => useContext(Ctx);
