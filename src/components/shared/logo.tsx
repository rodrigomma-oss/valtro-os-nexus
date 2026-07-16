import logoAsset from "@/assets/valtro-labs-logo.png.asset.json";

interface LogoProps {
  className?: string;
  variant?: "default" | "compact";
}

export function Logo({ className, variant = "default" }: LogoProps) {
  const height = variant === "compact" ? "h-8" : "h-9";
  return (
    <img
      src={logoAsset.url}
      alt="Valtro Labs"
      className={`${height} w-auto object-contain select-none ${className ?? ""}`}
      draggable={false}
    />
  );
}
