import type { ButtonHTMLAttributes, Ref } from "react";
import styles from "./Button.module.css";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "text";
  /** O `ref` é uma prop comum no React 19. */
  ref?: Ref<HTMLButtonElement>;
}

export function Button({
  variant = "secondary",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`${styles.button} ${styles[variant]} ${className ?? ""}`}
      {...props}
    />
  );
}
