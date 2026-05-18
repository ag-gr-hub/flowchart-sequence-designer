import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { 'react-hooks': reactHooks },
    rules: {
      // React hooks — exhaustive-deps as warning (not error) since some patterns are intentional
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // Allow unused vars prefixed with _
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // Allow explicit any in a few places (we already cleaned most)
      '@typescript-eslint/no-explicit-any': 'warn',
      // Don't force return types on every function
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      // Allow non-null assertions (we use them sparingly and intentionally)
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  {
    ignores: ['dist/', 'demo/', 'node_modules/', '*.config.*'],
  }
);
