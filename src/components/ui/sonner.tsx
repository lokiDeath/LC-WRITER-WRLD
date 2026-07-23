"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--bg-dropdown)",
          "--normal-text": "var(--text-primary)",
          "--normal-border": "var(--border-subtle)",
          "--success-bg": "var(--bg-dropdown)",
          "--success-text": "var(--text-primary)",
          "--success-border": "var(--color-success)",
          "--error-bg": "var(--bg-dropdown)",
          "--error-text": "var(--text-primary)",
          "--error-border": "var(--color-danger)",
          "--warning-bg": "var(--bg-dropdown)",
          "--warning-text": "var(--text-primary)",
          "--warning-border": "var(--color-warning)",
          "--info-bg": "var(--bg-dropdown)",
          "--info-text": "var(--text-primary)",
          "--info-border": "var(--color-info)",
        } as React.CSSProperties
      }
      toastOptions={{
        style: {
          boxShadow: "var(--shadow-pop)",
          borderRadius: "var(--radius-lg)",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
