export interface StorageEntry {
  name: string;
  id: string | null;
}

export interface StorageListClient {
  storage: {
    from: (bucket: string) => {
      list: (
        path: string,
        options: { limit: number; offset: number; sortBy: { column: string; order: "asc" | "desc" } },
      ) => Promise<{ data: StorageEntry[] | null; error: unknown }>;
    };
  };
}

export interface StorageRemoveClient {
  storage: {
    from: (bucket: string) => {
      remove: (paths: string[]) => Promise<{ error: unknown }>;
    };
  };
}

const PAGE_SIZE = 100;
const REMOVE_BATCH_SIZE = 100;

export async function collectUserFiles(admin: StorageListClient, bucket: string, userId: string): Promise<string[]> {
  const files: string[] = [];
  const folders = [userId];

  while (folders.length > 0) {
    const folder = folders.pop()!;
    let offset = 0;

    while (true) {
      const { data, error } = await admin.storage.from(bucket).list(folder, {
        limit: PAGE_SIZE,
        offset,
        sortBy: { column: "name", order: "asc" },
      });

      if (error) throw new Error("storage_list_failed");
      if (!data || data.length === 0) break;

      for (const entry of data) {
        const path = `${folder}/${entry.name}`;
        if (entry.id === null) folders.push(path);
        else files.push(path);
      }

      offset += data.length;
      if (data.length < PAGE_SIZE) break;
    }
  }

  return files;
}

export async function removeUserFiles(admin: StorageRemoveClient, bucket: string, files: string[]): Promise<void> {
  for (let index = 0; index < files.length; index += REMOVE_BATCH_SIZE) {
    const { error } = await admin.storage.from(bucket).remove(files.slice(index, index + REMOVE_BATCH_SIZE));
    if (error) throw new Error("storage_remove_failed");
  }
}
