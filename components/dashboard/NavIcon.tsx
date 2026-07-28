import { SVGProps } from "react";
import type { IconName } from "./nav-links";

const paths: Record<IconName, string> = {
  home: "M3 11.5 12 4l9 7.5M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9",
  users:
    "M17 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M15 8a4 4 0 1 0-8 0 4 4 0 0 0 8 0Zm6 12v-1a3.5 3.5 0 0 0-2.5-3.36M15.5 4.14A4 4 0 0 1 18 8a4 4 0 0 1-2.5 3.71",
  trending: "m3 17 6-6 4 4 8-8M15 7h6v6",
  folder:
    "M4 6a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6Z",
  check: "M9 12.5l2.5 2.5L19 8M5 6h1M5 12h1M5 18h1",
  invoice:
    "M7 3h10a1 1 0 0 1 1 1v16l-3-2-2 2-2-2-2 2-2-2-3 2V4a1 1 0 0 1 1-1Zm2 5h6M9 11h6M9 14h4",
  team: "M8 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 2a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2 20a6 6 0 0 1 12 0M14 20a5 5 0 0 1 8-4",
  settings:
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8.4-3a7.97 7.97 0 0 0-.2-1.8l2-1.5-2-3.4-2.3.9a8 8 0 0 0-3.1-1.8L14.4 2H9.6l-.4 2.4a8 8 0 0 0-3.1 1.8l-2.3-.9-2 3.4 2 1.5a8 8 0 0 0 0 3.6l-2 1.5 2 3.4 2.3-.9a8 8 0 0 0 3.1 1.8l.4 2.4h4.8l.4-2.4a8 8 0 0 0 3.1-1.8l2.3.9 2-3.4-2-1.5a8 8 0 0 0 .2-1.8Z",
  assistant:
    "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10ZM7 8h10M7 12h6",
};

export function NavIcon({
  name,
  ...props
}: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d={paths[name]} />
    </svg>
  );
}
