import { useMemo } from 'react';
import { useIsDark } from './useSystemTheme.js';

/**
 * Resolves the editor's effective theme tokens by merging the active
 * built-in palette with any caller-supplied `themeOverrides`. Both editors
 * accept light/dark/auto plus arbitrary partial overrides; this hook
 * centralizes the merge so the logic stays identical across editors and the
 * memoization key (isDark + overrides) is uniform.
 *
 * Generic over `T` so it works with `ThemeColors` (DiagramEditor) and
 * `SequenceThemeColors` (SequenceEditor) without duplication.
 *
 * @example
 *   const { t, isDark } = useEditorTheme(theme, themeOverrides, { light: lightTheme, dark: darkTheme });
 */
export function useEditorTheme<T>(
  theme: 'light' | 'dark' | 'auto',
  overrides: Partial<T> | undefined,
  palettes: { light: T; dark: T },
): { t: T; isDark: boolean } {
  const isDark = useIsDark(theme);
  const t = useMemo<T>(
    () => ({ ...(isDark ? palettes.dark : palettes.light), ...(overrides ?? {}) }),
    // palettes is a stable module-level constant in every caller, so it is
    // deliberately omitted from the dep array to keep the memo key tight.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isDark, overrides],
  );
  return { t, isDark };
}
