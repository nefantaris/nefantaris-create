import { CreateNefantarisError } from "./CreateNefantarisError.js";
import { captureCommand } from "./run.js";

const gitEnvironment = { GIT_TERMINAL_PROMPT: "0" };
const releaseTagPattern = /^v?(\d+)\.(\d+)\.(\d+)$/;
const fullShaPattern = /^[0-9a-f]{40}$/;
const tagRefPrefix = "refs/tags/";

type ReleaseTag = { name: string; parts: number[] };

const releaseTagFrom = (name: string): ReleaseTag | undefined => {
    const match = releaseTagPattern.exec(name);
    return match ? { name, parts: match.slice(1).map(Number) } : undefined;
};

const compareReleaseTags = (first: ReleaseTag, second: ReleaseTag): number => {
    for (let index = 0; index < first.parts.length; index += 1) {
        const difference = first.parts[index] - second.parts[index];
        if (difference !== 0) {
            return difference;
        }
    }
    return 0;
};

export const newestReleaseTag = (tagNames: string[]): string | undefined =>
    tagNames
        .map(releaseTagFrom)
        .filter((tag): tag is ReleaseTag => tag !== undefined)
        .sort((first, second) => compareReleaseTags(second, first))[0]?.name;

const listRemote = async (
    label: string,
    url: string,
    args: string[]
): Promise<string[][]> => {
    const result = await captureCommand(
        "git",
        ["ls-remote", ...args],
        process.cwd(),
        gitEnvironment
    );
    if (result.exitCode !== 0) {
        throw new CreateNefantarisError(
            `Could not reach ${label} ${url}:\n${result.stderr.trim()}`
        );
    }
    return result.stdout
        .split("\n")
        .map((line) => line.split("\t"))
        .filter((parts) => parts.length === 2);
};

const remoteTagNames = async (label: string, url: string): Promise<string[]> =>
    (await listRemote(label, url, ["--tags", "--refs", url]))
        .map(([, ref]) => ref)
        .filter((ref) => ref.startsWith(tagRefPrefix))
        .map((ref) => ref.slice(tagRefPrefix.length));

const remoteHeadSha = async (label: string, url: string): Promise<string> => {
    const [head] = await listRemote(label, url, [url, "HEAD"]);
    const sha = head?.[0];
    if (sha === undefined || !fullShaPattern.test(sha)) {
        throw new CreateNefantarisError(
            `${label} ${url} has no release tag and no commit on its default branch, so there is nothing to pin`
        );
    }
    return sha;
};

export const resolvePinnedVersion = async (
    label: string,
    url: string
): Promise<string> =>
    newestReleaseTag(await remoteTagNames(label, url)) ??
    remoteHeadSha(label, url);
