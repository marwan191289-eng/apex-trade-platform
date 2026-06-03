import { Link, useRouter } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { Languages, LogOut } from "lucide-react";
import logoIcon from "@/assets/icon.png";

export function Header() {
  const { t, lang, toggle } = useI18n();
  const { user, signOut } = useAuth();
  const router = useRouter();

  return (
    <nav className="border-b border-white/5 bg-bg-main/85 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-[1600px] mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2 group" aria-label="TradeXray home">
            <img src={logoIcon} alt="" width={28} height={28} className="rounded-md" />
            <span className="font-bold text-xl tracking-tight">
              Trade<span className="text-accent">X</span>ray
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <Link to="/markets" className="hover:text-foreground transition-colors [&.active]:text-foreground [&.active]:border-b-2 [&.active]:border-accent py-5">
              {t("nav.markets")}
            </Link>
            <Link to="/trade/$symbol" params={{ symbol: "BTC" }} className="hover:text-foreground transition-colors [&.active]:text-foreground [&.active]:border-b-2 [&.active]:border-accent py-5">
              Spot
            </Link>
            <Link to="/futures" className="hover:text-foreground transition-colors [&.active]:text-foreground [&.active]:border-b-2 [&.active]:border-accent py-5">
              Futures
            </Link>
            <Link to="/bots" className="hover:text-foreground transition-colors [&.active]:text-foreground [&.active]:border-b-2 [&.active]:border-accent py-5">
              Bots
            </Link>
            <Link to="/copy" className="hover:text-foreground transition-colors [&.active]:text-foreground [&.active]:border-b-2 [&.active]:border-accent py-5">
              Copy
            </Link>
            <Link to="/earn" className="hover:text-foreground transition-colors [&.active]:text-foreground [&.active]:border-b-2 [&.active]:border-accent py-5">
              Earn
            </Link>
            <Link to="/wallet" className="hover:text-foreground transition-colors [&.active]:text-foreground [&.active]:border-b-2 [&.active]:border-accent py-5">
              {t("nav.wallet")}
            </Link>
          </div>

        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggle}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded border border-white/5"
            aria-label="Toggle language"
          >
            <Languages size={14} />
            {lang === "en" ? "العربية" : "EN"}
          </button>
          {user ? (
            <>
              <Link to="/wallet" className="text-xs text-muted-foreground hover:text-foreground hidden sm:inline">
                {user.email?.split("@")[0]}
              </Link>
              <button
                onClick={async () => { await signOut(); router.navigate({ to: "/" }); }}
                className="text-sm font-medium hover:text-accent flex items-center gap-1.5"
              >
                <LogOut size={14} /> <span className="hidden sm:inline">{t("nav.logout")}</span>
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm font-medium hover:text-accent">
                {t("nav.login")}
              </Link>
              <Link to="/signup" className="bg-accent text-bg-main px-4 py-2 rounded font-bold text-sm hover:brightness-110 transition-all">
                {t("nav.signup")}
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
