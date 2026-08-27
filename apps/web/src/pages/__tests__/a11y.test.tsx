import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import type { JSX } from 'react';
import { Overview } from '../Overview';
import { NewAnalysis } from '../NewAnalysis';
import { QecLab } from '../QecLab';
import { Hardware } from '../Hardware';
import { Strategies } from '../Strategies';

// Accessibility baseline (§42, Phase 9): each page exposes a heading, every chart carries an
// accessible name (charts are role="img" with a text summary — non-visual users are not left
// with a blank SVG), and every interactive control has an accessible name.
const PAGES: [string, () => JSX.Element][] = [
  ['Overview', Overview],
  ['NewAnalysis', NewAnalysis],
  ['QEC Lab', QecLab],
  ['Hardware', Hardware],
  ['Strategies', Strategies],
];

describe('a11y baseline', () => {
  it.each(PAGES)('%s exposes a heading and named controls/charts', (_name, Page) => {
    render(
      <MemoryRouter>
        <Page />
      </MemoryRouter>,
    );
    // A page must have at least one heading.
    expect(screen.getAllByRole('heading').length).toBeGreaterThan(0);

    // Every chart (role="img") must have an accessible name (its summary), not a blank SVG.
    for (const img of screen.queryAllByRole('img')) {
      expect(img).toHaveAccessibleName();
    }

    // Every button/link must have an accessible name (no icon-only controls without a label).
    for (const btn of screen.queryAllByRole('button')) {
      expect(btn).toHaveAccessibleName();
    }
  });

  it('New Analysis uses a labelled range control for the target error', () => {
    render(
      <MemoryRouter>
        <NewAnalysis />
      </MemoryRouter>,
    );
    expect(screen.getByRole('slider', { name: /target error/i })).toBeInTheDocument();
  });
});
