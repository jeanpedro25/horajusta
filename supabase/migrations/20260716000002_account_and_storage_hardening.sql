-- Safe account RPC grants and storage limits. Existing objects are not deleted or rewritten.

REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;

UPDATE storage.buckets
SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
WHERE id = 'atestados';

COMMENT ON FUNCTION public.delete_my_account() IS 'Authenticated self-service deletion. Storage cleanup must run through the application deletion workflow.';
