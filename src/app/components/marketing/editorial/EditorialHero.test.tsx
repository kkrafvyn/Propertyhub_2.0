import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { EditorialHero } from './EditorialHero';
import { MarketingContentProvider } from './MarketingContentContext';
import { DEFAULT_MARKETING_DOCUMENT } from '../../../../lib/marketing-page-document';

afterEach(cleanup);

describe('marketing hero journeys', () => {
  it('preserves published copy while allowing visitors to preview both product paths', () => {
    const document = structuredClone(DEFAULT_MARKETING_DOCUMENT);
    document.hero.title = 'Your portfolio.';
    document.hero.secondLine = 'Clearer every day.';
    render(<MarketingContentProvider document={document}><EditorialHero /></MarketingContentProvider>);

    expect(screen.getByRole('heading', { level: 1 }).getAttribute('aria-label')).toBe('Your portfolio. Clearer every day.');
    expect(screen.getByRole('link', { name: 'Explore Properties', exact: true }).getAttribute('href')).toMatch(/\/search$/);
    expect(screen.getByRole('link', { name: 'Create workspace', exact: true }).getAttribute('href')).toMatch(/\/signup$/);
    expect(screen.getByRole('button', { name: 'Explore', exact: true }).getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: 'Workspace', exact: true }));
    expect(screen.getByRole('heading', { name: 'A clearer view of every property.' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Try the workspace preview' }).getAttribute('href')).toBe('#product-tour');
    expect(screen.queryByRole('link', { name: 'Find a home, land, or a stay' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Explore', exact: true }));
    expect(screen.getByRole('link', { name: 'Find a home, land, or a stay' }).getAttribute('href')).toMatch(/\/search$/);
    expect(screen.getByRole('button', { name: 'Workspace', exact: true }).getAttribute('aria-pressed')).toBe('false');
  });
});
