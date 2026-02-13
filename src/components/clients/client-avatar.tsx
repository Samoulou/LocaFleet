import { cn } from "@/lib/utils";

const AVATAR_COLORS = [
  { bg: "bg-blue-100", text: "text-blue-700" },
  { bg: "bg-green-100", text: "text-green-700" },
  { bg: "bg-amber-100", text: "text-amber-700" },
  { bg: "bg-violet-100", text: "text-violet-700" },
  { bg: "bg-rose-100", text: "text-rose-700" },
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getColorForName(name: string) {
  return AVATAR_COLORS[hashString(name) % AVATAR_COLORS.length]!;
}

type ClientAvatarProps = {
  firstName: string;
  lastName: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZE_CLASSES = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-lg",
};

export function ClientAvatar({
  firstName,
  lastName,
  size = "md",
  className,
}: ClientAvatarProps) {
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  const color = getColorForName(`${firstName}${lastName}`);

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full font-semibold",
        color.bg,
        color.text,
        SIZE_CLASSES[size],
        className
      )}
    >
      {initials}
    </div>
  );
}
