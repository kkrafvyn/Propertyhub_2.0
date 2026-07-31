import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { isEmailVerified } from "../../lib/security/password-policy";

const FINANCIAL_SECTIONS = new Set(["wallet", "payments", "transactions"]);

export function useFinancialAccessGuard() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const section = location.pathname.split("/")[2] || "overview";
    if (!FINANCIAL_SECTIONS.has(section)) return;

    if (!isEmailVerified(user)) {
      navigate("/verify-email", {
        replace: true,
        state: { from: `${location.pathname}${location.search}` },
      });
    }
  }, [user, location.pathname, location.search, navigate]);
}
