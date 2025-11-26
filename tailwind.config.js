import { mtConfig } from "@material-tailwind/react";

module.exports = {
    content: ["./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./node_modules/@material-tailwind/react/**/*.{js,ts,jsx,tsx}"

    ],
    theme: {
        extend: {
            fontFamily: {
                // CORREÇÃO: Movido para dentro da chave fontFamily
                sans: ['Tim Sans', 'JetBrainsMono Nerd Font', 'sans-serif', "IBM Plex Sans", "Inter"],
                mono: ['JetBrainsMono Nerd Font', 'monospace'],
                system: ['Tim Sans', 'JetBrainsMono Nerd Font', 'sans-serif', 'Inter', "IBM Plex Sans"],
            },
        },
    },
    darkMode: "class",
    plugins: [mtConfig({
        fontFamily: {
            sans: ['Tim Sans', 'JetBrainsMono Nerd Font', 'sans-serif', "IBM Plex Sans"],
            body: ['Tim Sans', 'JetBrainsMono Nerd Font', 'sans-serif', "IBM Plex Sans"],
        },
        colors: {
            black: "#030712",
            inherit: "#9CA3AF",
            background: "#030712",
            foreground: "#bac2d1",
            default: {
                default: "#9CA3AF",
                dark: "#F9FAFB",
                light: "#111827",
                foreground: "#E5E7EB"
            },
            surface: {
                default: "#1F2937",
                dark: "#F9FAFB",
                light: "#111827",
                foreground: "#E5E7EB"
            },
            primary: {
                default: "#F3F4F6",
                dark: "#E5E7EB",
                light: "#F9FAFB",
                foreground: "#030712"
            },
            secondary: {
                default: "#1F2937",
                dark: "#111827",
                light: "#374151",
                foreground: "#F9FAFB"
            },
            info: {
                default: "#3B82F6",
                dark: "#60A5FA",
                light: "#2563EB",
                foreground: "#030712"
            },
            success: {
                default: "#22C55E",
                dark: "#16A34A",
                light: "#4ADE80",
                foreground: "#030712"
            },
            warning: {
                default: "#FACC15",
                dark: "#EABC08",
                light: "#FDE047",
                foreground: "#030712"
            },
            error: {
                default: "#EF4444",
                dark: "#DC2626",
                light: "#F87171",
                foreground: "#030712"
            }

        },
        darkColors: {

            background: "#030712",

            foreground: "#9CA3AF",

            surface: {

                default: "#1F2937",

                dark: "#F9FAFB",

                light: "#111827",

                foreground: "#E5E7EB"

            },

            primary: {

                default: "#F3F4F6",

                dark: "#E5E7EB",

                light: "#F9FAFB",

                foreground: "#030712"

            },

            secondary: {

                default: "#1F2937",

                dark: "#111827",

                light: "#374151",

                foreground: "#F9FAFB"

            },

            info: {

                default: "#3B82F6",

                dark: "#60A5FA",

                light: "#2563EB",

                foreground: "#030712"

            },

            success: {

                default: "#22C55E",

                dark: "#16A34A",

                light: "#4ADE80",

                foreground: "#030712"

            },

            warning: {

                default: "#FACC15",

                dark: "#EABC08",

                light: "#FDE047",

                foreground: "#030712"

            },

            error: {

                default: "#EF4444",

                dark: "#DC2626",

                light: "#F87171",

                foreground: "#030712"

            },

        }
    })],
}