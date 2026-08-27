import type { HardwareProfile } from '../../services/contracts';
import { linScale } from './scale';

export interface CouplingMapProps {
  profile: HardwareProfile;
  summary: string;
  size?: number;
}

// Qubit connectivity — nodes at the device's lattice coordinates, edges are 2-qubit couplers.
// Node fill encodes readout error (darker/warmer = worse). Purely structural: no invented data.
export function CouplingMap({ profile, summary, size = 180 }: CouplingMapProps) {
  const P = 14, S = size;
  const xs = profile.qubits.map((q) => q.lattice_x), ys = profile.qubits.map((q) => q.lattice_y);
  const sx = linScale(Math.min(...xs), Math.max(...xs), P, S - P);
  const sy = linScale(Math.min(...ys), Math.max(...ys), P, S - P);
  const ros = profile.qubits.map((q) => q.readout_error_rate.value);
  const rmin = Math.min(...ros), rmax = Math.max(...ros);
  const tone = (v: number) => {
    const t = (v - rmin) / (rmax - rmin || 1); // 0 good .. 1 worse
    return t < 0.5 ? 'var(--color-state-healthy)' : t < 0.8 ? 'var(--color-state-warning)' : 'var(--color-state-critical)';
  };
  return (
    <svg viewBox={`0 0 ${S} ${S}`} width={S} height={S} role="img" aria-label={summary} className="text-border-control">
      {profile.coupling_map.map((e, i) => {
        const a = profile.qubits.find((q) => q.qubit === e.control), b = profile.qubits.find((q) => q.qubit === e.target);
        if (!a || !b) return null;
        return <line key={i} x1={sx(a.lattice_x)} y1={sy(a.lattice_y)} x2={sx(b.lattice_x)} y2={sy(b.lattice_y)} stroke="currentColor" strokeWidth={1.5} />;
      })}
      {profile.qubits.map((q) => (
        <circle key={q.qubit} cx={sx(q.lattice_x)} cy={sy(q.lattice_y)} r={5} fill={tone(q.readout_error_rate.value)} stroke="var(--color-bg-surface)" strokeWidth={1.5} />
      ))}
    </svg>
  );
}
