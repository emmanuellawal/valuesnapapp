import * as React from 'react';
import renderer, { act } from 'react-test-renderer';

import { MonoText } from '../StyledText';

it(`renders correctly`, async () => {
  let tree;
  let testRenderer;

  await act(async () => {
    testRenderer = renderer.create(<MonoText>Snapshot test!</MonoText>);
  });

  tree = testRenderer.toJSON();

  await act(async () => {
    testRenderer.unmount();
  });

  expect(tree).toMatchSnapshot();
});
