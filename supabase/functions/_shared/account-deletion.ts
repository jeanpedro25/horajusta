import { collectUserFiles, removeUserFiles, type StorageListClient, type StorageRemoveClient } from './storage-cleanup.ts';

type StorageListing = ReturnType<StorageListClient['storage']['from']>;
type StorageRemoving = ReturnType<StorageRemoveClient['storage']['from']>;

interface AccountDeletionStorageClient {
  storage: {
    from: (bucket: string) => StorageListing & StorageRemoving;
  };
  from: (table: 'profiles') => {
    update: (values: { account_deletion_pending: boolean }) => {
      eq: (column: 'id', value: string) => {
        select: (columns: 'id') => {
          maybeSingle: () => PromiseLike<{ data: { id: string } | null; error: unknown }>;
        };
      };
    };
  };
  rpc: (name: string, args: { target_user_id: string }) => PromiseLike<{ error: unknown }>;
}

async function setDeletionPending(admin: AccountDeletionStorageClient, userId: string, pending: boolean) {
  const { data, error } = await admin.from('profiles')
    .update({ account_deletion_pending: pending })
    .eq('id', userId)
    .select('id')
    .maybeSingle();

  if (error || !data) throw new Error(pending ? 'account_deletion_lock_failed' : 'account_deletion_unlock_failed');
}

/** Delete identity/data only after all user-owned files have been inventoried and removed. */
export async function deleteAccountData(
  admin: AccountDeletionStorageClient,
  bucket: string,
  userId: string,
): Promise<void> {
  await setDeletionPending(admin, userId, true);

  try {
    const files = await collectUserFiles(admin, bucket, userId);
    await removeUserFiles(admin, bucket, files);

    const { error } = await admin.rpc('delete_my_account', { target_user_id: userId });
    if (error) throw new Error('account_delete_failed');
  } catch (error) {
    // If deletion fails, restore uploads where possible; a failed unlock remains retryable.
    await setDeletionPending(admin, userId, false).catch(() => {
      throw new Error('account_deletion_recovery_required');
    });
    throw error;
  }
}
