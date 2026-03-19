import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { Theme } from "../types";

const ThemesContext = createContext<Theme[]>([]);

export function ThemesProvider({ children }: { children: ReactNode }) {
  const [themes, setThemes] = useState<Theme[]>([]);

  useEffect(() => {
    invoke<Theme[]>("load_themes").then(setThemes).catch(console.error);
  }, []);

  return <ThemesContext.Provider value={themes}>{children}</ThemesContext.Provider>;
}

export function useThemes(): Theme[] {
  return useContext(ThemesContext);
}
