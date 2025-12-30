/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  // Safelist para classes dinâmicas que podem ser geradas em runtime
  safelist: [
    // Cores de status/badges
    { pattern: /bg-(red|green|blue|yellow|orange|purple|pink|gray|slate|emerald|amber|indigo|violet|teal|cyan)-(50|100|200|300|400|500|600|700|800|900)/ },
    { pattern: /text-(red|green|blue|yellow|orange|purple|pink|gray|slate|emerald|amber|indigo|violet|teal|cyan)-(50|100|200|300|400|500|600|700|800|900)/ },
    { pattern: /border-(red|green|blue|yellow|orange|purple|pink|gray|slate|emerald|amber|indigo|violet|teal|cyan)-(50|100|200|300|400|500|600|700|800|900)/ },
    // Opacidades
    { pattern: /opacity-(0|5|10|20|25|30|40|50|60|70|75|80|90|95|100)/ },
    // Z-index
    { pattern: /z-(0|10|20|30|40|50|60|70|80|90|100)/ },
  ],
}
