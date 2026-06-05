export interface NavLink {
  href: string;
  label: string;
}

export const NAV_LINKS: readonly NavLink[] = [
  { href: "/tournaments", label: "Tournaments" },
  { href: "/communities", label: "Communities" },
  { href: "/builder", label: "Builder" },
  { href: "/data", label: "Data" },
  { href: "/analytics", label: "Analytics" },
  { href: "/articles", label: "Articles" },
  { href: "/coaching", label: "Coaching" },
];
