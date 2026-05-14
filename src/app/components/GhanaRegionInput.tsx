import { useEffect, useId, useState, type InputHTMLAttributes } from "react";
import { ghanaApiService, FALLBACK_GHANA_REGIONS, type GhanaRegion } from "../../lib/ghana-api.service";
import { Input } from "./ui/Input";

interface GhanaRegionInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  label?: string;
  value: string;
  onChange: (value: string) => void;
}

export function GhanaRegionInput({
  label = "Region",
  value,
  onChange,
  ...props
}: GhanaRegionInputProps) {
  const listId = useId();
  const [regions, setRegions] = useState<GhanaRegion[]>(FALLBACK_GHANA_REGIONS);

  useEffect(() => {
    let cancelled = false;

    ghanaApiService.getRegions().then((nextRegions) => {
      if (!cancelled) setRegions(nextRegions);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <Input
        {...props}
        label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        list={listId}
      />
      <datalist id={listId}>
        {regions.map((region) => (
          <option
            key={region.code}
            value={ghanaApiService.getRegionDisplayName(region)}
            label={region.label}
          />
        ))}
      </datalist>
    </>
  );
}
