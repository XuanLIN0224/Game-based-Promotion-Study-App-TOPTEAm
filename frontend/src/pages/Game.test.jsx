// src/pages/Game.test.jsx
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { vi, beforeEach, afterEach, describe, test, expect } from 'vitest';
import React from 'react';

// 0) hoisted containers for mocks
const mocks = vi.hoisted(() => ({
  getActiveMock: vi.fn(),
  mockNavigate: vi.fn(),
}));

// 1) mock CSS module
vi.mock('./Game.module.css', () => ({ default: {} }), { virtual: true });

// 2) mock react-router-dom, and use hoisted mocks
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mocks.mockNavigate,
  };
});

// 3) mock ../api/events, and use hoisted mocks
vi.mock('../api/events', () => ({
  __esModule: true,
  default: { getActive: mocks.getActiveMock },
  EventsAPI: { getActive: mocks.getActiveMock },
  getActive: mocks.getActiveMock,
}));

// 4)before importing the component under test, to ensure all mocks are set up
import Game from './Game';

describe('Game page / EventWidget', () => {
  beforeEach(() => {
    mocks.mockNavigate.mockReset();
    mocks.getActiveMock.mockReset();
  });

  afterEach(() => {
    cleanup();
    // make sure to restore real timers after each test
    vi.useRealTimers();
  });

  test('shows "No active event" when API returns no event', async () => {
    mocks.getActiveMock.mockResolvedValueOnce({ event: null });

    render(<Game />);

    await waitFor(() => {
      expect(screen.getByText(/No active event/i)).toBeInTheDocument();
    });

    // check left nav home icon
    expect(screen.getByAltText(/home/i)).toBeInTheDocument();
    expect(mocks.getActiveMock).toHaveBeenCalledTimes(1);
  });

  test('renders active event card with stats and hints', async () => {
    mocks.getActiveMock.mockResolvedValueOnce({
      event: { name: 'Midterm Clash', endAt: new Date('2025-10-21T09:00:00Z').toISOString() },
      stats: { cat: 1200, dog: 800, total: 2000, pctCat: 60, pctDog: 40 },
      hints: [
        { title: 'Hint 1', threshold: 500, content: 'Review lecture 3', unlocked: true },
        { title: 'Hint 2', threshold: 1500, content: 'Focus on DP', unlocked: false },
      ],
    });

    render(<Game />);

    // Event name and end time
    expect(await screen.findByText(/Midterm Clash/i)).toBeInTheDocument();
    expect(screen.getByText(/Cat: 1200 petfood \(60%\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Dog: 800 petfood \(40%\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Total: 2000/i)).toBeInTheDocument();

    // Hints
    expect(screen.getByText(/Hint 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Need 500 petfood/i)).toBeInTheDocument();
    expect(screen.getByText(/Locked/i)).toBeInTheDocument();

    expect(mocks.getActiveMock).toHaveBeenCalledTimes(1);
  });

});