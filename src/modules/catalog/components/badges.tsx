import {
  AudioLinesIcon,
  BracesIcon,
  BrainIcon,
  DatabaseZapIcon,
  FileTextIcon,
  GlobeIcon,
  ImageIcon,
  SlidersHorizontalIcon,
  TypeIcon,
  VideoIcon,
  WrenchIcon,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/platform/ui/badge";
import { cn } from "@/platform/ui/cn";
import {
  CAPABILITY_LABELS,
  MODALITY_LABELS,
  MODEL_STATUS_LABELS,
  MODEL_TYPE_LABELS,
} from "../labels";
import type {
  PublicCapability,
  PublicModality,
  PublicModelStatus,
  PublicModelType,
} from "../types";

export const CAPABILITY_ICONS: Record<PublicCapability, LucideIcon> = {
  tool_calling: WrenchIcon,
  structured_output: BracesIcon,
  reasoning: BrainIcon,
  prompt_caching: DatabaseZapIcon,
  fine_tuning: SlidersHorizontalIcon,
  web_search: GlobeIcon,
};

export const MODALITY_ICONS: Record<PublicModality, LucideIcon> = {
  text: TypeIcon,
  image: ImageIcon,
  audio: AudioLinesIcon,
  video: VideoIcon,
  file: FileTextIcon,
};

export function ModelTypeBadge({ type }: { type: PublicModelType }) {
  return (
    <Badge variant="outline" className="font-normal">
      {MODEL_TYPE_LABELS[type]}
    </Badge>
  );
}

export function StatusBadge({ status }: { status: PublicModelStatus }) {
  if (status === "active") return null;
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-normal",
        status === "preview" && "border-sky-500/40 text-sky-700 dark:text-sky-300",
        status === "deprecated" && "border-amber-500/40 text-amber-700 dark:text-amber-300",
      )}
    >
      {MODEL_STATUS_LABELS[status]}
    </Badge>
  );
}

export function OpenWeightsBadge({ openWeights }: { openWeights: boolean }) {
  if (!openWeights) return null;
  return (
    <Badge
      variant="outline"
      className="border-emerald-500/40 font-normal text-emerald-700 dark:text-emerald-300"
    >
      Open weights
    </Badge>
  );
}

/** Icon row with accessible names; the icons are decorative next to a visible list elsewhere. */
export function CapabilityIcons({
  capabilities,
  className,
}: {
  capabilities: PublicCapability[];
  className?: string;
}) {
  if (capabilities.length === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-muted-foreground", className)}>
      {capabilities.map((capability) => {
        const Icon = CAPABILITY_ICONS[capability];
        return (
          <span key={capability} title={CAPABILITY_LABELS[capability]}>
            <Icon className="size-3.5" aria-hidden />
            <span className="sr-only">{CAPABILITY_LABELS[capability]}</span>
          </span>
        );
      })}
    </span>
  );
}

export function CapabilityList({ capabilities }: { capabilities: PublicCapability[] }) {
  if (capabilities.length === 0)
    return <p className="text-sm text-muted-foreground">None listed</p>;
  return (
    <ul className="flex flex-wrap gap-2">
      {capabilities.map((capability) => {
        const Icon = CAPABILITY_ICONS[capability];
        return (
          <li key={capability}>
            <Badge variant="secondary" className="gap-1.5 font-normal">
              <Icon aria-hidden /> {CAPABILITY_LABELS[capability]}
            </Badge>
          </li>
        );
      })}
    </ul>
  );
}

export function ModalityList({ modalities }: { modalities: PublicModality[] }) {
  if (modalities.length === 0)
    return <span className="text-sm text-muted-foreground">Vectors</span>;
  return (
    <ul className="flex flex-wrap gap-2">
      {modalities.map((modality) => {
        const Icon = MODALITY_ICONS[modality];
        return (
          <li key={modality}>
            <Badge variant="outline" className="gap-1.5 font-normal">
              <Icon aria-hidden /> {MODALITY_LABELS[modality]}
            </Badge>
          </li>
        );
      })}
    </ul>
  );
}
