import { Link, useLocation, useNavigate } from "react-router";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { toast } from "sonner";
import { resolvePostAuthRedirect } from "../../lib/auth-routing";
import { AuthShell, AuthDivider, OAuthButtons, BiometricLoginButton } from "../../components/baytmiftah";
import { nativePluginsService } from "../../../lib/native-plugins.service";

export function Login() {
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
  const { signIn, signInWithOAuth, user, profile } = useAuth();

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
  const redirectTo = resolvePostAuthRedirect(
    user,
    profile,
    stateRedirectTo || queryRedirectTo
  );

  useEffect(() => {
    if (localStorage.getItem("bm_remember_me") === "true") {
      const savedEmail = localStorage.getItem("bm_saved_email");
      if (savedEmail) setEmail(savedEmail);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    const destination = resolvePostAuthRedirect(
      user,
      profile,
      stateRedirectTo || queryRedirectTo
    );
    navigate(destination, { replace: true });
  }, [navigate, user, profile, stateRedirectTo, queryRedirectTo]);

  const oauthRedirectUrl = useMemo(() => {
    const next = encodeURIComponent(redirectTo);
    return `${window.location.origin}/login?next=${next}`;
  }, [redirectTo]);

  const handleBiometricSuccess = async (creds: { username: string; password: string }) => {
    try {
      setLoading(true);
      await signIn(creds.username, creds.password);
      toast.success("Authentication confirmed");
      navigate(redirectTo, { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Biometric authentication failed");
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
      toast.success("Welcome back");
      navigate(redirectTo, { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: "google" | "apple") => {
    try {
      setOauthLoadingProvider(provider);
      await signInWithOAuth(provider, oauthRedirectUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Social authentication failed");
      setOauthLoadingProvider(null);
    }
  };

  return (
    <AuthShell
      title="Sign in to your account"
      subtitle="Access your private portal, portfolio metrics, or resident services."
      footer={
        <p className="text-white/80 lg:text-muted-foreground text-xs">
          Don&apos;t have an account yet?{" "}
          <Link
            to="/signup"
            className="font-semibold text-white lg:text-foreground underline underline-offset-4 hover:text-white/80 lg:hover:text-neutral-600 transition-colors"
          >
            Create an account
          </Link>
        </p>
      }
    >
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
          <label className="block text-xs font-medium text-white/90 lg:text-muted-foreground">
            Email address
          </label>
          <Input
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
            <label className="block text-xs font-medium text-white/90 lg:text-muted-foreground">
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
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 lg:text-muted-foreground hover:text-white lg:hover:text-foreground transition-colors p-1"
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
  );
}
