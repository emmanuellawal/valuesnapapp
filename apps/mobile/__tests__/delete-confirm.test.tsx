import React from 'react';
import { act, create, ReactTestRenderer, ReactTestInstance } from 'react-test-renderer';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() },
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
  },
}));

jest.mock('@/lib/env', () => ({
  env: {
    useMock: false,
    apiUrl: 'http://localhost:8000',
  },
}));

import DeleteConfirmScreen from '../app/account/delete-confirm';
import { useAuth } from '@/contexts/AuthContext';
import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';

const mockRouterBack = router.back as jest.Mock;
const mockRouterReplace = router.replace as jest.Mock;
const mockUseAuth = useAuth as jest.Mock;
const mockGetSession = supabase.auth.getSession as jest.Mock;
const mockSignOut = jest.fn();
const originalFetch = global.fetch;

function findByTestId(renderer: ReactTestRenderer, testID: string) {
  return renderer.root.find((node) => node.props?.testID === testID);
}

function getNodeText(node: ReactTestInstance): string {
  return node.children
    .map((child) => {
      if (typeof child === 'string') {
        return child;
      }

      return getNodeText(child);
    })
    .join('');
}

async function renderScreen() {
  let renderer: ReactTestRenderer;

  await act(async () => {
    renderer = create(<DeleteConfirmScreen />);
  });

  return renderer!;
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSignOut.mockResolvedValue(undefined);
  mockUseAuth.mockReturnValue({ signOut: mockSignOut });
  env.useMock = false;
  env.apiUrl = 'http://localhost:8000';
  global.fetch = jest.fn() as unknown as typeof fetch;
});

afterAll(() => {
  global.fetch = originalFetch;
});

describe('DeleteConfirmScreen', () => {
  it('renders without crashing', async () => {
    const renderer = await renderScreen();

    expect(renderer.toJSON()).not.toBeNull();
  });

  it('shows the warning copy about permanent deletion', async () => {
    const renderer = await renderScreen();
    const warning = findByTestId(renderer, 'delete-confirm-warning');

    expect(warning).toBeTruthy();
    expect(getNodeText(warning)).toContain('permanently delete');
    expect(getNodeText(warning)).toContain('cannot be undone');
  });

  it('disables the confirm button by default', async () => {
    const renderer = await renderScreen();
    const deleteButton = findByTestId(renderer, 'delete-confirm-button');

    expect(deleteButton.props.disabled).toBe(true);
  });

  it('keeps the confirm button disabled for incorrect input', async () => {
    const renderer = await renderScreen();
    const input = findByTestId(renderer, 'delete-confirm-input');

    await act(async () => {
      input.props.onChangeText('delete');
    });
    expect(findByTestId(renderer, 'delete-confirm-button').props.disabled).toBe(true);

    await act(async () => {
      // Strict comparison: whitespace is not trimmed.
      input.props.onChangeText('DELETE ');
    });
    expect(findByTestId(renderer, 'delete-confirm-button').props.disabled).toBe(true);

    await act(async () => {
      input.props.onChangeText('DEL');
    });
    expect(findByTestId(renderer, 'delete-confirm-button').props.disabled).toBe(true);
  });

  it('enables the confirm button only for the exact DELETE phrase', async () => {
    const renderer = await renderScreen();
    const input = findByTestId(renderer, 'delete-confirm-input');

    await act(async () => {
      input.props.onChangeText('DELETE');
    });

    expect(findByTestId(renderer, 'delete-confirm-button').props.disabled).toBe(false);
  });

  it('calls router.back when cancel is pressed', async () => {
    const renderer = await renderScreen();
    const cancelButton = findByTestId(renderer, 'delete-confirm-cancel-button');

    await act(async () => {
      cancelButton.props.onPress();
    });

    expect(mockRouterBack).toHaveBeenCalledTimes(1);
  });

  it('disables the confirm button again after the input is cleared', async () => {
    const renderer = await renderScreen();
    const input = findByTestId(renderer, 'delete-confirm-input');

    await act(async () => {
      input.props.onChangeText('DELETE');
    });
    expect(findByTestId(renderer, 'delete-confirm-button').props.disabled).toBe(false);

    await act(async () => {
      input.props.onChangeText('');
    });
    expect(findByTestId(renderer, 'delete-confirm-button').props.disabled).toBe(true);
  });
});

describe('DeleteConfirmScreen — execution', () => {
  async function renderReady() {
    const renderer = await renderScreen();
    const input = findByTestId(renderer, 'delete-confirm-input');

    await act(async () => {
      input.props.onChangeText('DELETE');
    });

    return renderer;
  }

  it('shows a loading state while deletion is in flight', async () => {
    const renderer = await renderReady();
    const pendingFetch = deferred<Response>();

    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'token-123' } },
    });
    (global.fetch as jest.Mock).mockReturnValue(pendingFetch.promise);

    act(() => {
      void findByTestId(renderer, 'delete-confirm-button').props.onPress();
    });
    await act(async () => {});

    const deleteButton = findByTestId(renderer, 'delete-confirm-button');
    expect(deleteButton.props.disabled).toBe(true);
    expect(getNodeText(deleteButton)).toContain('Deleting…');

    await act(async () => {
      pendingFetch.resolve({ ok: true } as Response);
      await Promise.resolve();
    });
  });

  it('signs out and navigates to tabs on successful deletion', async () => {
    const renderer = await renderReady();

    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'token-123' } },
    });
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200 } as Response);

    await act(async () => {
      await findByTestId(renderer, 'delete-confirm-button').props.onPress();
    });

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mockRouterReplace).toHaveBeenCalledWith('/(tabs)');
    expect(() => findByTestId(renderer, 'delete-confirm-error')).toThrow();
  });

  it('shows an error and does not navigate when the backend returns a failure', async () => {
    const renderer = await renderReady();

    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'token-123' } },
    });
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 } as Response);

    await act(async () => {
      await findByTestId(renderer, 'delete-confirm-button').props.onPress();
    });

    const errorNode = findByTestId(renderer, 'delete-confirm-error');
    expect(getNodeText(errorNode).toLowerCase()).toContain('deletion failed');
    expect(findByTestId(renderer, 'delete-confirm-button').props.disabled).toBe(false);
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });

  it('shows an error and re-enables the button when the network request throws', async () => {
    const renderer = await renderReady();

    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'token-123' } },
    });
    (global.fetch as jest.Mock).mockRejectedValue(new Error('network down'));

    await act(async () => {
      await findByTestId(renderer, 'delete-confirm-button').props.onPress();
    });

    const errorNode = findByTestId(renderer, 'delete-confirm-error');
    expect(getNodeText(errorNode).toLowerCase()).toContain('deletion failed');
    expect(findByTestId(renderer, 'delete-confirm-button').props.disabled).toBe(false);
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });

  it('bypasses the backend in mock mode', async () => {
    const renderer = await renderReady();
    env.useMock = true;

    await act(async () => {
      await findByTestId(renderer, 'delete-confirm-button').props.onPress();
    });

    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockGetSession).not.toHaveBeenCalled();
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mockRouterReplace).toHaveBeenCalledWith('/(tabs)');
  });
});