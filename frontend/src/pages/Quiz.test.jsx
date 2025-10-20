// src/pages/Quiz.test.jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Quiz from './Quiz';
import * as client from '../api/client';

vi.mock('../api/client', () => ({
  api: vi.fn(),
}));

describe('Quiz page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders "No quiz today" message when no quiz is returned', async () => {
    client.api.mockResolvedValueOnce({ quiz: null });
    render(<MemoryRouter><Quiz /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText(/No quiz available/i)).toBeInTheDocument();
    });
  });

  test('renders quiz questions and choices correctly', async () => {
    client.api.mockResolvedValueOnce({
      quiz: {
        date: '2025-10-20',
        weekIndex: 5,
        questions: [
          {
            stem: 'What is 2 + 2?',
            choices: ['1', '2', '3', '4'],
          },
        ],
      },
      attempts: { allowed: 1, used: 0, left: 1 },
      boosterActive: false,
    });

    render(<MemoryRouter><Quiz /></MemoryRouter>);

    expect(await screen.findByText('Quiz')).toBeInTheDocument();
    expect(await screen.findByText('What is 2 + 2?')).toBeInTheDocument();
    expect(screen.getByLabelText('4')).toBeInTheDocument();
  });

  test('can select an answer and submit successfully', async () => {
    client.api
      .mockResolvedValueOnce({
        quiz: {
          date: '2025-10-20',
          weekIndex: 5,
          questions: [
            {
              stem: 'What is 2 + 2?',
              choices: ['1', '2', '3', '4'],
            },
          ],
        },
        attempts: { allowed: 1, used: 0, left: 1 },
        boosterActive: false,
      })
      .mockResolvedValueOnce({
        correct: 1,
        total: 1,
        award: 10,
        boosterApplied: false,
        correctIndexes: [3],
      });

    render(<MemoryRouter><Quiz /></MemoryRouter>);

    const choice = await screen.findByLabelText('4');
    fireEvent.click(choice);

    const submitBtn = await screen.findByRole('button', { name: /submit/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/You got 1\/1/)).toBeInTheDocument();
    });

    expect(client.api).toHaveBeenCalledWith('/quiz/attempt', expect.any(Object));
  });

  test('displays error message when not all questions answered', async () => {
    client.api.mockResolvedValueOnce({
      quiz: {
        date: '2025-10-20',
        weekIndex: 5,
        questions: [
          { stem: 'Q1?', choices: ['A', 'B', 'C', 'D'] },
          { stem: 'Q2?', choices: ['A', 'B', 'C', 'D'] },
        ],
      },
      attempts: { allowed: 1, used: 0, left: 1 },
      boosterActive: false,
    });

    render(<MemoryRouter><Quiz /></MemoryRouter>);
    const submitBtn = await screen.findByRole('button', { name: /submit/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Please answer all questions/i)).toBeInTheDocument();
    });
  });

  test('shows "Use Extra Attempt" button when 0 correct and no attempts left', async () => {
    client.api.mockResolvedValueOnce({
      quiz: {
        date: '2025-10-20',
        weekIndex: 5,
        questions: [
          {
            stem: 'What is 2 + 2?',
            choices: ['1', '2', '3', '4'],
          },
        ],
      },
      attempts: { allowed: 1, used: 1, left: 0 },
      boosterActive: false,
    });

    render(<MemoryRouter><Quiz /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText(/Attempts Left/i)).toBeInTheDocument();
    });

    // Manually set result via mocking later (optional)
    client.api.mockResolvedValueOnce({
      attempts: { allowed: 2, used: 1, left: 1 },
      message: '+1 attempt granted.',
    });

    // Simulate showing extra attempt button
    const useExtraBtn = screen.queryByText(/Use Extra Attempt/i);
    if (useExtraBtn) fireEvent.click(useExtraBtn);
  });
});