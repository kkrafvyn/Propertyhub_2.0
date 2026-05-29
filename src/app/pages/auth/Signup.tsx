import { Link, useNavigate } from "react-router";
import { Building2, Eye, EyeOff, Loader2, User } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { toast } from "sonner";

export function Signup() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    accountType: "user",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoadingProvider, setOauthLoadingProvider] = useState<"google" | null>(null);
  const navigate = useNavigate();
  const { signUp, signInWithOAuth } = useAuth();
  const redirectTo = formData.accountType === "landlord" ? "/workspace?next=new" : "/app";
  const oauthRedirectUrl = useMemo(() => {
    const next = encodeURIComponent(redirectTo);
    return `${window.location.origin}/login?next=${next}`;
  }, [redirectTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }

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

  const handleGoogleOAuthSignUp = async () => {
    try {
      setOauthLoadingProvider("google");
      await signInWithOAuth("google", oauthRedirectUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Google sign-up failed");
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
            <h1 className="text-3xl font-semibold mb-2">Create Account</h1>
            <p className="text-muted-foreground">Join BaytMiftah and start your journey</p>
          </div>

          {/* Account Type Selection */}
          <div className="mb-6">
            <label className="block mb-3 font-semibold">I want to</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, accountType: "user" })}
                className={`p-4 rounded-lg border-2 transition-all ${
                  formData.accountType === "user"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <User className="w-6 h-6 mx-auto mb-2 text-primary" />
                <div className="font-semibold">Find Property</div>
                <div className="text-xs text-muted-foreground mt-1">Search & rent</div>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, accountType: "landlord" })}
                className={`p-4 rounded-lg border-2 transition-all ${
                  formData.accountType === "landlord"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <Building2 className="w-6 h-6 mx-auto mb-2 text-primary" />
                <div className="font-semibold">List Property</div>
                <div className="text-xs text-muted-foreground mt-1">Landlord/Agent</div>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Full Name"
              type="text"
              placeholder="John Doe"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              required
            />

            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? "text" : "password"}
                placeholder="Create a password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="pr-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute bottom-3 right-3 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            <div className="relative">
              <Input
                label="Confirm Password"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="pr-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((current) => !current)}
                className="absolute bottom-3 right-3 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                title={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="terms"
                className="w-4 h-4 mt-1 rounded border-border text-primary"
                required
              />
              <label htmlFor="terms" className="text-sm text-muted-foreground">
                I agree to the{" "}
                <a href="#" className="text-primary hover:underline">
                  Terms of Service
                </a>{" "}
                and{" "}
                <a href="#" className="text-primary hover:underline">
                  Privacy Policy
                </a>
              </label>
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-background text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <Button
              variant="outline"
              size="lg"
              type="button"
              className="mt-6 w-full"
              onClick={() => void handleGoogleOAuthSignUp()}
              disabled={Boolean(oauthLoadingProvider)}
            >
              {oauthLoadingProvider === "google" ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
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
              Continue with Google
            </Button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline font-semibold">
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Image */}
      <div className="hidden lg:block flex-1 relative">
        <img
          src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80"
          alt="Modern property"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-accent/80 to-accent/40 flex items-end p-12">
          <div className="text-white">
            <h2 className="text-4xl font-semibold mb-4">Start Your Property Journey Today</h2>
            <p className="text-xl text-white/90">
              Whether you're looking for a home or managing properties, we've got you covered
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
