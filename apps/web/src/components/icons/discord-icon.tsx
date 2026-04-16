import { type SVGProps } from "react";

interface DiscordIconProps extends SVGProps<SVGSVGElement> {
  className?: string;
}

export function DiscordIcon({ className, ...props }: DiscordIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 127 96"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M107.7 8.1A105.2 105.2 0 0 0 81.5 0c-1.1 2-2.4 4.7-3.3 6.8a97.4 97.4 0 0 0-29.3 0A73.9 73.9 0 0 0 45.5 0a106.1 106.1 0 0 0-26.2 8.1C2.6 32.9-2 57 0.3 80.7a107 107 0 0 0 32.2 16.2c2.6-3.5 4.9-7.2 6.9-11.1a69 69 0 0 1-10.8-5.1c.9-.7 1.8-1.4 2.7-2.1a75 75 0 0 0 64.2 0c.9.7 1.8 1.4 2.7 2.1a69 69 0 0 1-10.9 5.1c2 3.9 4.3 7.6 6.9 11.1a107 107 0 0 0 32.2-16.2c2.8-27.6-4.7-51.4-18.7-72.6zM42.4 66.4c-6.3 0-11.5-5.7-11.5-12.7 0-7 5.1-12.7 11.5-12.7 6.4 0 11.6 5.7 11.5 12.7 0 7-5.1 12.7-11.5 12.7zm42.5 0c-6.3 0-11.5-5.7-11.5-12.7 0-7 5.1-12.7 11.5-12.7 6.4 0 11.6 5.7 11.5 12.7 0 7-5.1 12.7-11.5 12.7z" />
    </svg>
  );
}
