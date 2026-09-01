import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * material.tsx — what every surface in the app is made of.
 *
 * Glass turned out to be a demanding material: it only reads as glass
 * when there is vivid, structured content behind it, and it collapses to
 * grey over a dark screen. Matte asks nothing of its surroundings — a
 * solid surface, lit from above, with real depth under it — so the app
 * looks the same whether the room is bright or almost black.
 *
 * One switch, and every screen changes, because every screen already
 * draws through the same Surface component.
 */

export type MaterialMode = "matte" | "glass";

const KEY = "material_mode_v1";

interface MaterialValue {
  mode: MaterialMode;
  setMode: (m: MaterialMode) => void;
  ready: boolean;
}

const MaterialContext = createContext<MaterialValue>({
  mode: "matte",
  setMode: () => {},
  ready: false,
});

export function MaterialProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<MaterialMode>("matte");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => {
        if (v === "glass" || v === "matte") setModeState(v);
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const setMode = (m: MaterialMode) => {
    setModeState(m);
    AsyncStorage.setItem(KEY, m).catch(() => {});
  };

  return (
    <MaterialContext.Provider value={{ mode, setMode, ready }}>
      {children}
    </MaterialContext.Provider>
  );
}

export function useMaterial() {
  return useContext(MaterialContext);
}

/**
 * The matte palette. Surfaces are opaque and near-black with a cool
 * bias, so they sit on any backdrop without borrowing its colour. Light
 * comes from above: a pale top edge, a darker floor, a soft shadow
 * beneath. Nothing is transparent, so nothing can turn to mud.
 */
export const MATTE = {
  surface: "#15171C",
  surfaceRaised: "#1C1F26",
  surfaceSunken: "#101216",
  topEdge: "rgba(255,255,255,0.09)",
  hairline: "rgba(255,255,255,0.07)",
  ink: "#F2F4F7",
  inkDim: "rgba(242,244,247,0.62)",
  shadow: "#000000",
} as const;
