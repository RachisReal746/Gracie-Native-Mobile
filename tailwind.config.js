/** @type {import('tailwindcss').Config} */
module.exports = {
    // NOTE: Update this to include the paths to all of your component files.
    content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            colors: {
                primary: "#53ABB5",
                secondary: "#F6CEA7",
                background: "#E9ECEF",
                accent: "#2D99A6",
            },
            fontFamily: {
                shadows: ["ShadowsIntoLight"],
                questrial: ["Questrial"],
                biorhyme: ["BioRhyme"],
            },
        },
    },
    plugins: [],
};
