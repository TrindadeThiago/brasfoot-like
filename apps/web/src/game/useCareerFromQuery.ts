"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useGame } from "./GameProvider";

/** Abre a carreira indicada em `?c=<id>` (rotas do jogo em static export, research.md R2). */
export function useCareerFromQuery() {
  const params = useSearchParams();
  const id = params.get("c");
  const game = useGame();
  const { openCareer, state } = game;
  useEffect(() => {
    if (id && state.save?.id !== id) void openCareer(id);
  }, [id, openCareer, state.save?.id]);
  const save = state.save && state.save.id === id ? state.save : undefined;
  return { id, save, game };
}
