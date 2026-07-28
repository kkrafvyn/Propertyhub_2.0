import { Link, useLocation, useNavigate } from "react-router";
import { Loader2 } from "lucide-react";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { toast } from "sonner";
import { AuthShell, AuthDivider, OAuthButtons } from "../../components/baytmiftah";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoadingProvider, setOauthLoadingProvider] = useState<"google" | "apple" | null>(
    null
  );
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signInWithOAuth, user } = useAuth();

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
  const redirectTo = stateRedirectTo || queryRedirectTo || "/app";

  useEffect(() => {
    if (!user) return;
    navigate(redirectTo, { replace: true });
  }, [navigate, redirectTo, user]);

  const oauthRedirectUrl = useMemo(() => {
    const next = encodeURIComponent(redirectTo);
    return `${window.location.origin}/login?next=${next}`;
  }, [redirectTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await signIn(email, password);
      toast.success("Logged in successfully!");
      navigate(redirectTo, { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: "google" | "apple") => {
    try {
      setOauthLoadingProvider(provider);
      await signInWithOAuth(provider, oauthRedirectUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Social sign-in failed");
      setOauthLoadingProvider(null);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to your BaytMiftah account"
      heroTitle="Your property journey continues here"
      heroSubtitle="Rent, buy, lease, or book short stays — one account for every journey"
      footer={
        <p className="text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link to="/signup" className="font-semibold text-primary hover:underline">
            Sign up
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

      <AuthDivider label="Or log in with email" />

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Email Address"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />

        <Input
          label="Password"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />

        <div className="flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" className="h-4 w-4 rounded border-border text-primary" />
            <span className="text-sm text-muted-foreground">Remember me</span>
          </label>
          <Link to="/forgot-password" className="text-sm text-primary hover:underline">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={loading || Boolean(oauthLoadingProvider)}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Logging in...
            </>
          ) : (
            "Log In"
          )}
        </Button>
      </form>
    </AuthShell>
  );
}
