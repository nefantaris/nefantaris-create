import { isCancel, select, text } from "@clack/prompts";
import { firstPartyThemes } from "./firstPartyThemes.js";

const exitOnCancel = <Value>(answer: Value | symbol): Value => {
    if (isCancel(answer)) {
        console.log("Cancelled.");
        process.exit(1);
    }
    return answer;
};

export const promptSiteDir = async (): Promise<string> =>
    exitOnCancel(
        await text({
            message: "Where should the site be created?",
            placeholder: "my-site",
            defaultValue: "my-site",
        })
    );

const customThemeChoice = "custom-theme";

export const promptTheme = async (): Promise<string> => {
    const selected = exitOnCancel(
        await select({
            message: "Which theme should the site use?",
            options: [
                ...firstPartyThemes.map((theme) => ({
                    value: theme.name,
                    label: theme.name,
                    hint: theme.hint,
                })),
                {
                    value: customThemeChoice,
                    label: "Custom…",
                    hint: "a git URL or a local path",
                },
            ],
        })
    );
    if (selected !== customThemeChoice) {
        return selected;
    }
    return exitOnCancel(
        await text({
            message: "Git URL or local path to the theme",
            validate: (value) =>
                value === undefined || value.trim() === ""
                    ? "Enter a git URL or a local path"
                    : undefined,
        })
    );
};
