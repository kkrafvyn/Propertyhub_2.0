import { Navigate, useLocation, useParams } from "react-router";
import { resolveLegacyRedirect } from "../lib/consumer-routes";

export function LegacyRouteRedirect({ to }: { to?: string }) {
  const location = useLocation();
  const params = useParams();
  const target = to ?? resolveLegacyRedirect(location.pathname);

  if (params.id && location.pathname.startsWith("/messages/")) {
    return (
      <Navigate
        to={`/app/messages?conversation=${encodeURIComponent(params.id)}`}
        replace
      />
    );
  }

  return <Navigate to={`${target}${location.search}${location.hash}`} replace />;
}
