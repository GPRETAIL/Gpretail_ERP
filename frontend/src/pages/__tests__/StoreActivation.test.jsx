import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import StoreActivation from '../StoreActivation';

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../../api/axios', () => ({ default: { get, post } }));

beforeEach(() => { get.mockReset(); post.mockReset(); });

it('activates the selected store using the emailed code and clears the code', async () => {
  get.mockResolvedValue({ data: { data: [{ id: 2, name: 'Shop', code: 'STR-2', activated_at: null }] } });
  post.mockResolvedValue({ data: { message: 'Store activated.' } });
  render(<StoreActivation />);
  fireEvent.click(await screen.findByRole('button', { name: 'Activate this store' }));
  fireEvent.change(screen.getByLabelText(/Activation code/), { target: { value: 'once-only' } });
  fireEvent.click(screen.getByRole('button', { name: 'Activate store' }));
  await waitFor(() => expect(post).toHaveBeenCalledWith('/company-stores/activate', { store_code: 'STR-2', activation_code: 'once-only' }));
  expect(await screen.findByText('Store activated.')).toBeInTheDocument();
  expect(screen.getByLabelText(/Activation code/)).toHaveValue('');
});

it('shows a sync failure while retaining the code for a safe retry', async () => {
  get.mockResolvedValue({ data: { data: [] } });
  post.mockRejectedValue({ response: { data: { message: 'Code expired' } } });
  render(<StoreActivation />);
  fireEvent.change(screen.getByLabelText(/Store code/), { target: { value: 'STR-2' } });
  fireEvent.change(screen.getByLabelText(/Activation code/), { target: { value: 'expired-code' } });
  fireEvent.click(screen.getByRole('button', { name: 'Activate store' }));
  expect(await screen.findByText('Code expired')).toBeInTheDocument();
  expect(screen.getByLabelText(/Activation code/)).toHaveValue('expired-code');
});
