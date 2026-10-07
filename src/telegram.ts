type TelegramWebApp = {
  ready: () => void
  expand: () => void
  setHeaderColor?: (color: string) => void
  setBackgroundColor?: (color: string) => void
  themeParams?: Record<string, string>
  MainButton?: {
    hide: () => void
  }
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp
    }
  }
}

export function initTelegramWebApp() {
  const webApp = window.Telegram?.WebApp
  if (!webApp) return

  webApp.ready()
  webApp.expand()
  webApp.setHeaderColor?.('#000000')
  webApp.setBackgroundColor?.('#000000')
  webApp.MainButton?.hide()
}
