import { Link, useLocation, useNavigate } from "react-router";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { toast } from "sonner";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoadingProvider, setOauthLoadingProvider] = useState<
    "google" | "facebook" | "apple" | null
  >(null);
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

  const handleOAuthSignIn = async (provider: "google" | "facebook" | "apple") => {
    try {
      setOauthLoadingProvider(provider);
      await signInWithOAuth(provider, oauthRedirectUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Social sign-in failed");
      setOauthLoadingProvider(null);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-6">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
            </Link>
            <h1 className="text-3xl font-semibold mb-2">Welcome Back</h1>
            <p className="text-muted-foreground">Log in to access your Property Hub account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Input
                label="Email Address"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <Input
                label="Password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="flex gap-3 rounded-xl border border-border bg-secondary/20 p-4 text-sm text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
              <p>
                One-time codes are only used for two-step verification after your primary sign-in.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-border text-primary" />
                <span className="text-sm text-muted-foreground">Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Logging in...
                </>
              ) : (
                "Log In"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/signup" className="text-primary hover:underline font-semibold">
                Sign up
              </Link>
            </p>
          </div>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-background text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Button
                variant="outline"
                size="lg"
                type="button"
                onClick={() => void handleOAuthSignIn("google")}
                disabled={Boolean(oauthLoadingProvider)}
              >
                {oauthLoadingProvider === "google" ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                )}
                Google
              </Button>
              <Button
                variant="outline"
                size="lg"
                type="button"
                onClick={() => void handleOAuthSignIn("apple")}
                disabled={Boolean(oauthLoadingProvider)}
              >
                {oauthLoadingProvider === "apple" ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M19.665 16.149c-.277.637-.607 1.223-.99 1.756-.521.74-.949 1.251-1.286 1.533-.521.466-1.08.704-1.68.715-.43 0-.949-.124-1.556-.373-.608-.249-1.166-.373-1.674-.373-.532 0-1.102.124-1.709.373-.608.249-1.099.38-1.475.394-.576.024-1.149-.221-1.72-.736-.364-.315-.811-.845-1.34-1.59-.567-.792-1.034-1.711-1.402-2.76-.394-1.134-.591-2.231-.591-3.294 0-1.218.263-2.269.789-3.151.413-.707.964-1.265 1.652-1.674.688-.409 1.431-.618 2.228-.629.438 0 1.012.135 1.724.405.712.27 1.168.405 1.369.405.15 0 .659-.159 1.525-.478.819-.296 1.51-.419 2.072-.373 1.523.123 2.667.724 3.431 1.802-1.362.825-2.037 1.983-2.026 3.473.013 1.161.434 2.128 1.265 2.899.376.357.797.633 1.265.83-.102.295-.21.58-.326.855Zm-4.57-13.298c0 .91-.332 1.76-.994 2.549-.799.938-1.767 1.48-2.816 1.395a2.831 2.831 0 0 1-.021-.346c0-.874.38-1.81 1.056-2.577.337-.388.765-.71 1.283-.969.518-.255 1.008-.397 1.468-.427.017.124.024.249.024.375Z" />
                  </svg>
                )}
                Apple
              </Button>
              <Button
                variant="outline"
                size="lg"
                type="button"
                onClick={() => void handleOAuthSignIn("facebook")}
                disabled={Boolean(oauthLoadingProvider)}
              >
                {oauthLoadingProvider === "facebook" ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                )}
                Facebook
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Image */}
      <div className="hidden lg:block flex-1 relative">
        <img
          src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&q=80"
          alt="Modern apartment"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-primary/40 flex items-end p-12">
          <div className="text-white">
            <h2 className="text-4xl font-semibold mb-4">Find Your Dream Home in Ghana</h2>
            <p className="text-xl text-white/90">
              Join thousands of users discovering quality properties across Accra and beyond
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
