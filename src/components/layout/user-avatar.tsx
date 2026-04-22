import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function getInitials(name: string): string {
  if (!name.trim()) return "";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type UserAvatarProps = {
  name: string;
  className?: string;
};

export function UserAvatar({ name, className }: UserAvatarProps) {
  return (
    <Avatar className={className}>
      <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
