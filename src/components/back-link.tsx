import { href, type Route } from "@/lib/route";
import { ChevronLeft } from "lucide-react";

export function BackLink({ to, label }: { to: Route; label: string }) {
  return (
    <a
      href={href(to)}
      className="-ml-1.5 inline-flex items-center gap-0.5 rounded-md py-1 pl-0.5 pr-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ChevronLeft className="size-4" />
      {label}
    </a>
  );
}
