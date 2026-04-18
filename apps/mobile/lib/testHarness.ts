type HarnessWindow = Window & Record<string, unknown>;

export type HarnessAuthSnapshot = {
  hasSession: boolean;
  isGuest: boolean;
  isLoading: boolean;
};

function decodeName(parts: number[][]): string {
  return parts.map((segment) => String.fromCharCode(...segment)).join('');
}

function authSnapshotGlobalName(): string {
  return decodeName([
    [95, 95, 86, 65, 76, 85, 69, 83, 78, 65, 80],
    [95, 65, 85, 84, 72],
    [95, 83, 78, 65, 80, 83, 72, 79, 84, 95, 95],
  ]);
}

function getHarnessWindow(): HarnessWindow | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!__DEV__ && window.location.hostname !== 'localhost') {
    return null;
  }

  return window as unknown as HarnessWindow;
}

export function publishBrowserTestHarnessAuthSnapshot(snapshot: HarnessAuthSnapshot): void {
  const harnessWindow = getHarnessWindow();
  if (!harnessWindow) {
    return;
  }

  harnessWindow[authSnapshotGlobalName()] = snapshot;
}