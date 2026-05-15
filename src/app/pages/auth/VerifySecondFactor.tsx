import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { KeyRound, Loader2, ShieldCheck, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { useAuth, type AuthMfaFactor } from "../../context/AuthContext";

function getFactorLabel(factor: AuthMfaFactor) {
  if (factor.friendly_name?.trim()) return factor.friendly_name.trim();
  if (factor.factor_type === "phone") return "Phone verification";
  if (factor.factor_type === "totp") return "Authenticator app";
  return "Security factor";
}

export function VerifySecondFactor() {
  const [factors, setFactors] = useState<AuthMfaFactor[]>([]);
  const [selectedFactorId, setSelectedFactorId] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [code, setCode] = useState("");
  const [loadingFactors, setLoadingFactors] = useState(true);
  const [challenging, setChallenging] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const {
    user,
    authAssurance,
    listMfaFactors,
    challengeMfaFactor,
    verifyMfaFactor,
  } = useAuth();

  const redirectTo = useMemo(() => {
    const next = new URLSearchParams(location.search).get("next");
    return next || "/app";
  }, [location.search]);

  const selectedFactor =
    factors.find((factor) => factor.id === selectedFactorId) || null;

  useEffect(() => {
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(redirectTo)}`, { replace: true });
      return;
    }

    if (!authAssurance.loading && authAssurance.currentLevel === "aal2") {
      navigate(redirectTo, { replace: true });
      return;
    }

    if (!authAssurance.loading && authAssurance.nextLevel !== "aal2") {
      navigate(redirectTo, { replace: true });
    }
  }, [authAssurance.currentLevel, authAssurance.loading, authAssurance.nextLevel, navigate, redirectTo, user]);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    const loadFactors = async () => {
      try {
        setLoadingFactors(true);
        const nextFactors = await listMfaFactors();
        if (cancelled) return;

        const verifiedFactors = nextFactors.filter(
          (factor) =>
            factor.status === "verified" &&
            (factor.factor_type === "phone" || factor.factor_type === "totp")
        );
        setFactors(verifiedFactors);
        setSelectedFactorId((current) => current || verifiedFactors[0]?.id || "");
      } catch (error) {
        console.error("Failed to load MFA factors:", error);
        if (!cancelled) {
          toast.error("We couldn't load your second-factor options.");
        }
      } finally {
        if (!cancelled) setLoadingFactors(false);
      }
    };

    void loadFactors();

    return () => {
      cancelled = true;
    };
  }, [listMfaFactors, user]);

  const handleStartChallenge = async () => {
    if (!selectedFactor) {
      toast.error("Choose a second-factor method first.");
      return;
    }

    try {
      setChallenging(true);
      const nextChallengeId = await challengeMfaFactor(selectedFactor, {
        channel: selectedFactor.factor_type === "phone" ? "sms" : undefined,
      });
      setChallengeId(nextChallengeId);
      setCode("");
      toast.success(
        selectedFactor.factor_type === "phone"
          ? "Verification code sent."
          : "Enter the code from your authenticator app."
      );
    } catch (error) {
      console.error("Failed to start MFA challenge:", error);
      toast.error(error instanceof Error ? error.message : "Unable to start verification.");
    } finally {
      setChallenging(false);
    }
  };

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedFactor || !challengeId || !code.trim()) {
      toast.error("Start verification and enter the code first.");
      return;
    }

    try {
      setVerifying(true);
      await verifyMfaFactor(selectedFactor.id, challengeId, code.trim());
      toast.success("Two-step verification complete.");
      navigate(redirectTo, { replace: true });
    } catch (error) {
      console.error("Failed to verify MFA code:", error);
      toast.error(error instanceof Error ? error.message : "Invalid verification code.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl space-y-6">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
          </Link>
          <h1 className="text-3xl font-semibold">Verify Your Sign-In</h1>
          <p className="text-muted-foreground mt-2">
            Your account uses two-step verification. Complete your second factor to continue.
          </p>
        </div>

        <Card className="p-6 space-y-5">
          <div className="flex gap-3 rounded-xl border border-border bg-secondary/20 p-4 text-sm text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
            <p>
              Your password or social sign-in is the first step. The code you enter here is only for
              the second-factor check.
            </p>
          </div>

          {loadingFactors ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading verification options...
            </div>
          ) : factors.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
              No verified second-factor methods are available for this account yet.
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <p className="text-sm font-medium">Choose a verification method</p>
                <div className="grid gap-3">
                  {factors.map((factor) => {
                    const isSelected = factor.id === selectedFactorId;
                    return (
                      <button
                        key={factor.id}
                        type="button"
                        className={`rounded-xl border p-4 text-left transition ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border bg-background hover:border-primary/40"
                        }`}
                        onClick={() => {
                          setSelectedFactorId(factor.id);
                          setChallengeId("");
                          setCode("");
                        }}
                      >
                        <div className="flex items-center gap-3">
                          {factor.factor_type === "phone" ? (
                            <Smartphone className="h-5 w-5 text-primary" />
                          ) : (
                            <KeyRound className="h-5 w-5 text-primary" />
                          )}
                          <div>
                            <p className="font-medium">{getFactorLabel(factor)}</p>
                            <p className="text-sm text-muted-foreground">
                              {factor.factor_type === "phone"
                                ? "Receive a one-time code by SMS."
                                : "Use the 6-digit code from your authenticator app."}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <Button
                type="button"
                size="lg"
                className="w-full"
                onClick={() => void handleStartChallenge()}
                disabled={!selectedFactor || challenging || verifying}
              >
                {challenging ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Preparing verification...
                  </>
                ) : selectedFactor?.factor_type === "phone" ? (
                  "Send verification code"
                ) : (
                  "I have my authenticator ready"
                )}
              </Button>

              <form onSubmit={handleVerify} className="space-y-4">
                <Input
                  label="Verification Code"
                  inputMode="numeric"
                  placeholder="Enter your 6-digit code"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  disabled={!challengeId || verifying}
                  required
                />
                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={!challengeId || !code.trim() || verifying}
                >
                  {verifying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Complete verification"
                  )}
                </Button>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
