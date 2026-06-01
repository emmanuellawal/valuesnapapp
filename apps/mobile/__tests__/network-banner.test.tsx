import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';

import { NetworkBanner } from '@/components/molecules/network-banner';

describe('NetworkBanner', () => {
  it('renders null when errorType is not NETWORK_ERROR', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<NetworkBanner errorType="GENERIC_ERROR" isOnline={true} />);
    });

    expect(renderer!.toJSON()).toBeNull();
  });

  it('renders offline message when network error and offline', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<NetworkBanner errorType="NETWORK_ERROR" isOnline={false} />);
    });

    expect(renderer!.root.findByProps({ children: 'Offline — request queued' })).toBeTruthy();
  });

  it('renders online retry prompt when network error and online', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<NetworkBanner errorType="NETWORK_ERROR" isOnline={true} />);
    });

    expect(renderer!.root.findByProps({ children: 'Tap Retry to submit your request' })).toBeTruthy();
  });

  it('updates banner copy when connectivity changes while keeping NETWORK_ERROR', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<NetworkBanner errorType="NETWORK_ERROR" isOnline={true} />);
    });

    expect(renderer!.root.findByProps({ children: 'Tap Retry to submit your request' })).toBeTruthy();

    await act(async () => {
      renderer!.update(<NetworkBanner errorType="NETWORK_ERROR" isOnline={false} />);
    });

    expect(renderer!.root.findByProps({ children: 'Offline — request queued' })).toBeTruthy();
  });
});
