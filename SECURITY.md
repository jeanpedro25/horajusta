# Segurança

## Ação imediata

Uma URL PostgreSQL com credencial de proprietário esteve versionada em `push_db.cjs` desde o histórico inicial do repositório. O arquivo foi removido, mas o segredo continua recuperável no histórico Git.

Antes de qualquer nova implantação:

1. Rotacione a senha do banco no Supabase.
2. Revogue conexões antigas quando aplicável.
3. Revise logs de banco, usuários/roles, funções, extensões e alterações inesperadas.
4. Verifique Vercel, GitHub Actions, máquinas de colaboradores e outros locais que possam conter a URL antiga.
5. Planeje a remoção do segredo do histórico Git separadamente; isso exige coordenação com todos os clones.

Apagar o arquivo ou alterar `.gitignore` não resolve sozinho a exposição anterior.

## Controles implementados

- Papéis administrativos em schema privado.
- RPCs administrativas somente leitura e com autorização no servidor.
- Bloqueio de alterações client-side em campos de plano, vencimento, pagamento e criação do perfil.
- Ledger idempotente para eventos Mercado Pago.
- Webhook com segredo obrigatório, janela contra replay e validação de valor, moeda e recebedor.
- Revogação de acesso em eventos de reembolso, chargeback e cancelamento.
- Exportações PRO verificadas nas Edge Functions.
- Exclusão de conta pela Edge Function `delete-account`: valida a sessão, remove anexos do usuário no bucket privado e só então chama a RPC de exclusão. Falhas de Storage impedem a exclusão da conta.
- A migração `20260922000000_harden_definer_search_paths.sql` remove a RPC legada `delete_my_account()` executável por `authenticated`; a nova assinatura UUID só concede execução a `service_role`, chamada pela Edge Function após limpeza da Storage. `SECURITY DEFINER` usa `search_path` vazio e referências qualificadas.
- Bucket privado com limite de 10 MB e tipos MIME permitidos.
- Cabeçalhos de segurança na Vercel e CSP inicialmente em modo Report-Only.

## Verificações manuais no Supabase

- Confirmar RLS e grants reais em todas as tabelas.
- Confirmar que `authenticated` não consegue atualizar `profiles.is_pro`, `profiles.plano`, `profiles.plano_vencimento`, `profiles.plano_payment_id`, `profiles.subscription_status` ou `profiles.created_at`.
- Confirmar que usuário comum recebe erro ao chamar RPCs `admin_*`.
- Após a nova migração no Preview, confirmar que `authenticated` não tem EXECUTE em `public.delete_my_account(uuid)`, `service_role` tem EXECUTE e a assinatura antiga sem argumentos não existe.
- Confirmar que `delete-account` usa `service_role` somente após validar o bearer token do usuário e concluir inventário/remoção da Storage.
- Confirmar que somente UUIDs em `private.user_roles` recebem `true` de `public.is_admin()`.
- Confirmar proteção contra senhas vazadas, CAPTCHA/rate limit e allowlist de redirects OAuth.
- Confirmar separação de variáveis entre Vercel Production, Preview e Development.

## Riscos restantes

- A Edge Function `delete-account` ainda precisa ser implantada e testada no projeto Supabase real. Se a remoção de Storage funcionar e a RPC falhar, a conta permanece ativa sem esses anexos; repetir a solicitação é seguro. Planejar reconciliação operacional para falhas persistentes.
- O histórico de edições existente não é uma trilha inviolável gerada integralmente pelo banco.
- A CSP está em Report-Only para evitar quebra de OAuth, Supabase, downloads e Mercado Pago. Analise os relatórios antes de torná-la obrigatória.
- Migrações locais não provam o estado do banco hospedado. Faça sempre comparação de schema e backup.
- O ledger começa vazio; receita histórica precisa ser reconciliada com o Mercado Pago.
- Dependências devem ser revisadas periodicamente com `npm audit --omit=dev` e `npm audit`.

## Relato responsável

Não inclua senhas, tokens, dados pessoais, documentos médicos ou payloads completos de pagamentos em issues, commits ou logs.
