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
          "**/*.min.js"
      ]
  },
  {files: ["**/*.{js,mjs,cjs,ts}"]},
  {languageOptions: { globals: {...globals.browser, ...globals.node} }},
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
      rules: {
          "@typescript-eslint/no-explicit-any": "off",
          "@typescript-eslint/no-var-requires": "off",
          "no-undef": "off", // TypeScript handles this
          "@typescript-eslint/no-unused-vars": "off",
          "no-unused-vars": "off",
          "no-empty": "off"
      }
  }
];
