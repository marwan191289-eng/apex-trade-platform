import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="border-t border-white/5 bg-bg-main mt-20">
      <div className="max-w-[1600px] mx-auto px-4 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="col-span-2">
          <div className="font-bold text-2xl tracking-tight mb-3">Trade<span className="text-accent">X</span>ray</div>
          <p className="text-sm text-muted-foreground max-w-sm">{t("footer.tagline")}</p>
        </div>
        <div>
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-4">{t("footer.products")}</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/markets" className="hover:text-accent">{t("nav.markets")}</Link></li>
            <li><Link to="/trade/$symbol" params={{ symbol: "BTC" }} className="hover:text-accent">{t("nav.trade")}</Link></li>
            <li><Link to="/wallet" className="hover:text-accent">{t("nav.wallet")}</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-4">{t("footer.legal")}</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>Terms</li>
            <li>Privacy</li>
            <li>Risk Disclosure</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/5">
        <div className="max-w-[1600px] mx-auto px-4 py-4 text-[11px] text-muted-foreground text-center">
          {t("footer.disclaimer")}
        </div>
      </div>
    </footer>
  );
}
