/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // Enable class-based dark mode
  content: [
    "./index.html",
    "./App.tsx",
    "./index.tsx",
    "./utils.tsx",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // These colors are primarily for the dark theme or can be shared.
        // Light theme will use default Tailwind palette (e.g., gray-100 for bg, gray-800 for text)
        // and dark: prefix for these brand colors.
        'brand-dark': '#1a202c',        // For dark theme gradient
        'brand-surface': '#2d3748',     // dark:bg-brand-surface
        'brand-accent': '#a50515',      // Accent color (can be used in both themes or overridden)
        'brand-accent-hover': '#c1121f',// e.g., dark:hover:bg-brand-accent-hover
        'brand-button': '#6B7280',      // e.g., dark:bg-brand-button
        'brand-button-hover': '#4B5563',// e.g., dark:hover:bg-brand-button-hover
        'brand-text-primary': '#e2e8f0',// e.g., dark:text-brand-text-primary
        'brand-text-secondary': '#a0aec0',// e.g., dark:text-brand-text-secondary
        'brand-border': '#4a5568',      // e.g., dark:border-brand-border
      }
    }
  },
  plugins: [],
}
