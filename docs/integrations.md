# Integrações de catálogo e ofertas

Este documento distingue conectores operacionais de fontes apenas preparadas. Nenhum dado de fixture é apresentado como preço real.

## Estado das fontes

| Fonte | Estado | Meio autorizado | Observação |
|---|---|---|---|
| Mercado Livre | Implementada; requer OAuth | API oficial de catálogo e itens | Busca, detalhes, ofertas, vendedores, disponibilidade, normalização, matching, histórico e sincronização |
| CSV | Implementada | Feed/planilha autorizada | Prévia, mapeamento, validação por linha, confirmação, idempotência e desfazer registros novos em até 24 horas |
| Amazon Brasil | Preparada e desativada | Creators API | PA-API 5.0 não é usada; falta homologar credenciais, PartnerTag e regras comerciais da conta |
| KaBuM! | Preparada e desativada | Programa de afiliados/Awin | Nenhum coletor de páginas foi criado; aguarda feed autorizado |
| Pichau | Manual/CSV | Cadastro manual ou feed autorizado futuro | Não foi localizada API pública documentada para descoberta de preços |
| TerabyteShop | Manual/CSV | Cadastro manual | Não há scraping: os termos do programa de parceiros vedam extração automatizada |
| Magalu | Manual/CSV | Cadastro manual ou feed autorizado futuro | A API pública encontrada é voltada à operação do próprio seller, não à descoberta geral de ofertas |

Referências oficiais consultadas:

- Mercado Livre: [itens e buscas](https://developers.mercadolivre.com.br/pt_br/convivencia-me1-me2/itens-e-buscas), [buscador de produtos](https://developers.mercadolivre.com.br/buscador-de-produtos), [concorrência em catálogo](https://developers.mercadolivre.com.br/pt_br/imoveis-gerenciamento-de-perguntas-e-contatos/concorrencia-em-catalogo) e [OAuth](https://developers.mercadolivre.com.br/pt_br/publicacao-de-produtos/gestao-de-identidades-e-acessos-oauth-e-tokens).
- Amazon: [Creators API](https://affiliate-program.amazon.com/creatorsapi/docs/), [registro e credenciais](https://affiliate-program.amazon.com/creatorsapi/docs/en-us/onboarding/register-for-creators-api) e [descontinuação da PA-API 5.0](https://affiliate-program.amazon.com/creatorsapi/docs/en-us/paapiv5-deprecation).
- KaBuM!: [programa de afiliados](https://www.kabum.com.br/hotsite/afiliados/) e [documentação do marketplace para sellers](https://www.kabum.com.br/hotsite/documentacao-hubscore/).
- TerabyteShop: [regras do programa de parceiros](https://www.terabyteshop.com.br/site/regras-programa-de-parceiros).
- Magalu: [visão geral da API de produtos para sellers](https://developers.magalu.com/docs/apis/products/overview/index.html).

## Aplicar o banco

Em um Supabase local com Docker:

```bash
npx supabase start
npx supabase db reset
```

Em um projeto hospedado, aplique na ordem:

1. `supabase/migrations/000_initial_schema.sql`;
2. `supabase/migrations/001_integrations.sql`;
3. `supabase/migrations/002_seed.sql`, para carregar o fallback demonstrativo.

A segunda migration é aditiva. Ela preserva o catálogo, identifica o seed fictício com `is_demo`, cria providers, produtos externos, origens de oferta, histórico de preço, jobs, candidatos, credenciais criptografadas, cache, lotes CSV, auditoria e eventos anônimos de saída. O trigger de preço só registra uma linha quando preço, Pix, preço original, frete ou disponibilidade muda.

## Conectar o Mercado Livre

1. Crie uma aplicação no portal Mercado Livre Developers e configure uma redirect URI HTTPS em produção.
2. Preencha `MERCADO_LIVRE_CLIENT_ID`, `MERCADO_LIVRE_CLIENT_SECRET` e `MERCADO_LIVRE_REDIRECT_URI` no servidor.
3. Gere `INTEGRATION_ENCRYPTION_KEY` com `openssl rand -base64 32`.
4. Entre como administrador e abra `/admin/integracoes`.
5. Em Mercado Livre, clique em **Conectar** e conclua o OAuth.
6. Ative a fonte e use **Testar** antes de **Sincronizar**.

O access token e o refresh token são criptografados com AES-256-GCM em `integration_credentials`. O secret, os tokens, `raw_payload` e a service role nunca são enviados ao navegador. `MERCADO_LIVRE_ACCESS_TOKEN` existe apenas como alternativa de desenvolvimento no servidor.

## Sincronização

Sincronização manual: `/admin/integracoes` → Mercado Livre → **Sincronizar**. A rota exige sessão administrativa e aplica limite de tentativas.

Sincronização automática: configure `CRON_SECRET` na Vercel. `vercel.json` chama `/api/cron/integrations` a cada hora. O endpoint só inicia fontes ativas cujo `next_sync_at` venceu; o intervalo inicial do Mercado Livre é 360 minutos e pode ser alterado no painel. A frequência do cron não força atualização de todas as fontes.

O processamento possui lock por provider/tipo de job, lotes e paginação limitados, rate limit por fonte, timeout, retry de 429/5xx com backoff e jitter, circuit breaker, validação Zod, logs estruturados, execução idempotente, métricas e invalidação de cache. Uma oferta ausente em três leituras consecutivas é marcada como desatualizada em vez de ser apagada.

## CSV e cadastro manual

No painel de integrações:

1. baixe o exemplo;
2. envie um arquivo de até 5 MB/5.000 linhas;
3. gere a prévia;
4. ajuste o mapeamento de colunas;
5. corrija os erros por linha ou autorize importação parcial;
6. confirme.

O SHA-256 do conteúdo evita a reimportação do mesmo arquivo. Durante 24 horas, o painel consegue remover os registros criados pelo lote; alterações feitas sobre registros que já existiam não são revertidas. Ofertas avulsas podem ser cadastradas em `/admin/ofertas`, incluindo vendedor, condição, estoque, Pix, parcelamento, frete e URL afiliada autorizada.

## Matching e especificações

A associação automática exige GTIN/EAN/UPC ou MPN confiável e confiança acima de 0,95. Marca+modelo e texto geram apenas candidatos para revisão. Conflitos de DDR, capacidade, quantidade de módulos, VRAM, potência, formato, radiador e sufixos OC/Ti/Super bloqueiam a união. O painel permite aprovar, rejeitar, separar, desfazer e renormalizar.

Um novo componente só é publicado automaticamente quando todas as especificações exigidas pelo schema da categoria foram fornecidas e validadas. Ausências permanecem `null` no dado normalizado e não são inventadas. Produtos incompletos ficam na fila administrativa, e o motor exibe “compatibilidade não verificada”.

## Cache e imagens

`integration_cache` impõe TTL máximo por provider e é invalidado após sincronizações bem-sucedidas. O conector atual não armazena respostas de preço em cache enquanto não houver uma política de retenção confirmada para a conta. Toda leitura externa usa `no-store` e a interface sempre mostra `last_checked_at`.

Imagens permanecem na origem. O Next.js aceita apenas hosts explicitamente configurados para Mercado Livre, Amazon e Supabase; uma imagem CSV de outro domínio usa a ilustração local até que o host seja revisado e autorizado.

## Limitações conhecidas

- O Mercado Livre exige aplicação aprovada/token válido; sem isso, o provider fica desativado e o restante do site continua no fallback demonstrativo.
- A API não fornece frete calculado para o CEP do visitante neste fluxo. A interface informa que o frete será calculado no site da loja.
- Produtos sem especificações técnicas completas não entram automaticamente no catálogo público.
- Amazon, KaBuM!, Pichau, TerabyteShop e Magalu não são apresentados como integrações concluídas.
- O ambiente local precisa de Docker para executar o stack Supabase; sem Docker ou credenciais de banco, a migration deve ser aplicada pelo SQL Editor/CI.
