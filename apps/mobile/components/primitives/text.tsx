import React from 'react';
import { Text as RNText, TextProps as RNTextProps } from 'react-native';

/** Typography variants matching Swiss Minimalist design tokens */
export type TextVariant = 'display' | 'h1' | 'h2' | 'h3' | 'body' | 'caption';

/**
 * TextProps interface for typography with semantic variants.
 * Extends React Native TextProps with variant and className support.
 */
export interface TextProps extends RNTextProps {
  /** Typography variant (default: 'body') */
  variant?: TextVariant;
  /** NativeWind className for additional styling (color overrides, etc.) */
  className?: string;
}

/**
 * Maps variant to NativeWind typography class.
 * Typography scale from Story 0.2:
 * - display: 48px, bold (hero prices)
 * - h1: 32px, bold (page titles)
 * - h2: 24px, semibold (section headers)
 * - h3: 20px, semibold (card titles)
 * - body: 16px, regular (body text) ← DEFAULT
 * - caption: 12px, regular (labels)
 */
const variantClassMap: Record<TextVariant, string> = {
  display: 'text-display',
  h1: 'text-h1',
  h2: 'text-h2',
  h3: 'text-h3',
  body: 'text-body',
  caption: 'text-caption',
};

/**
 * Maps variant to accessibility role.
 * h1, h2, h3 → 'header' (semantic heading)
 * display, body, caption → 'text' (generic text)
 */
const variantAccessibilityRoleMap: Record<TextVariant, 'header' | 'text'> = {
  display: 'text',
  h1: 'header',
  h2: 'header',
  h3: 'header',
  body: 'text',
  caption: 'text',
};

/**
 * Validates variant, defaults to 'body' if invalid.
 */
function getValidVariant(variant: string | undefined): TextVariant {
  if (variant === undefined) return 'body';
  const validVariants: TextVariant[] = ['display', 'h1', 'h2', 'h3', 'body', 'caption'];
  return validVariants.includes(variant as TextVariant)
    ? (variant as TextVariant)
    : 'body';
}

/**
 * Text - Typography component with semantic variants.
 *
 * Provides consistent typography styling using Swiss Minimalist design tokens.
 * Always applies text-ink color by default (can override with className).
 * Includes appropriate accessibility role based on variant.
 *
 * @example
 * ```tsx
 * <Text variant="h1">Page Title</Text>
 * <Text variant="body">Normal text</Text>
 * <Text variant="caption" className="text-ink-muted">Hint text</Text>
 * ```
 *
 * @see Story 0.3: Create Primitive Components
 */
export function Text({
  variant,
  className,
  children,
  accessibilityRole,
  ...props
}: TextProps) {
  const validVariant = getValidVariant(variant);
  const variantClass = variantClassMap[validVariant];
  const role = accessibilityRole ?? variantAccessibilityRoleMap[validVariant];

  // Combine variant class, default ink color, and any additional className
  // Default to text-ink, but className color classes will override it (NativeWind specificity)
  // Order: variant class first, then default color, then user overrides (last wins)
  const combinedClassName = [variantClass, 'text-ink', className]
    .filter(Boolean)
    .join(' ');

  return (
    <RNText
      className={combinedClassName}
      accessibilityRole={role}
      {...props}
    >
      {children}
    </RNText>
  );
}

export default Text;

