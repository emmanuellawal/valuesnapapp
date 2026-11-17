import React from 'react';
import { View, ScrollView } from 'react-native';

import { Box } from '@/components/primitives';
import { SwissSidebarNav, SwissSidebarItem } from './swiss-sidebar';

export interface AppraisalWorkstationProps {
  railWidth: number;
  navItems: SwissSidebarItem[];
  /**
   * Caller-provided image-pane content, fully owned by the caller.
   *
   * Decision (party-mode 2026-09-04, Story 6.10): this renders the existing
   * `ValuationCard` whole — not a naked `<Image>` — so Museum Mat framing
   * and item identity stay attached to the photo. See Dev Notes in
   * docs/sprint-artifacts/6-10-implement-desktop-ux-patterns.md.
   */
  imagePane: React.ReactNode;
  /** Remaining data-pane content (ConfidenceWarning, SellReadinessReport, Summary, Delete/etc.), fully owned by the caller. */
  children: React.ReactNode;
}

/**
 * AppraisalWorkstation — Desktop three-pane layout for /appraisal.
 *
 * Region split (Story 6.10 AC #1-#3, docs/DESIGN-PHILOSOPHY.md#L318-323):
 * - Rail: SwissSidebarNav, width from `railWidth` (computeRailWidth()).
 * - Image pane: fixed (non-scrolling) `Box`, 50% of remaining width via `flex: 1`.
 * - Data pane: scrollable, 50% of remaining width via `flex: 1`.
 *
 * A 1px `border-divider` separates rail|image and image|data.
 */
export function AppraisalWorkstation({
  railWidth,
  navItems,
  imagePane,
  children,
}: AppraisalWorkstationProps) {
  return (
    <View style={{ flex: 1, flexDirection: 'row' }} testID="appraisal-workstation">
      <SwissSidebarNav items={navItems} railWidth={railWidth} semantics="navigation" />
      <Box
        className="flex-1 items-center justify-center bg-paper"
        testID="appraisal-image-pane"
      >
        <Box className="w-full p-8">{imagePane}</Box>
      </Box>
      <Box className="w-px bg-divider" testID="appraisal-pane-divider" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 32 }}
        testID="appraisal-data-pane"
      >
        {children}
      </ScrollView>
    </View>
  );
}

export default AppraisalWorkstation;
