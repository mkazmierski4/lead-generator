import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 18, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconGrid = (p: IconProps) => (
  <Icon {...p}>
    <rect x="2.5" y="2.5" width="5.5" height="5.5" rx="1.5" />
    <rect x="10" y="2.5" width="5.5" height="5.5" rx="1.5" />
    <rect x="2.5" y="10" width="5.5" height="5.5" rx="1.5" />
    <rect x="10" y="10" width="5.5" height="5.5" rx="1.5" />
  </Icon>
);
export const IconList = (p: IconProps) => <Icon {...p}><path d="M3 4.5h12M3 9h12M3 13.5h7" /></Icon>;
export const IconSearch = (p: IconProps) => <Icon {...p}><circle cx="8" cy="8" r="5" /><path d="M12 12l3.5 3.5" /></Icon>;
export const IconMail = (p: IconProps) => <Icon {...p}><rect x="2.5" y="4" width="13" height="10" rx="2" /><path d="M3 5l6 4.5L15 5" /></Icon>;
export const IconFile = (p: IconProps) => <Icon {...p}><path d="M4.5 2.5h6l3 3v10h-9z" /><path d="M10.5 2.5v3h3M7 9.5h4M7 12h4" /></Icon>;
export const IconCheckSquare = (p: IconProps) => <Icon {...p}><rect x="2.5" y="2.5" width="13" height="13" rx="3" /><path d="M6 9.2l2 2 4-4.2" /></Icon>;
export const IconSend = (p: IconProps) => <Icon {...p}><path d="M15.5 2.5L8 10M15.5 2.5l-4.5 13-3-5.5-5.5-3z" /></Icon>;
export const IconMessage = (p: IconProps) => <Icon {...p}><path d="M3 4.5a2 2 0 012-2h8a2 2 0 012 2v6a2 2 0 01-2 2H8l-3.5 3v-3H5a2 2 0 01-2-2z" /></Icon>;
export const IconBan = (p: IconProps) => <Icon {...p}><circle cx="9" cy="9" r="6.5" /><path d="M4.5 13.5l9-9" /></Icon>;
export const IconPulse = (p: IconProps) => <Icon {...p}><path d="M2 9.5h3.5L7.5 4l3 10 2-4.5H16" /></Icon>;
export const IconSliders = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 5.5h3M9.5 5.5H15M3 12.5h7.5M14 12.5h1" />
    <circle cx="7.7" cy="5.5" r="1.7" />
    <circle cx="12.2" cy="12.5" r="1.7" />
  </Icon>
);
export const IconChevron = (p: IconProps) => <Icon {...p}><path d="M7 4.5L11.5 9 7 13.5" /></Icon>;
export const IconChevronDown = (p: IconProps) => <Icon {...p}><path d="M5 7l4 4 4-4" /></Icon>;
export const IconPlus = (p: IconProps) => <Icon {...p} strokeWidth={1.7}><path d="M9 3.5v11M3.5 9h11" /></Icon>;
export const IconDownload = (p: IconProps) => <Icon {...p}><path d="M9 2.5v9M5 8l4 4 4-4M3 15.5h12" /></Icon>;
export const IconRefresh = (p: IconProps) => <Icon {...p}><path d="M15 9a6 6 0 11-1.8-4.3M15 2.5v3.5h-3.5" /></Icon>;
export const IconCheck = (p: IconProps) => <Icon {...p} strokeWidth={2}><path d="M4 9.5l3.2 3.2L14 5.5" /></Icon>;
export const IconAlert = (p: IconProps) => <Icon {...p} strokeWidth={2}><path d="M9 4.5v5.5M9 13.5v.01" /></Icon>;
export const IconPin = (p: IconProps) => <Icon {...p}><path d="M9 16s5-4.6 5-8.5a5 5 0 00-10 0C4 11.4 9 16 9 16z" /><circle cx="9" cy="7.5" r="1.8" /></Icon>;
export const IconPhone = (p: IconProps) => (
  <Icon {...p}><path d="M4 3h3l1.3 3.3-1.8 1.2a8 8 0 004 4l1.2-1.8L15 11v3a1.5 1.5 0 01-1.5 1.5A11.5 11.5 0 012.5 4.5 1.5 1.5 0 014 3z" /></Icon>
);
export const IconExternal = (p: IconProps) => <Icon {...p}><path d="M10 3h5v5M15 3l-7 7M13 10.5V15H3V5h4.5" /></Icon>;
export const IconEmpty = (p: IconProps) => <Icon {...p}><circle cx="8" cy="8" r="5.5" /><path d="M12.2 12.2L16 16M5.5 8h5" /></Icon>;

export const IndustryIcons: Record<string, (p: IconProps) => React.ReactElement> = {
  hairdresser: (p) => <Icon {...p}><circle cx="5" cy="13.5" r="2.2" /><circle cx="13" cy="13.5" r="2.2" /><path d="M6.6 12L13 2.5M11.4 12L5 2.5" /></Icon>,
  beauty_salon: (p) => <Icon {...p}><circle cx="9" cy="7" r="4.5" /><path d="M9 11.5V16M7 16h4" /></Icon>,
  restaurant: (p) => <Icon {...p}><path d="M4 2.5v4a2 2 0 004 0v-4M6 8.5V16M13 16V2.5c-1.7.8-2.5 2.8-2.5 5.5H13" /></Icon>,
  cafe: (p) => <Icon {...p}><path d="M3 7.5h9v3.5a4 4 0 01-4 4H7a4 4 0 01-4-4z" /><path d="M12 9h1a2 2 0 010 4h-1.4M6 2.5c0 1 1 1.3 1 2.3M9 2.5c0 1 1 1.3 1 2.3" /></Icon>,
  car_repair: (p) => <Icon {...p}><path d="M11.6 2.7a3.6 3.6 0 00-4 4.7L3 12a1.6 1.6 0 002.3 2.3l4.6-4.6a3.6 3.6 0 004.7-4l-2.1 2.1-2-.5-.5-2z" /></Icon>,
  dentist: (p) => <Icon {...p}><path d="M5.5 2.8c-2 0-3 1.6-3 3.5 0 2.6 1.5 3.6 1.8 6.1.2 1.7 1.8 2 2.3.3l.8-2.7h3.2l.8 2.7c.5 1.7 2.1 1.4 2.3-.3.3-2.5 1.8-3.5 1.8-6.1 0-1.9-1-3.5-3-3.5-1.5 0-2.1.8-3.5.8s-2-.8-3.5-.8z" /></Icon>,
  florist: (p) => <Icon {...p}><circle cx="9" cy="4.6" r="2.2" /><circle cx="5.6" cy="7.8" r="2.2" /><circle cx="12.4" cy="7.8" r="2.2" /><path d="M9 10v6M9 13.5c-1.6 0-2.8-.8-3.3-2.2" /></Icon>,
  bakery: (p) => <Icon {...p}><path d="M2.5 9.5a6.5 4.5 0 0113 0v3.8a1.7 1.7 0 01-1.7 1.7H4.2a1.7 1.7 0 01-1.7-1.7z" /><path d="M6.5 7l1 2.5M10 6.5l1 2.5" /></Icon>,
};
