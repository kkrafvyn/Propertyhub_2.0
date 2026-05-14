import { useState } from "react";
import { Loader2, MapPin, Navigation } from "lucide-react";
import { toast } from "sonner";
import {
  ghanaApiService,
  type GhanaRouteCalculation,
} from "../../lib/ghana-api.service";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";

interface GhanaRoutePlannerProps {
  destinationLat?: number | null;
  destinationLng?: number | null;
  destinationLabel: string;
}

export function GhanaRoutePlanner({
  destinationLat,
  destinationLng,
  destinationLabel,
}: GhanaRoutePlannerProps) {
  const [route, setRoute] = useState<GhanaRouteCalculation | null>(null);
  const [loading, setLoading] = useState(false);

  const hasDestination =
    typeof destinationLat === "number" &&
    Number.isFinite(destinationLat) &&
    typeof destinationLng === "number" &&
    Number.isFinite(destinationLng);

  const calculateRoute = async () => {
    if (!hasDestination) {
      toast.error("The listing team has not added map coordinates yet.");
      return;
    }

    if (!navigator.geolocation) {
      toast.error("Location access is not available in this browser.");
      return;
    }

    try {
      setLoading(true);
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 12000,
        });
      });

      const nextRoute = await ghanaApiService.calculateDrivingRoute({
        startLat: position.coords.latitude,
        startLng: position.coords.longitude,
        endLat: destinationLat,
        endLng: destinationLng,
      });

      setRoute(nextRoute);
      toast.success("Route estimate ready.");
    } catch (error) {
      console.error("Failed to calculate Ghana route:", error);
      toast.error("We couldn't calculate that route right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mt-4 p-5 bg-primary/5 border-primary/15">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Navigation className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Ghana driving estimate</h3>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Calculate a live driving estimate to {destinationLabel} using Ghana API route data.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => void calculateRoute()}
          disabled={loading || !hasDestination}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
          {hasDestination ? "Use My Location" : "Coordinates Needed"}
        </Button>
      </div>

      {route ? (
        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Distance</p>
              <p className="mt-1 text-2xl font-semibold">
                {ghanaApiService.formatDistance(route.distance)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Drive time</p>
              <p className="mt-1 text-2xl font-semibold">
                {ghanaApiService.formatDuration(route.duration)}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-background p-4">
            <p className="mb-3 text-sm font-medium">Route instructions</p>
            <ol className="space-y-2 text-sm text-muted-foreground">
              {route.instructions.slice(0, 6).map((instruction, index) => (
                <li key={`${instruction}-${index}`} className="flex gap-2">
                  <span className="font-medium text-foreground">{index + 1}.</span>
                  <span>{instruction}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      ) : (
        <p className="mt-4 text-xs text-muted-foreground">
          Route estimates require browser location permission and listing latitude/longitude.
        </p>
      )}
    </Card>
  );
}
