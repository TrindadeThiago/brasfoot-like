"use client";

import { createContext, type ReactNode, useContext } from "react";

const AssetsContext = createContext<Readonly<Record<string, string>>>({});

/** Imagens de escudo disponíveis para os escudos abaixo (as da carreira ou do mod, 015). */
export function AssetsProvider({
  assets,
  children,
}: {
  assets: Readonly<Record<string, string>> | undefined;
  children: ReactNode;
}) {
  return <AssetsContext.Provider value={assets ?? {}}>{children}</AssetsContext.Provider>;
}

export function useAssets(): Readonly<Record<string, string>> {
  return useContext(AssetsContext);
}
