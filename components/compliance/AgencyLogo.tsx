import Image from "next/image";

const AGENCY_LOGOS: Record<string, string> = {
  AUSTRAC: "/logos/austrac.jpg",
  OAIC: "/logos/oaic.png",
};

export function AgencyLogo({ agency, size = 56 }: { agency: string; size?: number }) {
  const logoSrc = AGENCY_LOGOS[agency];

  if (logoSrc) {
    return (
      <div
        className="relative shrink-0 overflow-hidden rounded-lg border border-gray-100 bg-white p-1"
        style={{ width: size, height: size }}
      >
        <Image
          src={logoSrc}
          alt={`${agency} logo`}
          fill
          className="object-contain"
          sizes={`${size}px`}
        />
      </div>
    );
  }

  const initials = agency
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 3);

  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-sm font-bold text-indigo-700"
      style={{ width: size, height: size }}
    >
      {initials}
    </div>
  );
}
