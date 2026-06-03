import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { I18nProvider } from "@/lib/i18n";
import { AuthProvider } from "@/lib/auth-context";
import { LivePricesProvider } from "@/lib/live-prices";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-main px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-accent">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-md bg-accent px-4 py-2 text-sm font-bold text-bg-main hover:brightness-110 transition-all">
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-main px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="inline-flex items-center justify-center rounded-md bg-accent px-4 py-2 text-sm font-bold text-bg-main hover:brightness-110"
          >
            Try again
          </button>
          <a href="/" className="inline-flex items-center justify-center rounded-md border border-white/10 bg-bg-card px-4 py-2 text-sm font-medium hover:bg-bg-elevated">
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "TradeXray — Professional Crypto Trading Platform" },
      { name: "description", content: "TradeXray is a professional crypto trading platform with live markets for 500+ assets, advanced charts, futures, bots, copy trading and staking. Bilingual EN/AR." },
      { name: "keywords", content: "crypto trading, bitcoin, ethereum, futures, spot trading, trading bots, copy trading, staking, TradeXray" },
      { name: "author", content: "TradeXray" },
      { name: "theme-color", content: "#0B0E11" },
      { property: "og:site_name", content: "TradeXray" },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "TradeXray — Professional Crypto Trading" },
      { property: "og:description", content: "Live crypto markets, advanced charts, futures with leverage, automated bots and copy trading." },
      { property: "og:image", content: "/og-image.jpg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "TradeXray — Professional Crypto Trading" },
      { name: "twitter:description", content: "Live crypto markets, advanced charts, futures, bots, copy trading and staking." },
      { name: "twitter:image", content: "/og-image.jpg" },
    ],
    links: [
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AuthProvider>
          <Outlet />
          <Toaster theme="dark" position="top-right" toastOptions={{ style: { background: "var(--bg-card)", border: "1px solid oklch(1 0 0 / 0.06)", color: "var(--foreground)" } }} />
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}
