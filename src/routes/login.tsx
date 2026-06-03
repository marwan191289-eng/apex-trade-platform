import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { SocialAuthButtons } from "@/components/SocialAuthButtons";


export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign In — TradeXray" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (user) nav({ to: "/wallet" }); }, [user, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back");
    nav({ to: "/wallet" });
  };

  return (
    <div className="min-h-screen bg-bg-main flex items-center justify-center px-4 gradient-hero">
      <div className="w-full max-w-md">
        <Link to="/" className="block text-center text-accent font-bold text-3xl tracking-tighter mb-8">NEXUS</Link>
        <div className="bg-bg-card border border-white/5 rounded-xl p-8">
          <h1 className="text-2xl font-bold mb-1">{t("auth.login.title")}</h1>
          <p className="text-sm text-muted-foreground mb-6">{t("auth.login.subtitle")}</p>
          <SocialAuthButtons />
          <div className="flex items-center gap-3 my-5">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">or email</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>
          <form onSubmit={submit} className="space-y-4" dir="ltr">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1.5">{t("auth.email")}</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-bg-main border border-white/10 rounded p-3 text-sm focus:border-accent outline-none" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1.5">{t("auth.password")}</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-bg-main border border-white/10 rounded p-3 text-sm focus:border-accent outline-none" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-accent text-bg-main py-3 rounded font-bold text-sm hover:brightness-110 transition-all disabled:opacity-50">
              {loading ? t("common.loading") : t("auth.submit.login")}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {t("auth.switch.tosignup")} <Link to="/signup" className="text-accent font-semibold hover:underline">{t("auth.signup_link")}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
