// The seven semantic states (design_tokens.semantic_state, RECON-27).
// Colour is NEVER the only channel: every state also carries an icon, a shape and a text
// label, so a grayscale render loses no information. `scale` separates the two legends:
// status (healthy/warning/critical/uncertain) vs series (raw/mitigated/logical).
import {
  CircleCheck,
  TriangleAlert,
  OctagonX,
  CircleDashed,
  Circle,
  Square,
  Diamond,
  type LucideIcon,
} from 'lucide-react';

export type Scale = 'status' | 'series';
export type StatusKey = 'healthy' | 'warning' | 'critical' | 'uncertain';
export type SeriesKey = 'raw' | 'mitigated' | 'logical';
export type SemanticKey = StatusKey | SeriesKey;

export interface SemanticDef {
  key: SemanticKey;
  scale: Scale;
  label: string;
  Icon: LucideIcon;
  shape: string; // named shape channel (redundant with icon, for chart markers)
  /** Tailwind text-colour class (generated token). */
  fg: string;
  /** Tailwind background class for status chips; series have no tinted bg. */
  bg?: string;
}

export const SEMANTIC: Record<SemanticKey, SemanticDef> = {
  healthy:   { key: 'healthy',   scale: 'status', label: 'Healthy',   Icon: CircleCheck,   shape: 'circle',        fg: 'text-state-healthy',   bg: 'bg-state-healthy-bg' },
  warning:   { key: 'warning',   scale: 'status', label: 'Warning',   Icon: TriangleAlert, shape: 'triangle',      fg: 'text-state-warning',   bg: 'bg-state-warning-bg' },
  critical:  { key: 'critical',  scale: 'status', label: 'Critical',  Icon: OctagonX,      shape: 'octagon',       fg: 'text-state-critical',  bg: 'bg-state-critical-bg' },
  uncertain: { key: 'uncertain', scale: 'status', label: 'Uncertain', Icon: CircleDashed,  shape: 'dashed-circle', fg: 'text-state-uncertain', bg: 'bg-state-uncertain-bg' },
  raw:       { key: 'raw',       scale: 'series', label: 'Raw',       Icon: Circle,        shape: 'circle-outline', fg: 'text-series-raw' },
  mitigated: { key: 'mitigated', scale: 'series', label: 'Mitigated', Icon: Square,        shape: 'square',        fg: 'text-series-mitigated' },
  logical:   { key: 'logical',   scale: 'series', label: 'Logical',   Icon: Diamond,       shape: 'diamond',       fg: 'text-series-logical' },
};
