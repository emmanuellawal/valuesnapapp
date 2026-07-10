import { Alert, Platform } from 'react-native';

export interface DialogButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

/**
 * Cross-platform alert/confirm. react-native-web's Alert.alert is a no-op.
 */
export function showAlert(
  title: string,
  message?: string,
  buttons: DialogButton[] = [{ text: 'OK' }],
): void {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }

  const body = message ? `${title}\n\n${message}` : title;
  const cancelButton = buttons.find((button) => button.style === 'cancel');
  const primaryButtons = buttons.filter((button) => button.style !== 'cancel');

  if (buttons.length <= 1) {
    window.alert(body);
    buttons[0]?.onPress?.();
    return;
  }

  const confirmed = window.confirm(body);
  if (confirmed) {
    const action = primaryButtons.find((button) => button.style === 'destructive')
      ?? primaryButtons[0];
    action?.onPress?.();
    return;
  }

  cancelButton?.onPress?.();
}
