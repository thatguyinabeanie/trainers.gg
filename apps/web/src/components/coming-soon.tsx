import Link from "next/link";

interface ComingSoonProps {
  emoji: string;
  title: string;
  description: string;
  bullets: string[];
}

export function ComingSoon({
  emoji,
  title,
  description,
  bullets,
}: ComingSoonProps) {
  return (
    <div className="relative flex min-h-[70vh] items-start justify-center overflow-hidden px-4 pt-24 pb-16">
      {/* Dot grid background — light mode */}
      <div
        className="pointer-events-none absolute inset-0 dark:hidden"
        aria-hidden="true"
        style={{
          backgroundImage:
            "radial-gradient(circle, oklch(0.5 0.08 183 / 0.18) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage: "linear-gradient(to bottom, black 20%, transparent 70%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, black 20%, transparent 70%)",
        }}
      />
      {/* Dot grid background — dark mode */}
      <div
        className="pointer-events-none absolute inset-0 hidden dark:block"
        aria-hidden="true"
        style={{
          backgroundImage:
            "radial-gradient(circle, oklch(0.7 0.12 183 / 0.08) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage: "linear-gradient(to bottom, black 20%, transparent 70%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, black 20%, transparent 70%)",
        }}
      />

      <div className="relative z-10 max-w-lg text-center">
        <span className="border-primary/30 text-primary/60 mb-6 inline-flex items-center gap-1.5 rounded-full border border-dashed px-3 py-1 font-mono text-[10px] font-semibold tracking-[3px] uppercase">
          Under Construction
        </span>

        <span className="mb-5 block text-5xl">{emoji}</span>

        <h1 className="text-foreground mb-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
          {title}
        </h1>

        <p className="text-muted-foreground mx-auto mb-7 max-w-md text-base leading-relaxed">
          {description}
        </p>

        <ul className="mx-auto mb-8 max-w-sm space-y-0 text-left">
          {bullets.map((bullet) => (
            <li
              key={bullet}
              className="text-muted-foreground border-border/40 flex items-center gap-3 border-b py-2.5 text-sm last:border-0"
            >
              <span className="bg-primary size-1.5 shrink-0 rounded-full" />
              {bullet}
            </li>
          ))}
        </ul>

        <Link
          href="/"
          className="border-border bg-background hover:bg-muted inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
        >
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}
