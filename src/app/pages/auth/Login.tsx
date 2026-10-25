import { Link, useLocation, useNavigate } from "react-router";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { toast } from "sonner";
import { resolvePostAuthRedirect } from "../../lib/auth-routing";
import { AuthShell, AuthDivider, OAuthButtons, BiometricLoginButton, PageMeta } from "../../components/baytmiftah";
import { AppLoadingScreen } from "../../components/ux/AppLoadingScreen";
import { useTranslation } from "../../i18n/LocaleContext";
import { nativePluginsService } from "../../../lib/native-plugins.service";
import { isDesktopWorkspaceApp } from "../../../lib/desktop-app";
import { getDesktopOAuthRedirectUrl } from "../../../lib/desktop-oauth";

export function Login() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(
    () => localStorage.getItem("bm_remember_me") === "true"
  );
  const [loading, setLoading] = useState(false);
  const [oauthLoadingProvider, setOauthLoadingProvider] = useState<"google" | "apple" | null>(
    null
  );
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signInWithOAuth, user, profile, hasWorkspaceMembership, loading: authLoading } = useAuth();

  const stateRedirectTo =
    typeof location.state === "object" &&
    location.state !== null &&
    "from" in location.state &&
    typeof location.state.from === "string"
      ? location.state.from
      : null;
  const queryRedirectTo = useMemo(() => {
    const next = new URLSearchParams(location.search).get("next");
    return next || null;
  }, [location.search]);
  const businessOnly = useMemo(
    () => new URLSearchParams(location.search).get("reason") === "business-only",
    [location.search],
  );
  const isDesktopLogin = isDesktopWorkspaceApp();
  const postAuthDestination = useMemo(
    () =>
      user
        ? resolvePostAuthRedirect(user, profile, stateRedirectTo || queryRedirectTo, {
            hasOrgMembership: hasWorkspaceMembership,
          })
        : null,
    [user, profile, hasWorkspaceMembership, stateRedirectTo, queryRedirectTo],
  );
  const isConsumerBlockedOnDesktop = Boolean(
    isDesktopLogin &&
      user &&
      postAuthDestination?.startsWith("/login"),
  );
  const currentPath = `${location.pathname}${location.search}`;
  const requestedDestination = stateRedirectTo || queryRedirectTo;
  const redirectTo =
    postAuthDestination ??
    requestedDestination ??
    (isDesktopLogin ? "/workspace" : "/app");

  useEffect(() => {
    if (!user || !postAuthDestination || isConsumerBlockedOnDesktop) return;
    if (postAuthDestination === currentPath) return;
    navigate(postAuthDestination, { replace: true });
  }, [
    navigate,
    user,
    postAuthDestination,
    isConsumerBlockedOnDesktop,
    currentPath,
  ]);

  const oauthRedirectUrl = useMemo(() => {
    if (isDesktopLogin) {
      return getDesktopOAuthRedirectUrl();
    }
    const next = encodeURIComponent(redirectTo);
    return `${window.location.origin}/login?next=${next}`;
  }, [redirectTo, isDesktopLogin]);

  useEffect(() => {
    if (localStorage.getItem("bm_remember_me") === "true") {
      const savedEmail = localStorage.getItem("bm_saved_email");
      if (savedEmail) setEmail(savedEmail);
    }
  }, []);

  useEffect(() => {
    if (user) {
      setOauthLoadingProvider(null);
    }
  }, [user]);

  if (authLoading) {
    return <AppLoadingScreen label={t("auth.redirecting")} />;
  }

  if (
    user &&
    postAuthDestination &&
    !isConsumerBlockedOnDesktop &&
    postAuthDestination !== currentPath
  ) {
    return <AppLoadingScreen label={t("auth.redirecting")} />;
  }

  const handleBiometricSuccess = async (creds: { username: string; password: string }) => {
    try {
      setLoading(true);
      await signIn(creds.username, creds.password);
      toast.success(t("auth.biometricConfirmed"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("auth.biometricFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await signIn(email, password);
      if (rememberMe) {
        localStorage.setItem("bm_remember_me", "true");
        localStorage.setItem("bm_saved_email", email);
      } else {
        localStorage.removeItem("bm_remember_me");
        localStorage.removeItem("bm_saved_email");
      }
      if (nativePluginsService.isNativePlatform()) {
        void nativePluginsService.saveBiometricCredentials({ username: email, password });
      }
      toast.success(t("auth.welcomeBack"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("auth.invalidCredentials"));
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: "google" | "apple") => {
    try {
      setOauthLoadingProvider(provider);
      await signInWithOAuth(provider, oauthRedirectUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("auth.oauthFailed"));
      setOauthLoadingProvider(null);
    }
  };

  return (
    <>
    <PageMeta title={t("auth.signInTitle")} canonicalPath="/login" />
    <AuthShell
      title={t("auth.signInTitle")}
      subtitle={
        isDesktopLogin
          ? "Sign in with your business workspace account."
          : t("auth.signInSubtitleConsumer")
      }
      footer={
        <p className="text-white/80 lg:text-muted-foreground text-xs">
          {t("auth.noAccount")}{" "}
          <Link
            to="/signup"
            className="font-semibold text-white lg:text-foreground underline underline-offset-4 hover:text-white/80 lg:hover:text-neutral-600 transition-colors"
          >
            {t("auth.createAccount")}
          </Link>
        </p>
      }
    >
      {businessOnly ? (
        <div className="mb-4 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 lg:text-amber-900">
          BaytMiftah Workspace is for property managers, agents, and landlords.
          Consumer accounts should use the website or mobile app instead.
        </div>
      ) : null}
      <BiometricLoginButton
        onBiometricSuccess={handleBiometricSuccess}
        onBiometricFailed={(err) => toast.error(err)}
      />

      <OAuthButtons
        onGoogle={() => void handleOAuthSignIn("google")}
        onApple={() => void handleOAuthSignIn("apple")}
        loadingProvider={oauthLoadingProvider}
        disabled={loading}
      />

      <AuthDivider label="Or sign in with email" />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="login-email" className="block text-xs font-medium text-white/90 lg:text-muted-foreground">
            Email address
          </label>
          <Input
            id="login-email"
            type="email"
            placeholder="name@domain.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="h-10 text-sm bg-white/10 lg:bg-background border-white/20 lg:border-border/80 text-white lg:text-foreground placeholder:text-white/40 lg:placeholder:text-muted-foreground focus:border-white lg:focus:border-foreground"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="login-password" className="block text-xs font-medium text-white/90 lg:text-muted-foreground">
              Password
            </label>
            <Link
              to="/forgot-password"
              className="text-xs text-white/80 lg:text-muted-foreground hover:text-white lg:hover:text-foreground transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="login-password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="h-10 text-sm pr-10 bg-white/10 lg:bg-background border-white/20 lg:border-border/80 text-white lg:text-foreground placeholder:text-white/40 lg:placeholder:text-muted-foreground focus:border-white lg:focus:border-foreground"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-1 top-1/2 flex min-h-11 min-w-11 items-center justify-center -translate-y-1/2 text-white/70 lg:text-muted-foreground hover:text-white lg:hover:text-foreground transition-colors p-1"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="w-3.5 h-3.5" />
              ) : (
                <Eye className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 rounded border-white/30 lg:border-border text-foreground accent-foreground"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
            />
            <span className="text-xs text-white/80 lg:text-muted-foreground select-none">
              Keep me signed in
            </span>
          </label>
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full h-11 text-sm font-semibold bg-white text-neutral-950 hover:bg-neutral-100 lg:bg-neutral-900 lg:text-white lg:hover:bg-neutral-800 lg:dark:bg-white lg:dark:text-neutral-900 lg:dark:hover:bg-neutral-100 rounded-xl transition-all shadow-md"
          disabled={loading || Boolean(oauthLoadingProvider)}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Authenticating...
            </>
          ) : (
            "Continue"
          )}
        </Button>
      </form>
    </AuthShell>
    </>
  );
}
