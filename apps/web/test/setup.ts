import "fake-indexeddb/auto";
import { cleanup } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, vi } from "vitest";
import { memoryRouter } from "./helpers/router";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: memoryRouter.push,
    replace: memoryRouter.push,
    back: () => memoryRouter.push("/"),
    refresh: () => {},
  }),
  useSearchParams: () => memoryRouter.searchParams(),
  usePathname: () => memoryRouter.pathname(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) =>
    createElement(
      "a",
      {
        ...rest,
        href,
        onClick: (event: MouseEvent) => {
          event.preventDefault();
          memoryRouter.push(href);
        },
      },
      children,
    ),
}));

afterEach(() => {
  cleanup();
});
