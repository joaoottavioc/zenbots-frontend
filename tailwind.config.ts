// tailwind.config.ts
import type { Config } from "tailwindcss"
import { fontFamily } from "tailwindcss/defaultTheme";
import tailwindcssAnimate from "tailwindcss-animate";

const config = {

  content: [
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
  	container: {
  		center: true,
  		padding: '2rem',
  		screens: {
  			'2xl': '1400px'
  		}
  	},
  	extend: {
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'steam-1': 'steam-1 2.5s ease-out infinite',
  			'steam-2': 'steam-2 3s ease-out 0.5s infinite',
  			'steam-3': 'steam-3 2s ease-out 1s infinite',
  			'sizzle-1': 'sizzle-1 0.8s ease-out infinite',
  			'sizzle-2': 'sizzle-2 1.1s ease-out 0.3s infinite',
  			'sizzle-3': 'sizzle-3 0.9s ease-out 0.6s infinite',
  			'z-rider': 'z-rider-pulse 1.5s ease-in-out infinite',
  			'float': 'float 6s ease-in-out infinite',
  			'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
  			'trace': 'trace 3s linear infinite',
  			'fade-in': 'fade-in 0.8s ease-out forwards',
  			'fade-in-up': 'fade-in-up 0.8s ease-out forwards',
  			'slide-in-left': 'slide-in-left 0.8s ease-out forwards',
  			'slide-in-right': 'slide-in-right 0.8s ease-out forwards',
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		colors: {
  			brand: {
  				nav: '#0f172a',
  				whatsapp: '#25D366',
  				'whatsapp-hover': '#128C7E',
  				mercadopago: '#009EE3',
  				'mercadopago-hover': '#008CC9',
  			},
  			surface: {
  				DEFAULT: '#0f172a',
  				light: '#1e293b',
  				lighter: '#334155',
  			},
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
		fontFamily: {
      		sans: ["var(--font-inter)", ...fontFamily.sans],
      		heading: ["var(--font-outfit)", ...fontFamily.sans],
      		logo: ["var(--font-space-grotesk)", ...fontFamily.sans],
    	},
  	}
  },
  plugins: [tailwindcssAnimate],
} satisfies Config

export default config