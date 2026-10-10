import { ArrowLeft, ArrowRight, Check, X, ExternalLink, Filter, MessageSquarePlus,
  Play, RotateCw, Search, SlidersHorizontal, Trash2, type LucideIcon } from 'lucide-react';

export type IconName =
  | "arrow-left" | "arrow-right" | "check" | "close" | "external"
  | "filter" | "message" | "play" | "refresh" | "search" | "settings" | "trash";

const icons: Record<IconName, LucideIcon> = {
  'arrow-left': ArrowLeft, 'arrow-right': ArrowRight, check: Check, close: X,
  external: ExternalLink, filter: Filter, message: MessageSquarePlus, play: Play,
  refresh: RotateCw, search: Search, settings: SlidersHorizontal, trash: Trash2,
};

/** Render the icon component. */
export function Icon({ name, size = 15 }: { name: IconName; size?: number }) {
  const Component = icons[name];
  return <Component className="x-icon" size={size} strokeWidth={1.8} aria-hidden="true" />;
}
