import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginPrettier from "eslint-plugin-prettier/recommended";

export default [
  {
    ignores: [
      "dist/**/*",
      "node_modules/**/*",
      "*.config.js",
      "*.config.mjs",
      "*.d.ts",
      "coverage/**/*",
      "docs/**/*"
    ],
  },
  {
    files: ["**/*.{js,mjs,cjs,ts}"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    settings: {
      "import/resolver": {
        typescript: {},
      },
    },
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // 基础规则 - 宽松设置
      "no-console": "warn",
      "no-debugger": "warn",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-undef": "error",
      
      // TypeScript 规则 - 宽松设置
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/ban-ts-comment": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/no-var-requires": "warn",
      
      // 代码风格规则 - 宽松设置
      "indent": ["off"],
      "quotes": ["off"],
      "semi": ["off"],
      "no-multi-spaces": "warn",
      "no-trailing-spaces": "warn",
      "eol-last": ["warn", "always"],
      
      // 最佳实践规则 - 宽松设置
      "no-else-return": "warn",
      "no-extra-bind": "warn",
      "no-implicit-coercion": "warn",
      "no-lone-blocks": "warn",
      "no-loop-func": "warn",
      
      // Prettier 集成
      "prettier/prettier": "warn"
    },
  },
  pluginPrettier
];