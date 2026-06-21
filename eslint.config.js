import js from '@eslint/js'
import tseslint from 'typescript-eslint'

const MAX_FILE_LINES = 200

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
  {
    files: ['packages/*/src/**/*.ts', 'packages/*/tests/**/*.ts'],
    rules: {
      'max-lines': ['error', { max: MAX_FILE_LINES, skipBlankLines: true, skipComments: true }],
    },
  },
)