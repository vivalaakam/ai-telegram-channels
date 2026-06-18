import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ['node_modules', 'dist'],
    rules: {
      // ponytail: tdl.invoke() returns untyped TDLib objects — any is unavoidable
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
)
