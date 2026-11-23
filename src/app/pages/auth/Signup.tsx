import { Link, useNavigate } from "react-router";
import { Loader2, Eye, EyeOff, Check } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { toast } from "sonner";
import { AuthShell, AuthDivider, OAuthButtons, PageMeta } from "../../components/baytmiftah";
import { LegalAcceptanceCheckbox } from "../../components/legal/LegalAcceptanceCheckbox";
import { ACCEPTANCE_SCOPES, LEGAL_POLICY_VERSION, LEGAL_VERSION_KEY } from "../../../lib/legal-config";
import { legalAcceptanceService } from "../../../lib/legal-acceptance.service";
import { validatePassword } from "../../../lib/security/password-policy";
import { supabase } from "../../../lib/supabase";

export function Signup() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [oauthLoadingProvider, setOauthLoadingProvider] = useState<"google" | "apple" | null>(
    null
  );
  const navigate = useNavigate();
  const { signUp, signInWithOAuth, user } = useAuth();

  // Account creation is always for a consumer. Workspace status is granted only
  // through the separately reviewed identity/KYC and enrollment process.
  const oauthRedirectUrl = `${window.location.origin}/login?next=${encodeURIComponent("/app")}`;
  const legalScope = "signup_consumer" as const;

  useEffect(() => {
    if (user) {
      setOauthLoadingProvider(null);
    }
  }, [user]);

  const passwordCriteria = useMemo(() => {
    const p = formData.password;
    return {
      minLength: p.length >= 8,
      hasUpper: /[A-Z]/.test(p),
      hasNumber: /\d/.test(p),
      hasSpecial: /[^A-Za-z0-9]/.test(p),
    };
  }, [formData.password]);

  const handleOAuthSignIn = async (provider: "google" | "apple") => {
    try {
      setOauthLoadingProvider(provider);
      await signInWithOAuth(provider, oauthRedirectUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Social sign-in failed");
      setOauthLoadingProvider(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    const passwordCheck = validatePassword(formData.password);
    if (!passwordCheck.valid) {
      toast.error(passwordCheck.errors[0] || "Password does not meet requirements");
      return;
    }

    if (!termsAccepted) {
      toast.error("Please accept the terms and conditions");
      return;
    }

    try {
      setLoading(true);
      const policySlugs = ACCEPTANCE_SCOPES[legalScope].policySlugs;
      const { user } = await signUp(
        formData.email,
        formData.password,
        formData.fullName,
      );
      if (user?.id) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session?.user.id === user.id) {
          await legalAcceptanceService.recordAcceptance({
            userId: user.id,
            scope: legalScope,
            policySlugs,
            policyVersion: LEGAL_POLICY_VERSION,
          });
          localStorage.setItem(LEGAL_VERSION_KEY, LEGAL_POLICY_VERSION);
        }
      }
      toast.success("Account created successfully. Check your email to verify.");
      navigate("/login", { state: { from: "/app" } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <PageMeta title="Create your account" canonicalPath="/signup" />
    <AuthShell
      title="Create your account"
      subtitle="Join the modern real estate operating system."
      footer={
        <p className="text-white/80 lg:text-muted-foreground text-xs">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-semibold text-white lg:text-foreground underline underline-offset-4 hover:text-white/80 lg:hover:text-neutral-600 transition-colors"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <OAuthButtons
        onGoogle={() => void handleOAuthSignIn("google")}
        onApple={() => void handleOAuthSignIn("apple")}
        loadingProvider={oauthLoadingProvider}
        disabled={loading}
      />

      <AuthDivider label="Or register with email" />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="signup-full-name" className="block text-xs font-medium text-white/90 lg:text-muted-foreground">
            Full name
          </label>
          <Input
            id="signup-full-name"
            type="text"
            placeholder="Kwame Mensah"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            required
            autoComplete="name"
            className="h-10 text-sm bg-white/10 lg:bg-background border-white/20 lg:border-border/80 text-white lg:text-foreground placeholder:text-white/40 lg:placeholder:text-muted-foreground focus:border-white lg:focus:border-foreground"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="signup-email" className="block text-xs font-medium text-white/90 lg:text-muted-foreground">
            Email address
          </label>
          <Input
            id="signup-email"
            type="email"
            placeholder="name@domain.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            autoComplete="email"
            className="h-10 text-sm bg-white/10 lg:bg-background border-white/20 lg:border-border/80 text-white lg:text-foreground placeholder:text-white/40 lg:placeholder:text-muted-foreground focus:border-white lg:focus:border-foreground"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="signup-password" className="block text-xs font-medium text-white/90 lg:text-muted-foreground">
            Password
          </label>
          <div className="relative">
            <Input
              id="signup-password"
              type={showPassword ? "text" : "password"}
              placeholder="Minimum 8 characters"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              autoComplete="new-password"
              className="h-10 text-sm pr-10 bg-white/10 lg:bg-background border-white/20 lg:border-border/80 text-white lg:text-foreground placeholder:text-white/40 lg:placeholder:text-muted-foreground focus:border-white lg:focus:border-foreground"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 lg:text-muted-foreground hover:text-white lg:hover:text-foreground transition-colors p-1"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Minimalist Password Indicators */}
          {formData.password.length > 0 && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1.5 text-[11px] text-white/70 lg:text-muted-foreground font-mono">
              <span className={`inline-flex items-center gap-1 ${passwordCriteria.minLength ? "text-emerald-400 lg:text-emerald-600 dark:lg:text-emerald-400 font-sans" : ""}`}>
                {passwordCriteria.minLength && <Check className="w-3 h-3" />} 8+ chars
              </span>
              <span className={`inline-flex items-center gap-1 ${passwordCriteria.hasUpper ? "text-emerald-400 lg:text-emerald-600 dark:lg:text-emerald-400 font-sans" : ""}`}>
                {passwordCriteria.hasUpper && <Check className="w-3 h-3" />} uppercase
              </span>
              <span className={`inline-flex items-center gap-1 ${passwordCriteria.hasNumber ? "text-emerald-400 lg:text-emerald-600 dark:lg:text-emerald-400 font-sans" : ""}`}>
                {passwordCriteria.hasNumber && <Check className="w-3 h-3" />} number
              </span>
              <span className={`inline-flex items-center gap-1 ${passwordCriteria.hasSpecial ? "text-emerald-400 lg:text-emerald-600 dark:lg:text-emerald-400 font-sans" : ""}`}>
                {passwordCriteria.hasSpecial && <Check className="w-3 h-3" />} symbol
              </span>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="signup-confirm-password" className="block text-xs font-medium text-white/90 lg:text-muted-foreground">
            Confirm password
          </label>
          <div className="relative">
            <Input
              id="signup-confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Re-enter password"
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData({ ...formData, confirmPassword: e.target.value })
              }
              required
              autoComplete="new-password"
              className="h-10 text-sm pr-10 bg-white/10 lg:bg-background border-white/20 lg:border-border/80 text-white lg:text-foreground placeholder:text-white/40 lg:placeholder:text-muted-foreground focus:border-white lg:focus:border-foreground"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 lg:text-muted-foreground hover:text-white lg:hover:text-foreground transition-colors p-1"
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {showConfirmPassword ? (
                <EyeOff className="w-3.5 h-3.5" />
              ) : (
                <Eye className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          {formData.confirmPassword.length > 0 && (
            <p role="status" className={`text-xs ${formData.password === formData.confirmPassword ? "text-emerald-400 lg:text-emerald-700" : "text-amber-200 lg:text-amber-700"}`}>
              {formData.password === formData.confirmPassword ? "Passwords match" : "Passwords do not match yet"}
            </p>
          )}
        </div>

        <div className="pt-1 text-white/90 lg:text-foreground">
          <LegalAcceptanceCheckbox
            scope={legalScope}
            checked={termsAccepted}
            onChange={setTermsAccepted}
          />
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full h-11 text-sm font-semibold bg-white text-neutral-950 hover:bg-neutral-100 lg:bg-neutral-900 lg:text-white lg:hover:bg-neutral-800 lg:dark:bg-white lg:dark:text-neutral-900 lg:dark:hover:bg-neutral-100 rounded-xl transition-all shadow-md"
          disabled={loading || !termsAccepted || Boolean(oauthLoadingProvider)}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating account...
            </>
          ) : (
            "Create Account"
          )}
        </Button>
      </form>
    </AuthShell>
    </>
  );
}
