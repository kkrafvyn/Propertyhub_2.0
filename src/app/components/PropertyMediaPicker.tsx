import { useEffect, useMemo } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { Button } from "./ui/Button";

interface PropertyMediaPickerProps {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
  label?: string;
  helperText?: string;
  maxFiles?: number;
}

function getFileKey(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

export function PropertyMediaPicker({
  files,
  onChange,
  disabled = false,
  label = "Property Photos",
  helperText = "Upload up to 10 JPG, PNG, or WebP images.",
  maxFiles = 10,
}: PropertyMediaPickerProps) {
  const previewItems = useMemo(
    () =>
      files.map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
      })),
    [files]
  );

  useEffect(() => {
    return () => {
      previewItems.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, [previewItems]);

  const handleSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const imageFiles = selectedFiles.filter((file) => file.type.startsWith("image/"));
    const existingKeys = new Set(files.map(getFileKey));
    const dedupedFiles = imageFiles.filter((file) => !existingKeys.has(getFileKey(file)));
    const nextFiles = [...files, ...dedupedFiles].slice(0, maxFiles);

    onChange(nextFiles);
    event.target.value = "";
  };

  const removeFile = (targetFile: File) => {
    onChange(files.filter((file) => getFileKey(file) !== getFileKey(targetFile)));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold">{label}</h3>
          <p className="text-sm text-muted-foreground mt-1">{helperText}</p>
        </div>
        <label className="inline-flex">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            onChange={handleSelect}
            disabled={disabled || files.length >= maxFiles}
          />
          <Button type="button" variant="outline" disabled={disabled || files.length >= maxFiles}>
            <ImagePlus className="w-4 h-4" />
            Add Photos
          </Button>
        </label>
      </div>

      {previewItems.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {previewItems.map(({ file, previewUrl }, index) => (
            <div key={getFileKey(file)} className="rounded-xl border border-border overflow-hidden bg-secondary/20">
              <div className="relative h-36 overflow-hidden">
                <img src={previewUrl} alt={file.name} className="w-full h-full object-cover" />
                {index === 0 && (
                  <span className="absolute top-2 left-2 rounded-full bg-white/90 px-2 py-1 text-xs font-medium">
                    First upload
                  </span>
                )}
              </div>
              <div className="p-3 space-y-3">
                <p className="text-sm font-medium line-clamp-2">{file.name}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => removeFile(file)}
                  disabled={disabled}
                >
                  <Trash2 className="w-4 h-4" />
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
          No photos selected yet.
        </div>
      )}
    </div>
  );
}
