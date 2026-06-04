import { Link, useLocation, useNavigate } from "react-router";
import { Eye, EyeOff, Loader2, MapPin } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { toast } from "sonner";
import { buildPublicAppUrl, resolveInternalRedirectPath } from "../../../lib/app-url";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoadingProvider, setOauthLoadingProvider] = useState<
    "google" | "apple" | null
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
    return resolveInternalRedirectPath(next, "");
  }, [location.search]);
  const redirectTo = resolveInternalRedirectPath(stateRedirectTo || queryRedirectTo, "/app");

  useEffect(() => {
    if (!user) return;
    navigate(redirectTo, { replace: true });
  }, [navigate, redirectTo, user]);

  const oauthRedirectUrl = useMemo(() => {
    const next = encodeURIComponent(redirectTo);
    return buildPublicAppUrl(`/login?next=${next}`);
  }, [redirectTo]);
  const googleOAuthRedirectUrl = useMemo(() => {
    return buildPublicAppUrl("/login?next=%2F");
  }, []);

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
      await signInWithOAuth(
        provider,
        provider === "google" ? googleOAuthRedirectUrl : oauthRedirectUrl
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Social sign-in failed");
      setOauthLoadingProvider(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#061725] px-5 py-10 text-[#f7f4ed] sm:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-[650px] items-center justify-center">
        <section className="w-full rounded-[28px] border border-[#e8bd31]/10 bg-[#0d2032] px-7 py-10 shadow-[0_34px_90px_rgba(0,0,0,0.26)] sm:px-14 sm:py-16">
          <Link to="/" className="mb-8 inline-flex items-center gap-5 text-[#dce9ff] no-underline">
            <MapPin className="h-12 w-12 text-[#e8bd31]" strokeWidth={2.4} />
            <span className="text-4xl font-black tracking-[-0.08em] sm:text-5xl">BaytMiftah</span>
          </Link>

          <p className="mb-20 max-w-[23rem] text-3xl font-medium leading-[1.22] tracking-[-0.04em] text-[#c7cbd5]">
            Sign in to access your curated portfolio.
          </p>

          <form onSubmit={handleSubmit} className="space-y-9">
            <div className="space-y-4">
              <label
                htmlFor="login-email"
                className="block text-lg font-black uppercase tracking-[-0.05em] text-[#c7cbd5]"
              >
                Email Address
              </label>
              <input
                id="login-email"
                type="email"
                placeholder="name@exclusive.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="h-24 w-full rounded-2xl border border-[#f7f4ed]/10 bg-[#0b1d2e] px-7 text-2xl font-semibold text-[#f7f4ed] outline-none transition placeholder:text-[#7f8997] focus:border-[#e8bd31]/70 focus:ring-4 focus:ring-[#e8bd31]/10"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="login-password"
                  className="block text-lg font-black uppercase tracking-[-0.05em] text-[#c7cbd5]"
                >
                  Password
                </label>
                <Link to="/forgot-password" className="text-lg font-black text-[#e8bd31] no-underline">
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="•••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  className="h-24 w-full rounded-2xl border border-[#f7f4ed]/10 bg-[#0b1d2e] px-7 pr-20 text-2xl font-semibold text-[#f7f4ed] outline-none transition placeholder:text-[#7f8997] focus:border-[#e8bd31]/70 focus:ring-4 focus:ring-[#e8bd31]/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-6 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full text-[#c7cbd5] transition hover:text-[#e8bd31] focus:outline-none focus:ring-2 focus:ring-[#e8bd31]"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-7 w-7" /> : <Eye className="h-7 w-7" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex h-24 w-full items-center justify-center rounded-2xl bg-[#e8bd31] text-2xl font-black text-[#231b04] shadow-[0_22px_44px_rgba(232,189,49,0.22)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                  Signing In...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <div className="my-16 flex items-center gap-7">
            <span className="h-px flex-1 bg-[#f7f4ed]/10" />
            <p className="m-0 text-lg font-black uppercase tracking-[0.08em] text-[#c7cbd5]">Or continue with</p>
            <span className="h-px flex-1 bg-[#f7f4ed]/10" />
          </div>

          <div className="grid grid-cols-2 gap-7">
            <button
              type="button"
              onClick={() => void handleOAuthSignIn("google")}
              disabled={Boolean(oauthLoadingProvider)}
              className="flex h-24 items-center justify-center gap-5 rounded-2xl border border-[#f7f4ed]/10 bg-[#0b1d2e] text-xl font-black text-[#dce9ff] transition hover:border-[#e8bd31]/50 disabled:opacity-70"
            >
              {oauthLoadingProvider === "google" ? (
                <Loader2 className="h-7 w-7 animate-spin" />
              ) : (
                <svg className="h-9 w-9" viewBox="0 0 24 24" aria-hidden="true">
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
            </button>
            <button
              type="button"
              onClick={() => void handleOAuthSignIn("apple")}
              disabled={Boolean(oauthLoadingProvider)}
              className="flex h-24 items-center justify-center gap-5 rounded-2xl border border-[#f7f4ed]/10 bg-[#0b1d2e] text-xl font-black text-[#dce9ff] transition hover:border-[#e8bd31]/50 disabled:opacity-70"
            >
              {oauthLoadingProvider === "apple" ? (
                <Loader2 className="h-7 w-7 animate-spin" />
              ) : (
                <svg className="h-9 w-9" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M19.665 16.149c-.277.637-.607 1.223-.99 1.756-.521.74-.949 1.251-1.286 1.533-.521.466-1.08.704-1.68.715-.43 0-.949-.124-1.556-.373-.608-.249-1.166-.373-1.674-.373-.532 0-1.102.124-1.709.373-.608.249-1.099.38-1.475.394-.576.024-1.149-.221-1.72-.736-.364-.315-.811-.845-1.34-1.59-.567-.792-1.034-1.711-1.402-2.76-.394-1.134-.591-2.231-.591-3.294 0-1.218.263-2.269.789-3.151.413-.707.964-1.265 1.652-1.674.688-.409 1.431-.618 2.228-.629.438 0 1.012.135 1.724.405.712.27 1.168.405 1.369.405.15 0 .659-.159 1.525-.478.819-.296 1.51-.419 2.072-.373 1.523.123 2.667.724 3.431 1.802-1.362.825-2.037 1.983-2.026 3.473.013 1.161.434 2.128 1.265 2.899.376.357.797.633 1.265.83-.102.295-.21.58-.326.855Zm-4.57-13.298c0 .91-.332 1.76-.994 2.549-.799.938-1.767 1.48-2.816 1.395a2.831 2.831 0 0 1-.021-.346c0-.874.38-1.81 1.056-2.577.337-.388.765-.71 1.283-.969.518-.255 1.008-.397 1.468-.427.017.124.024.249.024.375Z" />
                </svg>
              )}
              Apple
            </button>
          </div>

          <p className="mx-auto mt-20 max-w-[27rem] text-center text-2xl font-medium leading-snug tracking-[-0.04em] text-[#c7cbd5]">
            Don't have an account?{" "}
            <Link to="/signup" className="font-black text-[#e8bd31] no-underline">
              Apply for Membership
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
