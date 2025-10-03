import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    ...tseslint.configs.strict,
    ...tseslint.configs.stylistic,
    {
        ignores: ["dist/**", "node_modules/**"],
    },
    {
        languageOptions: {
            globals: {
                // Browser globals
                window: "readonly",
                document: "readonly",
                KeyboardEvent: "readonly",
                FocusEvent: "readonly",
                MouseEvent: "readonly",
                Event: "readonly",
                HTMLElement: "readonly",
                HTMLInputElement: "readonly",
                HTMLTextAreaElement: "readonly",
                console: "readonly",
                setTimeout: "readonly",
                URLSearchParams: "readonly",
                // Tampermonkey globals
                GM_info: "readonly",
                // Vitest globals
                describe: "readonly",
                it: "readonly",
                expect: "readonly",
                beforeEach: "readonly",
                afterEach: "readonly",
                vi: "readonly",
            },
        },
        rules: {
            "@typescript-eslint/no-non-null-assertion": "off",
            "no-case-declarations": "off",
            "@typescript-eslint/no-empty-object-type": "off",
        },
    },
);
