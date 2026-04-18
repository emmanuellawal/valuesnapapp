import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

import { GuestBanner } from '@/components/molecules/guest-banner';
import { router } from 'expo-router';

const mockRouter = router as jest.Mocked<typeof router>;

describe('GuestBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders null when visible is false', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<GuestBanner visible={false} />);
    });

    expect(renderer!.toJSON()).toBeNull();
  });

  it('renders banner content when visible is true', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<GuestBanner visible={true} />);
    });

    expect(renderer!.root.findByProps({ testID: 'guest-banner' })).toBeTruthy();
    expect(renderer!.root.findByProps({ testID: 'guest-banner-register' })).toBeTruthy();
    expect(renderer!.root.findByProps({ testID: 'guest-banner-signin' })).toBeTruthy();
    expect(JSON.stringify(renderer!.toJSON())).toContain('Save unlimited history — create a free account.');
  });

  it('navigates to register when Create account is pressed', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<GuestBanner visible={true} />);
    });

    const button = renderer!.root.findByProps({ testID: 'guest-banner-register' });

    await act(async () => {
      button.props.onPress();
    });

    expect(mockRouter.push).toHaveBeenCalledWith('/auth/register');
  });

  it('navigates to sign-in when Sign in is pressed', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<GuestBanner visible={true} />);
    });

    const button = renderer!.root.findByProps({ testID: 'guest-banner-signin' });

    await act(async () => {
      button.props.onPress();
    });

    expect(mockRouter.push).toHaveBeenCalledWith('/auth/sign-in');
  });
});