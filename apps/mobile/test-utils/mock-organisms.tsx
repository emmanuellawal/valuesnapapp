import React from 'react';

export function CameraCapture(props: any) {
  return React.createElement('CameraCaptureMock', {
    testID: 'camera-capture',
    onPress: () => props.onPhotoCapture({ uri: 'file://photo.jpg', base64: 'abc123' }),
  });
}

export function FileUpload(props: any) {
  return React.createElement('FileUploadMock', {
    testID: 'file-upload',
    onPress: () => props.onPhotoCapture({ uri: 'file://photo.jpg', base64: 'abc123' }),
  });
}