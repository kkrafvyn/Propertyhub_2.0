import { Link, useNavigate } from "react-router";
import { User, Building2, Loader2 } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { toast } from "sonner";
import { AuthShell, AuthDivider, OAuthButtons } from "../../components/baytmiftah";

export function Signup() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    accountType: "user",
  });
  const [loading, setLoading] = useState(false);
  const [oauthLoadingProvider, setOauthLoadingProvider] = useState<"google" | "apple" | null>(
    null
  );
  const navigate = useNavigate();
  const { signUp, signInWithOAuth } = useAuth();

  const oauthRedirectUrl = useMemo(() => {
    const next =
      formData.accountType === "landlord" ? "/workspace?next=new" : "/app";
    return `${window.location.origin}/login?next=${encodeURIComponent(next)}`;
  }, [formData.accountType]);

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
          from: formData.accountType === "landlord" ? "/workspace?next=new" : "/app",
        },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create Account"
      subtitle="Join BaytMiftah and start your journey"
      heroTitle="Start Your Property Journey Today"
      heroSubtitle="Whether you're looking for a home or managing properties, we've got you covered"
      footer={
        <p className="text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Log in
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

      <AuthDivider label="Or sign up with email" />

      <div className="mb-6">
        <label className="mb-3 block font-semibold text-foreground">I want to</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setFormData({ ...formData, accountType: "user" })}
            className={`rounded-lg border-2 p-4 transition-all ${
              formData.accountType === "user"
                ? "border-brand-forest bg-brand-forest/10"
                : "border-border hover:border-brand-forest/50"
            }`}
          >
            <User className="mx-auto mb-2 h-6 w-6 text-brand-forest" />
            <div className="font-semibold text-foreground">Find Property</div>
            <div className="mt-1 text-xs text-muted-foreground">Search & rent</div>
          </button>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, accountType: "landlord" })}
            className={`rounded-lg border-2 p-4 transition-all ${
              formData.accountType === "landlord"
                ? "border-brand-forest bg-brand-forest/10"
                : "border-border hover:border-brand-forest/50"
            }`}
          >
            <Building2 className="mx-auto mb-2 h-6 w-6 text-brand-forest" />
            <div className="font-semibold text-foreground">List Property</div>
            <div className="mt-1 text-xs text-muted-foreground">Landlord/Agent</div>
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
          autoComplete="name"
        />

        <Input
          label="Email Address"
          type="email"
          placeholder="you@example.com"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
          autoComplete="email"
        />

        <Input
          label="Password"
          type="password"
          placeholder="Create a password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          required
          autoComplete="new-password"
        />

        <Input
          label="Confirm Password"
          type="password"
          placeholder="Confirm your password"
          value={formData.confirmPassword}
          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
          required
          autoComplete="new-password"
        />

        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            id="terms"
            className="mt-1 h-4 w-4 rounded border-border text-primary"
            required
          />
          <label htmlFor="terms" className="text-sm text-muted-foreground">
            I agree to the{" "}
            <Link to="/terms" className="text-primary hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
          </label>
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={loading || Boolean(oauthLoadingProvider)}
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
  );
}
