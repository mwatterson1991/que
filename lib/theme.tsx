import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { CDark, CLight, type ColorPalette } from "./tokens";
import { useAuth } from "./auth";
import { supabase } from "./supabase";

type ThemeMode = "dark" | "light";

type ThemeState = {
  mode: ThemeMode;
  colors: ColorPalette;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeState>({
  mode: "dark",
  colors: CDark,
  isDark: true,
  setMode: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [mode, setModeState] = useState<ThemeMode>("dark");

  // Load saved preference from Supabase
  useEffect(() => {
    if (!user) return;
    supabase
      .from("preferences")
      .select("dark_mode")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setModeState(data.dark_mode ? "dark" : "light");
        }
      });
  }, [user]);

  const setMode = useCallback(
    (next: ThemeMode) => {
      setModeState(next);
      if (user) {
        supabase
          .from("preferences")
          .update({ dark_mode: next === "dark" })
          .eq("user_id", user.id);
      }
    },
    [user],
  );

  const isDark = mode === "dark";
  const colors = isDark ? CDark : CLight;

  return (
    <ThemeContext.Provider value={{ mode, colors, isDark, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

/** Access the full theme state (mode, setMode, isDark). */
export const useTheme = () => useContext(ThemeContext);

/** Shorthand — returns only the active color palette. */
export const useColors = () => useContext(ThemeContext).colors;
