import React from 'react';

export function CameraCapture(props: any) {
  const [captureState, setCaptureState] = React.useState('idle');
  const focusTarget = React.useMemo(() => ({ focus: jest.fn() }), []);
  React.useImperativeHandle(props.focusRef, () => focusTarget);

  return React.createElement('CameraCaptureMock', {
    testID: 'camera-capture',
    captureState,
    onPress: () => {
      setCaptureState('captured');
      return props.onPhotoCapture({ uri: 'file://photo.jpg', base64: 'abc123' });
    },
  });
}

export function FileUpload(props: any) {
  const focusTarget = React.useMemo(() => ({ focus: jest.fn() }), []);
  React.useImperativeHandle(props.focusRef, () => focusTarget);

  return React.createElement('FileUploadMock', {
    testID: 'file-upload',
    onPress: () => props.onPhotoCapture({ uri: 'file://photo.jpg', base64: 'abc123' }),
  });
}