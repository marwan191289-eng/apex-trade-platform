import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Lang = "en" | "ar";

const dict = {
  en: {
    "nav.markets": "Markets",
    "nav.trade": "Trade",
    "nav.wallet": "Wallet",
    "nav.futures": "Futures",
    "nav.login": "Log In",
    "nav.signup": "Sign Up",
    "nav.logout": "Log Out",
    "hero.title": "The professional gateway to digital asset markets",
    "hero.subtitle": "Trade 200+ cryptocurrencies with institutional-grade execution, real-time data, and a $10,000 virtual portfolio to practice with.",
    "hero.cta.primary": "Start Trading",
    "hero.cta.secondary": "Explore Markets",
    "hero.stat.users": "Active Traders",
    "hero.stat.volume": "24h Volume",
    "hero.stat.assets": "Listed Assets",
    "markets.title": "Markets Overview",
    "markets.subtitle": "Live prices across the world's leading digital assets",
    "markets.col.asset": "Asset",
    "markets.col.price": "Price",
    "markets.col.change": "24h Change",
    "markets.col.volume": "24h Volume",
    "markets.col.mcap": "Market Cap",
    "markets.col.chart": "Last 7d",
    "markets.col.action": "Action",
    "markets.action.trade": "Trade",
    "trade.orderbook": "Order Book",
    "trade.price": "Price",
    "trade.amount": "Amount",
    "trade.total": "Total",
    "trade.buy": "Buy",
    "trade.sell": "Sell",
    "trade.market": "Market",
    "trade.limit": "Limit",
    "trade.available": "Available",
    "trade.execute.buy": "Buy",
    "trade.execute.sell": "Sell",
    "trade.history": "Trade History",
    "trade.no_trades": "No trades yet",
    "trade.signin_to_trade": "Sign in to start trading",
    "trade.insufficient": "Insufficient balance",
    "trade.success.buy": "Buy order filled",
    "trade.success.sell": "Sell order filled",
    "wallet.title": "Portfolio",
    "wallet.total": "Total Balance",
    "wallet.available": "Available USDT",
    "wallet.invested": "Invested Value",
    "wallet.pnl": "Total P&L",
    "wallet.holdings": "Your Holdings",
    "wallet.orders": "Order History",
    "wallet.no_holdings": "No assets yet. Start trading to build your portfolio.",
    "auth.login.title": "Welcome back",
    "auth.login.subtitle": "Sign in to your TradeXray account",
    "auth.signup.title": "Create your account",
    "auth.signup.subtitle": "Get $10,000 virtual USDT to start paper trading",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.name": "Display name",
    "auth.submit.login": "Sign In",
    "auth.submit.signup": "Create Account",
    "auth.switch.tosignup": "New to TradeXray?",
    "auth.switch.tologin": "Already have an account?",
    "auth.signup_link": "Create one",
    "auth.login_link": "Sign in",
    "common.live": "LIVE",
    "common.loading": "Loading…",
    "common.search": "Search",
    "footer.tagline": "Professional digital asset exchange — paper trading edition.",
    "footer.products": "Products",
    "footer.company": "Company",
    "footer.legal": "Legal",
    "footer.disclaimer": "TradeXray is a paper-trading demo. No real funds are processed. Market data via CoinGecko.",
  },
  ar: {
    "nav.markets": "الأسواق",
    "nav.trade": "التداول",
    "nav.wallet": "المحفظة",
    "nav.futures": "العقود الآجلة",
    "nav.login": "تسجيل الدخول",
    "nav.signup": "إنشاء حساب",
    "nav.logout": "تسجيل الخروج",
    "hero.title": "البوابة الاحترافية لأسواق الأصول الرقمية",
    "hero.subtitle": "تداول أكثر من 200 عملة مشفرة بتنفيذ بمستوى مؤسسي، بيانات لحظية، ومحفظة افتراضية بقيمة 10,000 دولار للتدريب.",
    "hero.cta.primary": "ابدأ التداول",
    "hero.cta.secondary": "استكشف الأسواق",
    "hero.stat.users": "متداول نشط",
    "hero.stat.volume": "حجم 24 ساعة",
    "hero.stat.assets": "أصل مدرج",
    "markets.title": "نظرة عامة على الأسواق",
    "markets.subtitle": "أسعار حية لأبرز الأصول الرقمية في العالم",
    "markets.col.asset": "الأصل",
    "markets.col.price": "السعر",
    "markets.col.change": "تغير 24س",
    "markets.col.volume": "حجم 24س",
    "markets.col.mcap": "القيمة السوقية",
    "markets.col.chart": "آخر 7 أيام",
    "markets.col.action": "الإجراء",
    "markets.action.trade": "تداول",
    "trade.orderbook": "سجل الأوامر",
    "trade.price": "السعر",
    "trade.amount": "الكمية",
    "trade.total": "الإجمالي",
    "trade.buy": "شراء",
    "trade.sell": "بيع",
    "trade.market": "سوق",
    "trade.limit": "محدد",
    "trade.available": "المتاح",
    "trade.execute.buy": "شراء",
    "trade.execute.sell": "بيع",
    "trade.history": "سجل الصفقات",
    "trade.no_trades": "لا توجد صفقات بعد",
    "trade.signin_to_trade": "سجل دخولك لبدء التداول",
    "trade.insufficient": "رصيد غير كافٍ",
    "trade.success.buy": "تم تنفيذ أمر الشراء",
    "trade.success.sell": "تم تنفيذ أمر البيع",
    "wallet.title": "المحفظة",
    "wallet.total": "إجمالي الرصيد",
    "wallet.available": "USDT المتاح",
    "wallet.invested": "القيمة المستثمرة",
    "wallet.pnl": "إجمالي الربح/الخسارة",
    "wallet.holdings": "أصولك",
    "wallet.orders": "سجل الأوامر",
    "wallet.no_holdings": "لا توجد أصول بعد. ابدأ التداول لبناء محفظتك.",
    "auth.login.title": "أهلاً بعودتك",
    "auth.login.subtitle": "سجل دخولك إلى حساب TradeXray",
    "auth.signup.title": "أنشئ حسابك",
    "auth.signup.subtitle": "احصل على 10,000 USDT افتراضية لبدء التداول الوهمي",
    "auth.email": "البريد الإلكتروني",
    "auth.password": "كلمة المرور",
    "auth.name": "الاسم المعروض",
    "auth.submit.login": "تسجيل الدخول",
    "auth.submit.signup": "إنشاء الحساب",
    "auth.switch.tosignup": "جديد على TradeXray؟",
    "auth.switch.tologin": "لديك حساب بالفعل؟",
    "auth.signup_link": "أنشئ حساب",
    "auth.login_link": "سجل الدخول",
    "common.live": "مباشر",
    "common.loading": "جارٍ التحميل…",
    "common.search": "بحث",
    "footer.tagline": "بورصة احترافية للأصول الرقمية — إصدار التداول الوهمي.",
    "footer.products": "المنتجات",
    "footer.company": "الشركة",
    "footer.legal": "قانوني",
    "footer.disclaimer": "TradeXray منصة تداول وهمية للعرض. لا يتم معالجة أموال حقيقية. بيانات السوق من CoinGecko.",
  },
} as const;

type Key = keyof typeof dict.en;

interface I18nCtx {
  lang: Lang;
  dir: "ltr" | "rtl";
  t: (k: Key) => string;
  setLang: (l: Lang) => void;
  toggle: () => void;
}

const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === "undefined") return "en";
    return (localStorage.getItem("nexus-lang") as Lang) || "en";
  });

  const dir = lang === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    localStorage.setItem("nexus-lang", lang);
  }, [lang, dir]);

  const setLang = (l: Lang) => setLangState(l);
  const toggle = () => setLangState((l) => (l === "en" ? "ar" : "en"));
  const t = (k: Key) => dict[lang][k] ?? k;

  return <Ctx.Provider value={{ lang, dir, t, setLang, toggle }}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useI18n must be used within I18nProvider");
  return c;
}
