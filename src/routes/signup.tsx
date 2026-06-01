import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Create Account — Nexus" }] }),
  component: SignupPage,
});

function SignupPage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (user) nav({ to: "/wallet" }); }, [user, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const redirect = typeof window !== "undefined" ? `${window.location.origin}/wallet` : undefined;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirect, data: { display_name: name, preferred_language: lang } },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account created — check your email to confirm.");
  };

  return (
    <div className="min-h-screen bg-bg-main flex items-center justify-center px-4 py-12 gradient-hero">
      <div className="w-full max-w-md">
        <Link to="/" className="block text-center text-accent font-bold text-3xl tracking-tighter mb-8">NEXUS</Link>
        <div className="bg-bg-card border border-white/5 rounded-xl p-8">
          <h1 className="text-2xl font-bold mb-1">{t("auth.signup.title")}</h1>
          <p className="text-sm text-muted-foreground mb-6">{t("auth.signup.subtitle")}</p>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1.5">{t("auth.name")}</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
                className="w-full bg-bg-main border border-white/10 rounded p-3 text-sm focus:border-accent outline-none" />
            </div>
            <div dir="ltr">
              <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1.5">{t("auth.email")}</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-bg-main border border-white/10 rounded p-3 text-sm focus:border-accent outline-none" />
            </div>
            <div dir="ltr">
              <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1.5">{t("auth.password")}</label>
              <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-bg-main border border-white/10 rounded p-3 text-sm focus:border-accent outline-none" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-accent text-bg-main py-3 rounded font-bold text-sm hover:brightness-110 transition-all disabled:opacity-50">
              {loading ? t("common.loading") : t("auth.submit.signup")}
            </button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-6">
            {t("auth.switch.tologin")} <Link to="/login" className="text-accent font-semibold hover:underline">{t("auth.login_link")}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
