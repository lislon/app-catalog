// This package ships React, so it opts into the shared React rule blocks. They
// live in the root config rather than here so that every React package agrees on
// them; packages with no React deliberately do not import them. Imported through
// the symlink for the same reason `frontend-core` does: a direct `../../` import
// puts a file outside the package's tsconfig `rootDir`.
import rootConfig, { reactConfigs } from './root-symlink.eslint.config.js'

const config = [...rootConfig, ...reactConfigs]

// Annotated, not inferred: without it the inferred type names a path inside
// `node_modules/.pnpm`, which `tsc` rejects as non-portable (TS2742).
export default /** @type {import('eslint').Linter.Config[]} */ (config)
