import { mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const withTempDir = async (
    run: (tempDir: string) => Promise<void>
): Promise<void> => {
    const tempDir = await realpath(
        await mkdtemp(join(tmpdir(), "create-nefantaris-"))
    );
    try {
        await run(tempDir);
    } finally {
        await rm(tempDir, { recursive: true, force: true });
    }
};
