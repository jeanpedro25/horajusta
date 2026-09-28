-- Stop authenticated clients from adding new attachment objects while account
-- deletion inventories/removes the user's Storage prefix.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_deletion_pending BOOLEAN NOT NULL DEFAULT false;

REVOKE UPDATE (account_deletion_pending)
  ON public.profiles FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Users can upload atestados" ON storage.objects;
CREATE POLICY "Users can upload atestados"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'atestados'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  AND EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    WHERE profile.id = (SELECT auth.uid())
      AND profile.account_deletion_pending IS FALSE
  )
);
