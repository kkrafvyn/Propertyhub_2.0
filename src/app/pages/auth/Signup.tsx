import { Link, useNavigate } from "react-router";
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, MapPin, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { toast } from "sonner";
import { buildPublicAppUrl } from "../../../lib/app-url";

export function Signup() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    accountType: "user",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoadingProvider, setOauthLoadingProvider] = useState<"google" | "apple" | null>(null);
  const navigate = useNavigate();
  const { signUp, signInWithOAuth } = useAuth();
  const redirectTo = formData.accountType === "landlord" ? "/workspace?next=new" : "/app";
  const oauthRedirectUrl = useMemo(() => {
    const next = encodeURIComponent(redirectTo);
    return buildPublicAppUrl(`/login?next=${next}`);
  }, [redirectTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    try {
      setLoading(true);
      await signUp(formData.email, formData.password, formData.fullName);
      toast.success("Account created! Please check your email to verify.");
      navigate("/login", {
        state: {
          from: redirectTo,
        },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignUp = async (provider: "google" | "apple") => {
    try {
      setOauthLoadingProvider(provider);
      await signInWithOAuth(provider, oauthRedirectUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `${provider === "google" ? "Google" : "Apple"} sign-up failed`);
      setOauthLoadingProvider(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#061725] px-6 py-10 text-[#eaf2ff] sm:px-10 sm:py-14">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-[720px] items-center">
        <div className="w-full">
          <Link
            to="/"
            className="mb-2 inline-flex items-center gap-3 text-[32px] font-black tracking-[-0.05em] text-[#dce9ff] drop-shadow-[0_2px_0_rgba(255,255,255,0.08)]"
          >
            <MapPin className="h-11 w-11 text-[#f2c84b]" strokeWidth={3.2} />
            <span>BaytMiftah</span>
          </Link>

          <h1 className="-mt-5 text-[52px] font-black leading-[0.9] tracking-[-0.065em] text-[#dce9ff] sm:text-[68px]">
            Create your account
          </h1>
          <p className="mt-7 text-[28px] leading-snug tracking-[-0.03em] text-[#c4c9d3] sm:text-[34px]">
            Join the inner circle of global real estate.
          </p>

          <form onSubmit={handleSubmit} className="mt-20 space-y-10">
            <div>
              <label htmlFor="fullName" className="block text-[22px] font-black uppercase tracking-[0.08em] text-[#dce4f2]">
                Full Name
              </label>
              <div className="mt-5 flex h-[102px] items-center gap-7 rounded-[14px] bg-[#122538] px-8 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]">
                <UserRound className="h-7 w-7 text-[#cbd2de]" strokeWidth={2.4} />
                <input
                  id="fullName"
                  type="text"
                  placeholder="Julian Sterling"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  required
                  className="h-full min-w-0 flex-1 bg-transparent text-[31px] tracking-[-0.04em] text-[#eaf2ff] outline-none placeholder:text-[#697381]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="signupEmail" className="block text-[22px] font-black uppercase tracking-[0.08em] text-[#dce4f2]">
                Email Address
              </label>
              <div className="mt-5 flex h-[102px] items-center gap-7 rounded-[14px] bg-[#122538] px-8 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]">
                <Mail className="h-7 w-7 text-[#cbd2de]" strokeWidth={2.4} />
                <input
                  id="signupEmail"
                  type="email"
                  placeholder="julian@baytmiftah.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="h-full min-w-0 flex-1 bg-transparent text-[31px] tracking-[-0.04em] text-[#eaf2ff] outline-none placeholder:text-[#697381]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="signupPassword" className="block text-[22px] font-black uppercase tracking-[0.08em] text-[#dce4f2]">
                Security Password
              </label>
              <div className="mt-5 flex h-[102px] items-center gap-7 rounded-[14px] bg-[#122538] px-8 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]">
                <Lock className="h-7 w-7 text-[#cbd2de]" strokeWidth={2.4} />
                <input
                  id="signupPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  className="h-full min-w-0 flex-1 bg-transparent text-[31px] tracking-[0.22em] text-[#eaf2ff] outline-none placeholder:text-[#697381]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="rounded-full p-2 text-[#cbd2de] transition hover:text-[#f2c84b] focus:outline-none focus:ring-2 focus:ring-[#f2c84b]"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-9 w-9" /> : <Eye className="h-9 w-9" />}
                </button>
              </div>
            </div>

            <label className="flex items-start gap-6 text-[25px] leading-snug tracking-[-0.04em] text-[#c9ced8]">
              <input
                type="checkbox"
                required
                className="mt-1 h-9 w-9 shrink-0 appearance-none rounded-[7px] border-2 border-[#87909d] bg-transparent checked:border-[#f2c84b] checked:bg-[#f2c84b] focus:outline-none focus:ring-2 focus:ring-[#f2c84b]"
              />
              <span>
                I agree to the{" "}
                <Link to="/terms" className="text-[#f2c84b]">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link to="/privacy" className="text-[#f2c84b]">
                  Privacy Policy
                </Link>{" "}
                regarding my portfolio data.
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="flex h-[102px] w-full items-center justify-center gap-7 rounded-[14px] bg-[#f2c84b] text-[28px] font-black uppercase tracking-[0.04em] text-[#171511] shadow-[0_24px_55px_rgba(0,0,0,0.26)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 className="h-8 w-8 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="h-10 w-10" strokeWidth={2.3} />
                </>
              )}
            </button>
          </form>

          <div className="mt-28 flex items-center gap-4">
            <div className="h-px flex-1 bg-[#233447]" />
            <span className="bg-[#061725] px-8 text-[23px] font-black uppercase tracking-[0.07em] text-[#c8ced8]">
              Or Continue With
            </span>
            <div className="h-px flex-1 bg-[#233447]" />
          </div>

          <div className="mt-20 grid grid-cols-2 gap-8">
            <button
              type="button"
              onClick={() => void handleOAuthSignUp("google")}
              disabled={Boolean(oauthLoadingProvider)}
              className="flex h-[86px] items-center justify-center gap-6 rounded-[12px] border border-[#23374d] bg-[#112438] text-[26px] font-bold tracking-[-0.03em] text-[#dce6f6] transition hover:border-[#f2c84b]/60 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {oauthLoadingProvider === "google" ? (
                <Loader2 className="h-8 w-8 animate-spin" />
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
              onClick={() => void handleOAuthSignUp("apple")}
              disabled={Boolean(oauthLoadingProvider)}
              className="flex h-[86px] items-center justify-center gap-6 rounded-[12px] border border-[#23374d] bg-[#112438] text-[26px] font-bold tracking-[-0.03em] text-[#dce6f6] transition hover:border-[#f2c84b]/60 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {oauthLoadingProvider === "apple" ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : (
                <svg className="h-9 w-9" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M16.37 1.43c0 1.12-.42 2.16-1.15 2.96-.79.88-2.1 1.56-3.18 1.47-.14-1.08.4-2.23 1.11-3.06.78-.92 2.15-1.6 3.22-1.37Zm3.56 16.94c-.58 1.34-.86 1.94-1.6 3.13-1.04 1.57-2.5 3.52-4.32 3.54-1.61.02-2.03-1.02-4.22-1-2.19.01-2.65 1.02-4.26 1-1.82-.02-3.21-1.78-4.25-3.35C-1.62 17.26-1.92 11.98.02 9.14c1.38-2.02 3.56-3.2 5.61-3.2 2.08 0 3.39 1.07 5.11 1.07 1.67 0 2.68-1.07 5.08-1.07 1.81 0 3.72.93 5.09 2.54-4.47 2.3-3.74 8.3-.98 9.89Z"
                  />
                </svg>
              )}
              Apple
            </button>
          </div>

          <p className="mt-20 text-center text-[28px] tracking-[-0.04em] text-[#c8ced8]">
            Already a member?{" "}
            <Link to="/login" className="font-black text-[#f2c84b]">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
