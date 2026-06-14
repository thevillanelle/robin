/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        rb: {
          bg:      '#0D0F0E',
          surface: '#141917',
          card:    '#1A1E1D',
          border:  '#252B28',
          ink:     '#FAF7F2',
          muted:   '#8B7E72',
          dim:     '#5a5048',
          rose:    '#C4717A',
          lavender:'#A89BC4',
          gold:    '#C8A86B',
        }
      },
    },
  },
  plugins: [],
}
