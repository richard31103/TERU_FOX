/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './index.html',
        './src/**/*.{js,jsx,ts,tsx}'
    ],
    prefix: 'tw-',
    corePlugins: {
        preflight: false
    },
    theme: {
        extend: {
            colors: {
                tower: {
                    ink: '#0f172a',
                    panel: '#131c2f',
                    line: '#334155',
                    glow: '#22d3ee'
                }
            }
        }
    },
    plugins: []
};
