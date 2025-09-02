/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./src/app/**/*.{ts,tsx}", "./src/components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50:"#f2f8f3",100:"#e5f0e7",200:"#c6dfcb",300:"#a2cda9",400:"#6fb77b",
          500:"#2E7D32",600:"#25642a",700:"#1e5324",800:"#183f1c",900:"#112c14",
        },
      },
    },
  },
  plugins: [],
};
