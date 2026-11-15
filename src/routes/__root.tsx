import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { META_PIXEL_SNIPPET } from '@/lib/meta-pixel';
import { ClientAuthProvider } from '@/components/client-auth-context';
import { LanguageProvider } from '@/lib/i18n';
import { SiteAnalytics } from '@/components/SiteAnalytics';
import { isResellerHostname, resellerPanelBrand } from '@/lib/reseller-domain';

function useIsResellerDomain() {
  const [isResellerDomain, setIsResellerDomain] = useState(false);
  useEffect(() => {
    setIsResellerDomain(isResellerHostname(window.location.hostname));
  }, []);
  return isResellerDomain;
}

function ResellerMaintenance() {
  const [title, setTitle] = useState("Painel de consumo");
  useEffect(() => {
    const panelTitle = `${resellerPanelBrand(window.location.hostname)} — Painel de consumo`;
    setTitle(panelTitle);
    const apply = () => {
      if (document.title !== panelTitle) document.title = panelTitle;
      document.querySelectorAll('link[rel~="icon"]:not(#reseller-blank-icon)').forEach((l) => l.remove());
      if (!document.getElementById("reseller-blank-icon")) {
        const link = document.createElement("link");
        link.id = "reseller-blank-icon";
        link.rel = "icon";
        link.href = "data:,";
        document.head.appendChild(link);
      }
    };
    apply();
    const obs = new MutationObserver(apply);
    obs.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => obs.disconnect();
  }, []);
  return (
    <iframe title={title} src="/api/public/pulse-usage" className="block h-screen w-full border-0" />
  );
}

function NotFoundComponent() {
  const isResellerDomain = useIsResellerDomain();

  if (isResellerDomain) {
    return <ResellerMaintenance />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
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
      { title: "NEXA CLOUD" },
      { name: "description", content: "Acesso por API para Claude Code." },
      { name: "author", content: "NEXA CLOUD" },
      { name: "theme-color", content: "#D75402" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "NEXA CLOUD" },
      { property: "og:title", content: "NEXA CLOUD" },
      { property: "og:description", content: "Acesso por API para Claude Code." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap" },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
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
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: META_PIXEL_SNIPPET }} />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const isResellerDomain = useIsResellerDomain();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <LanguageProvider><ClientAuthProvider><SiteAnalytics />{isResellerDomain && pathname !== "/consumo" ? <ResellerMaintenance /> : <Outlet />}</ClientAuthProvider></LanguageProvider>
    </QueryClientProvider>
  );
}
