import { describe, expect, it, vi } from 'vitest';
import { deleteAccountData } from './account-deletion';

function clients({ listError = false, removeError = false, rpcError = false, lockError = false, unlockError = false } = {}) {
  const rpc = vi.fn(async () => ({ error: rpcError ? new Error('rpc failed') : null }));
  const remove = vi.fn(async () => ({ error: removeError ? new Error('remove failed') : null }));
  const list = vi.fn(async () => ({
    data: listError ? null : [{ name: 'document.pdf', id: 'object-id' }],
    error: listError ? new Error('list failed') : null,
  }));
  const lifecycleUpdates: boolean[] = [];
  const from = vi.fn(() => ({
    update: vi.fn(({ account_deletion_pending }: { account_deletion_pending: boolean }) => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          maybeSingle: vi.fn(async () => {
            const error = (lockError && account_deletion_pending) || (unlockError && !account_deletion_pending)
              ? new Error('profile update failed')
              : null;
            if (!error) lifecycleUpdates.push(account_deletion_pending);
            return { data: error ? null : { id: 'user-id' }, error };
          }),
        })),
      })),
    })),
  }));
  return {
    storageAdmin: { storage: { from: () => ({ list, remove }) }, from, rpc },
    list,
    remove,
    rpc,
    lifecycleUpdates,
  };
}

describe('deleteAccountData', () => {
  it('removes all user files before calling the self-delete RPC', async () => {
    const mock = clients();
    await deleteAccountData(mock.storageAdmin, 'atestados', 'user-id');
    expect(mock.lifecycleUpdates).toEqual([true]);
    expect(mock.remove).toHaveBeenCalledWith(['user-id/document.pdf']);
    expect(mock.rpc).toHaveBeenCalledWith('delete_my_account', { target_user_id: 'user-id' });
    expect(mock.remove.mock.invocationCallOrder[0]).toBeLessThan(mock.rpc.mock.invocationCallOrder[0]);
  });

  it('does not call the account-delete RPC when file inventory fails', async () => {
    const mock = clients({ listError: true });
    await expect(deleteAccountData(mock.storageAdmin, 'atestados', 'user-id')).rejects.toThrow();
    expect(mock.lifecycleUpdates).toEqual([true, false]);
    expect(mock.rpc).not.toHaveBeenCalled();
  });

  it('does not call the account-delete RPC when file removal fails', async () => {
    const mock = clients({ removeError: true });
    await expect(deleteAccountData(mock.storageAdmin, 'atestados', 'user-id')).rejects.toThrow();
    expect(mock.lifecycleUpdates).toEqual([true, false]);
    expect(mock.rpc).not.toHaveBeenCalled();
  });

  it('reports an RPC failure so the user can retry after idempotent storage cleanup', async () => {
    const mock = clients({ rpcError: true });
    await expect(deleteAccountData(mock.storageAdmin, 'atestados', 'user-id')).rejects.toThrow('account_delete_failed');
    expect(mock.lifecycleUpdates).toEqual([true, false]);
    expect(mock.remove).toHaveBeenCalledOnce();
    expect(mock.rpc).toHaveBeenCalledOnce();
  });

  it('does not inspect or remove files if the upload lock cannot be set', async () => {
    const mock = clients({ lockError: true });
    await expect(deleteAccountData(mock.storageAdmin, 'atestados', 'user-id')).rejects.toThrow('account_deletion_lock_failed');
    expect(mock.list).not.toHaveBeenCalled();
    expect(mock.remove).not.toHaveBeenCalled();
    expect(mock.rpc).not.toHaveBeenCalled();
  });

  it('reports when recovery cannot release the upload lock after a failure', async () => {
    const mock = clients({ listError: true, unlockError: true });
    await expect(deleteAccountData(mock.storageAdmin, 'atestados', 'user-id'))
      .rejects.toThrow('account_deletion_recovery_required');
    expect(mock.rpc).not.toHaveBeenCalled();
  });
});
