import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '../theme/colors';
import { spacing } from '../theme/spacing';

// Sticky button as a normal flex sibling below the scroll area (never absolute).
// Screens using it should wrap their scroll area and this footer in the same
// flex container, allowing the keyboard/layout to move them without overlays.
export const FOOTER_SPACE = spacing.lg;

export default function FixedFooter({ children }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.sm) + spacing.sm }]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    backgroundColor: colors.background,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
