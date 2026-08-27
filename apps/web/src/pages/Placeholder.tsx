import { useLocation } from 'react-router-dom';
import { Construction } from 'lucide-react';
import { ROUTES } from '../app/nav';
import { Card } from '../components/ui';

// Honest empty state (MISSION §43/§71): a planned surface says so plainly and never fakes
// data or dead controls. It states what the route will do and when it arrives.
export function Placeholder() {
  const { pathname } = useLocation();
  const route = ROUTES.find((r) => r.path === pathname);
  return (
    <Card className="mx-auto max-w-xl p-8 text-center">
      <Construction size={28} className="mx-auto mb-3 text-text-muted" aria-hidden />
      <h2 className="text-heading-l">{route?.label ?? 'Planned surface'}</h2>
      <p className="mt-2 text-body-s text-text-secondary">
        This surface is part of the product architecture but is not built yet. The foundations
        (contracts, scientific models, design system) are in place; this screen is implemented in a
        later phase. It is intentionally empty rather than showing placeholder or fabricated data.
      </p>
    </Card>
  );
}
