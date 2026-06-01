import { useWindowDimensions } from 'react-native';
import { getGridConfig } from '@/constants/breakpoints';
export type { GridConfig } from '@/constants/breakpoints';

export function useGridColumns() {
  const { width } = useWindowDimensions();
  return getGridConfig(width);
}
