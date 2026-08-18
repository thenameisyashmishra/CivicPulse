import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      {
        plugins: { "react-hooks": reactHooks },
        rules: reactHooks.configs.recommended.rules,
      },
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
  },
  {
    // shadcn/ui primitives legitimately co-export a component and a
    // variants/helper function from the same file; this is the standard
    // shadcn pattern and not something to "fix" in generated library code.
    files: ["src/components/ui/**/*.{ts,tsx}", "src/contexts/**/*.{ts,tsx}"],
    rules: {
      "react-refresh/only-export-components": "off",
      // shadcn/ui vendored primitives predate the newer React-Compiler-
      // readiness rules (purity, set-state-in-effect); relaxed here only
      // for generated library code, not for app-owned components/hooks.
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    // Generic wrapper hooks (e.g. a variadic persistFn) legitimately accept
    // arbitrary argument/return shapes.
    files: ["src/hooks/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
]);
