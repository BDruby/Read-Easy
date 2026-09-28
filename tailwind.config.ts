import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        parchment: {
          50: '#FAF8F5',
          100: '#F5F0E8',
          200: '#EADFCF',
          300: '#DECDB5',
          400: '#CEB694',
          500: '#BF9E73',
          600: '#A47E53',
          700: '#84613C',
          800: '#5F4428',
          900: '#3D2A18',
        },
        bamboo: {
          50: '#F4F7F4',
          100: '#E7EFE6',
          200: '#CFDFC9',
          300: '#AFCBA4',
          400: '#89B07B',
          500: '#689458',
          600: '#507643',
          700: '#3E5C34',
          800: '#2D4126',
          900: '#1C2918',
        },
        ink: {
          50: '#F5F5F7',
          100: '#E5E5EA',
          200: '#D1D1D6',
          300: '#AEAEB2',
          400: '#8E8E93',
          500: '#636366',
          600: '#48484A',
          700: '#3A3A3C',
          800: '#2C2C2E',
          900: '#1C1C1E',
          950: '#0F0F10',
        },
        amberwarm: {
          50: '#FFFDF9',
          100: '#FDF7EB',
          200: '#F9ECD2',
          300: '#F3DCAD',
          400: '#E9C37B',
          500: '#DC9B3C',
          600: '#BA7A29',
        }
      },
      fontFamily: {
        serif: ['"Songti SC"', '"Noto Serif SC"', '"Source Han Serif SC"', 'SimSun', 'STSong', 'Georgia', 'serif'],
        kaiti: ['"Kaiti SC"', '"STKaiti"', '"KaiTi"', '"Noto Serif SC"', 'serif'],
        sans: ['"PingFang SC"', '"Hiragino Sans GB"', '"Microsoft YaHei"', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.03)',
        'float': '0 20px 40px -15px rgba(0, 0, 0, 0.15)',
        'reader': '0 8px 30px rgba(0,0,0,0.06)',
      }
    },
  },
  plugins: [],
};
export default config;
