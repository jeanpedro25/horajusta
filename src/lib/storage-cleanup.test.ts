import { describe, expect, it } from 'vitest';
import {
  collectUserFiles,
  removeUserFiles,
  type StorageEntry,
  type StorageListClient,
  type StorageRemoveClient,
} from '../../supabase/functions/_shared/storage-cleanup';

function makeStorage(entriesByPath: Record<string, StorageEntry[] | Error>): StorageListClient {
  return {
    storage: {
      from: () => ({
        list: async (path, { limit, offset }) => {
          const entries = entriesByPath[path];
          if (entries instanceof Error) return { data: null, error: entries };
          return { data: (entries ?? []).slice(offset, offset + limit), error: null };
        },
      }),
    },
  };
}

function makeRemover(failAtCall = -1) {
  const batches: string[][] = [];
  const admin: StorageRemoveClient = {
    storage: {
      from: () => ({
        remove: async (paths) => {
          batches.push(paths);
          return { error: batches.length === failAtCall ? new Error('storage unavailable') : null };
        },
      }),
    },
  };
  return { admin, batches };
}

describe('collectUserFiles', () => {
  it('returns files in the account folder and nested folders, never folder markers', async () => {
    const admin = makeStorage({
      'user-1': [
        { name: 'one.pdf', id: 'file-1' },
        { name: 'nested', id: null },
      ],
      'user-1/nested': [{ name: 'two.png', id: 'file-2' }],
    });

    await expect(collectUserFiles(admin, 'atestados', 'user-1')).resolves.toEqual([
      'user-1/one.pdf',
      'user-1/nested/two.png',
    ]);
  });

  it('reads every page when a user has more than 100 files', async () => {
    const entries = Array.from({ length: 205 }, (_, index) => ({ name: `${index}.pdf`, id: `id-${index}` }));
    const admin = makeStorage({ 'user-1': entries });

    const files = await collectUserFiles(admin, 'atestados', 'user-1');
    expect(files).toHaveLength(205);
    expect(files[0]).toBe('user-1/0.pdf');
    expect(files[204]).toBe('user-1/204.pdf');
  });

  it('fails closed when listing an account folder fails', async () => {
    const admin = makeStorage({ 'user-1': new Error('storage unavailable') });

    await expect(collectUserFiles(admin, 'atestados', 'user-1')).rejects.toThrow('storage_list_failed');
  });

  it('returns an empty list when the user has no attachments', async () => {
    await expect(collectUserFiles(makeStorage({}), 'atestados', 'user-1')).resolves.toEqual([]);
  });

  it('removes all files in batches of at most 100', async () => {
    const { admin, batches } = makeRemover();
    const files = Array.from({ length: 205 }, (_, index) => `user-1/${index}.pdf`);

    await expect(removeUserFiles(admin, 'atestados', files)).resolves.toBeUndefined();
    expect(batches.map(batch => batch.length)).toEqual([100, 100, 5]);
  });

  it('stops and reports failure if any removal batch fails', async () => {
    const { admin, batches } = makeRemover(2);
    const files = Array.from({ length: 205 }, (_, index) => `user-1/${index}.pdf`);

    await expect(removeUserFiles(admin, 'atestados', files)).rejects.toThrow('storage_remove_failed');
    expect(batches).toHaveLength(2);
  });
});
