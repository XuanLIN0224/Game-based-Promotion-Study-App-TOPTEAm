// frontend/src/pages/auth/Login.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

// ---- Mock react-router-dom 的 useNavigate ----
vi.mock('react-router-dom', async (orig) => {
  const actual = await orig();
  return {
    ...actual,
    useNavigate: () => vi.fn(), // use spy in each test
  };
});

// ---- Mock api/client ----
const mockApi = vi.fn();
const mockSetToken = vi.fn();
vi.mock('../../api/client', () => ({
  api: (...args) => mockApi(...args),
  setToken: (...args) => mockSetToken(...args),
}));

import * as RRD from 'react-router-dom';
import Login from './Login';

function setup() {
  const navigateSpy = vi.fn();
  vi.spyOn(RRD, 'useNavigate').mockReturnValue(navigateSpy);

  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );

  const email = screen.getByLabelText(/email/i);
  const pwd = screen.getByLabelText(/^password$/i);
  const showPwd = screen.getByLabelText(/show password/i);
  const remember = screen.getByLabelText(/keep me logged in/i);
  const submitBtn = screen.getByRole('button', { name: /log in/i });

  return { email, pwd, showPwd, remember, submitBtn, navigateSpy };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Login page', () => {
  it('renders fields and submit button', () => {
    const { email, pwd, submitBtn } = setup();
    expect(email).toBeInTheDocument();
    expect(pwd).toBeInTheDocument();
    expect(submitBtn).toBeInTheDocument();
  });

  it('toggles password visibility with "Show password"', async () => {
    const user = userEvent.setup();
    const { pwd, showPwd } = setup();

    // default is password type
    expect(pwd).toHaveAttribute('type', 'password');

    await user.click(showPwd);
    expect(pwd).toHaveAttribute('type', 'text');

    await user.click(showPwd);
    expect(pwd).toHaveAttribute('type', 'password');
  });

  it('successful login as TEACHER navigates to /teacher', async () => {
    const user = userEvent.setup();
    const { email, pwd, submitBtn, navigateSpy } = setup();

    // first call /auth/me returns user info
    mockApi
      .mockResolvedValueOnce({ token: 'JWT_TOKEN' }) // /auth/login
      .mockResolvedValueOnce({ isStudent: false });  // /auth/me

    await user.type(email, 't@ex.com');
    await user.type(pwd, 'secret');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockSetToken).toHaveBeenCalledWith('JWT_TOKEN');
      expect(navigateSpy).toHaveBeenCalledWith('/teacher', { replace: true });
    });

    // check api calls
    expect(mockApi).toHaveBeenNthCalledWith(
      1,
      '/auth/login',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({
          email: 't@ex.com',
          password: 'secret',
          // remember default false
        }),
      })
    );
    //second /auth/me
    expect(mockApi).toHaveBeenNthCalledWith(2, '/auth/me');
  });

  it('successful login as STUDENT navigates to /', async () => {
    const user = userEvent.setup();
    const { email, pwd, submitBtn, navigateSpy } = setup();

    mockApi
      .mockResolvedValueOnce({ token: 'JWT_TOKEN' }) // /auth/login
      .mockResolvedValueOnce({ isStudent: true });   // /auth/me

    await user.type(email, 's@ex.com');
    await user.type(pwd, 'secret');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockSetToken).toHaveBeenCalledWith('JWT_TOKEN');
      expect(navigateSpy).toHaveBeenCalledWith('/', { replace: true });
    });
  });

  it('shows error when login fails', async () => {
    const user = userEvent.setup();
    const { email, pwd, submitBtn } = setup();

    mockApi.mockRejectedValueOnce(new Error('Invalid credentials')); // /auth/login

    await user.type(email, 'x@ex.com');
    await user.type(pwd, 'wrong');
    await user.click(submitBtn);

    const err = await screen.findByText(/invalid credentials/i);
    expect(err).toBeInTheDocument();

    // recovers to allow retry
    expect(submitBtn).not.toBeDisabled();
    expect(submitBtn).toHaveTextContent(/log in/i);
  });

  it('sends remember=true when checkbox checked', async () => {
    const user = userEvent.setup();
    const { email, pwd, remember, submitBtn } = setup();

    mockApi
      .mockResolvedValueOnce({ token: 'JWT_TOKEN' }) // /auth/login
      .mockResolvedValueOnce({ isStudent: true });   // /auth/me

    await user.type(email, 'r@ex.com');
    await user.type(pwd, 'secret');
    await user.click(remember); 
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledTimes(2);
    });

    // 第一次调用 /auth/login 的 body 应该带 remember:true
    // first use of mockApi
    const firstCall = mockApi.mock.calls[0];
    expect(firstCall[0]).toBe('/auth/login');
    expect(firstCall[1].body.remember).toBe(true);
  });
});