type TelegramWebApp = {
  ready: () => void
  expand: () => void
  setHeaderColor?: (color: string) => void
  setBackgroundColor?: (color: string) => void
  disableVerticalSwipes?: () => void
  isVerticalSwipesEnabled?: boolean
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

/** Keep layout from jumping when mobile keyboard opens on inputs. */
export function lockKeyboardViewportJump() {
  let lockedScrollTop = 0

  const scroller = () =>
    document.querySelector('.app') as HTMLElement | null

  document.addEventListener(
    'focusin',
    (event) => {
      const target = event.target
      if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) {
        return
      }

      const root = scroller()
      lockedScrollTop = root?.scrollTop ?? window.scrollY

      // Browser/Telegram often scrolls the page with the keyboard — undo it.
      requestAnimationFrame(() => {
        if (root) {
          root.scrollTop = lockedScrollTop
        } else {
          window.scrollTo(0, lockedScrollTop)
        }
      })
      window.setTimeout(() => {
        if (root) {
          root.scrollTop = lockedScrollTop
        } else {
          window.scrollTo(0, lockedScrollTop)
        }
      }, 50)
      window.setTimeout(() => {
        if (root) {
          root.scrollTop = lockedScrollTop
        } else {
          window.scrollTo(0, lockedScrollTop)
        }
      }, 300)
    },
    true,
  )
}

export function initTelegramWebApp() {
  const webApp = window.Telegram?.WebApp
  if (!webApp) return

  webApp.ready()
  webApp.expand()
  webApp.setHeaderColor?.('#000000')
  webApp.setBackgroundColor?.('#000000')
  webApp.MainButton?.hide()

  try {
    webApp.disableVerticalSwipes?.()
    if (typeof webApp.isVerticalSwipesEnabled === 'boolean') {
      webApp.isVerticalSwipesEnabled = false
    }
  } catch {
    // older Telegram clients
  }
}
