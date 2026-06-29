/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#5C3317",
        secondary: "#A0673A",
        alternative: "#CFAC8C",
        background: "#F5EDE3",
        "background-alt": "#FFFCF7",
        action: "#4F8A7B",
        "action-dark": "#3F6E7A",
        text: "#4A4A4A",
        divider: "#E9E9E9",
      },
      fontFamily: {
        montserrat: ["Montserrat", "sans-serif"],
        "century-gothic": ["Century Gothic", "Century", "sans-serif"],
        inter: ["Inter", "sans-serif"],
        quicksand: ["Quicksand", "sans-serif"],
      },
      letterSpacing: {
        heading: "-0.04em",
        agenda: "-0.03em",
        body: "-0.02em",
      },
      fontSize: {
        "5xl-figma": ["3rem", { lineHeight: "1" }],
        "agenda-num": ["3.5rem", { lineHeight: "1" }],
      },
    },
  },
  plugins: [],
};
