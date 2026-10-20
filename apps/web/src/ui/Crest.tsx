"use client";

import type { Crest as CrestData } from "@brasfoot-like/engine";
import { useAssets } from "./AssetsProvider";

/** Cor de texto legível sobre o fundo (luminância relativa simples). */
export function textColorFor(background: string): string {
  const hex = background.replace("#", "");
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#111111" : "#FFFFFF";
}

const PATHS: Record<CrestData["shape"], string> = {
  classic: "M10 6 H90 V48 C90 74 70 88 50 96 C30 88 10 74 10 48 Z",
  round: "M50 4 A46 46 0 1 1 49.99 4 Z",
  triangle: "M50 4 L94 92 H6 Z",
  rectangle: "M8 8 H92 V92 H8 Z",
};

interface CrestProps {
  crest: CrestData;
  /** Nome do clube, para leitores de tela. */
  label: string;
  size?: number;
}

/**
 * Escudo do clube: a imagem do mod quando existe (015), senão o desenho a partir dos dados —
 * forma, cores e iniciais (research.md R8).
 */
export function Crest({ crest, label, size = 32 }: CrestProps) {
  const assets = useAssets();
  const image = crest.image ? assets[crest.image] : undefined;
  if (image) {
    // biome-ignore lint/performance/noImgElement: imagem embutida (data URI) num export estático
    return <img src={image} alt={label} width={size} height={size} />;
  }
  const [primary = "#888888", secondary = "#FFFFFF", tertiary] = crest.colors;
  const path = PATHS[crest.shape];
  const clipId = `crest-${crest.shape}-${primary.slice(1)}-${secondary.slice(1)}-${crest.initials}`;
  const fontSize = crest.initials.length <= 2 ? 34 : crest.initials.length === 3 ? 27 : 21;
  const textY = crest.shape === "triangle" ? 70 : 58;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label={label}
      data-shape={crest.shape}
    >
      <defs>
        <clipPath id={clipId}>
          <path d={path} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <rect x="0" y="0" width="100" height="100" fill={primary} />
        <rect x="0" y="62" width="100" height="38" fill={secondary} />
        {tertiary ? <rect x="0" y="56" width="100" height="6" fill={tertiary} /> : null}
      </g>
      <path d={path} fill="none" stroke={secondary} strokeWidth="4" />
      <text
        x="50"
        y={textY}
        textAnchor="middle"
        fontSize={fontSize}
        fontWeight="700"
        fontFamily="system-ui, sans-serif"
        fill={textColorFor(primary)}
      >
        {crest.initials}
      </text>
    </svg>
  );
}
