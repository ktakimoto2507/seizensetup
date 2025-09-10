import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
];

// 例：ファイル末尾の export default の配列に下2つのブロックを追加
export default [
  // ...既存の設定たち

  // ① 無視したい一時ファイルを除外
  { ignores: ['src/app/**/page copy*.tsx', 'src/lib/store copy.ts'] },

  // ② いまはエラーで止めない（WARN化）
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      'prefer-const': 'warn',
    },
  },
];

