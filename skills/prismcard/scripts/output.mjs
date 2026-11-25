import { constants } from 'node:fs';
import { copyFile, mkdir, mkdtemp, open, readdir, rename, rmdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';

const cardFile = /^card-\d{2,}\.png$/;

export async function writeDeck(output, names, overwrite, generate) {
  await mkdir(output, { recursive: true });
  const lockPath = join(output, '.prismcard.lock');
  const lock = await open(lockPath, 'wx').catch(error => {
    if (error.code === 'EEXIST') throw new Error(`The output directory is locked by another render: ${output}`);
    throw error;
  });
  let staging;
  let preserveBackups = false;
  const backups = new Map();
  const published = [];

  try {
    const wanted = new Set(names);
    const existing = (await readdir(output, { withFileTypes: true }))
      .filter(entry => wanted.has(entry.name) || (overwrite && cardFile.test(entry.name)));
    for (const entry of existing) {
      const path = join(output, entry.name);
      if (!overwrite) throw new Error(`Output file already exists: ${path}. Re-run with --overwrite (-f) to replace it.`);
      if (!entry.isFile()) throw new Error(`Expected a regular output file to overwrite: ${path}`);
    }

    staging = await mkdtemp(join(output, '.prismcard-'));
    await generate(staging);
    for (const { name } of existing) {
      const path = join(output, name);
      const backup = join(staging, `previous-${name}`);
      await rename(path, backup);
      backups.set(path, backup);
    }
    for (const name of names) {
      const path = join(output, name);
      await copyFile(join(staging, name), path, constants.COPYFILE_EXCL);
      published.push(path);
    }
  } catch (error) {
    const undoFiles = await Promise.allSettled(published.map(path => unlink(path)));
    const restoreFiles = await Promise.allSettled([...backups].map(([path, backup]) => {
      // Restore only into an empty destination to preserve files created by another process.
      return copyFile(backup, path, constants.COPYFILE_EXCL);
    }));
    if ([...undoFiles, ...restoreFiles].some(result => result.status === 'rejected')) {
      preserveBackups = true;
      throw new Error(`${error.message} Recovery was incomplete. Staged files are in ${staging}.`, { cause: error });
    }
    throw error;
  } finally {
    try {
      if (staging && !preserveBackups) {
        for (const name of await readdir(staging)) await unlink(join(staging, name));
        await rmdir(staging);
      }
    } finally {
      await lock.close();
      await unlink(lockPath);
    }
  }
}
