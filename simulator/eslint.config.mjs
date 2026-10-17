import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  {
      ignores: [
          "**/node_modules/**",
          "**/dist/**",
          "**/docs/imported/**",
          "**/Описание методов API — документация Pioneer February update 2026_files/**",
          "**/tools/scratch/**",
          "**/vendor/**",
          "**/dist/assets/*.js",
          // Snapshots the design plugin keeps of edited files: ignored by git, so CI never sees them.
          "**/.impeccable/**",
          "**/*.min.js"
      ]
  },
  {files: ["**/*.{js,mjs,cjs,ts}"]},
  {languageOptions: { globals: {...globals.browser, ...globals.node} }},
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
      rules: {
          "@typescript-eslint/no-explicit-any": "warn",
          "@typescript-eslint/no-var-requires": "off",
          "no-undef": "off", // TypeScript handles this
          // A leading underscore marks a parameter that is unused on purpose (a fixed callback signature).
          "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
          "no-unused-vars": "off",
          "no-empty": "error",
          "max-lines": ["warn", { max: 300, skipBlankLines: true, skipComments: true }]
      }
  },
  {
      files: ["**/*.cjs"],
      rules: {
          "@typescript-eslint/no-require-imports": "off"
      }
  }
];
