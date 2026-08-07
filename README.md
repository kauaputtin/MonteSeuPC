# Monte Seu PC

Aplicação full-stack para montar um computador em etapas, verificar compatibilidade, importar catálogo autorizado, comparar ofertas e compartilhar a configuração. Sem Supabase ou fontes configuradas, o catálogo fictício continua disponível e é identificado como demonstração.

## O que está pronto

- Página inicial responsiva, SEO, Open Graph, sitemap, robots, manifest, 404 e estados de carregamento/erro.
- Montador com nove etapas, progresso, busca com debounce, filtros e exibição opcional de incompatíveis.
- Estado global com Context + reducer, restauração automática e persistência no `localStorage` sem erro de hidratação.
- Motor isolado em `lib/compatibility/compatibility-engine.ts`, sem regras espalhadas pela interface.
- 15 verificações de compatibilidade, consumo estimado, margem e potência comercial recomendada para a fonte.
- 32 peças demonstrativas, três lojas e pelo menos duas ofertas por componente.
- Seleção de uma oferta por peça, menor oferta como referência, totais em BRL e links externos seguros.
- Detalhes de componente e ofertas em `/componente/[slug]`.
- Compartilhamento permanente pelo Supabase; sem variáveis configuradas, um link portátil codificado mantém o MVP funcional.
- Painel administrativo com Supabase Auth, RLS, busca, filtros, paginação, formulários React Hook Form, validação, edição e desativação confirmada.
- Migrations, seed SQL, schemas Zod, índices, constraints, triggers e testes Vitest.
- Arquitetura modular de providers, normalização por categoria, matching conservador, histórico de preço e catálogo Supabase no frontend.
- Mercado Livre via API oficial e OAuth no servidor, além de importador CSV autorizado e painel em `/admin/integracoes`.
- Jobs manuais/agendados com lock, rate limit, retry/backoff, circuit breaker, timeout, cache controlado, auditoria e proteção SSRF.

O estado real de cada fonte, as credenciais e o procedimento operacional estão em [docs/integrations.md](docs/integrations.md).

## Requisitos

- Node.js 20.9 ou superior (mínimo do Next.js 16).
- npm 10 ou superior.
- Docker somente se quiser executar o Supabase localmente.

## Executar localmente

```bash
npm install
copy .env.example .env.local
npm run dev
```

No macOS/Linux, troque o segundo comando por `cp .env.example .env.local`. Abra `http://localhost:3000`. As variáveis podem permanecer vazias: o site usa automaticamente o catálogo local de demonstração.

Validações disponíveis:

```bash
npm run test
npm run lint
npm run build
npm run start
```

## Variáveis de ambiente

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_CHAVE_ANON_OU_PUBLISHABLE
SUPABASE_SERVICE_ROLE_KEY=SUA_SERVICE_ROLE
NEXT_PUBLIC_SITE_URL=https://seu-dominio.com.br
```

`SUPABASE_SERVICE_ROLE_KEY` é lida apenas em módulos e rotas de servidor para montagens, integrações e jobs. Nunca use o prefixo `NEXT_PUBLIC_` nela e nunca a exponha no navegador. Sem essa chave, o compartilhamento recorre ao link portátil de demonstração e as integrações ficam indisponíveis.

## Configurar o Supabase

### Projeto hospedado

1. Crie um projeto no Supabase.
2. Abra o SQL Editor e execute `supabase/migrations/202608070001_initial_schema.sql`.
3. Execute `supabase/migrations/202608070002_integrations.sql`.
4. Execute `supabase/seed.sql` somente se quiser o fallback demonstrativo.
5. Copie a URL, a chave pública e a service role para `.env.local`.
6. Em Authentication, crie o usuário administrador.
7. No SQL Editor, associe o usuário ao perfil administrativo:

```sql
insert into public.admin_profiles (user_id, role)
values ('UUID-DO-USUARIO', 'admin');
```

8. Reinicie `npm run dev` e entre por `/admin/login`.

### Supabase local com CLI

```bash
npx supabase init
npx supabase start
npx supabase db reset
```

Como este repositório já contém `supabase/migrations` e `supabase/seed.sql`, `db reset` recria o banco e aplica ambos. Use os valores mostrados pelo CLI em `.env.local`. A referência atual da CLI está na [documentação oficial do Supabase](https://supabase.com/docs/guides/local-development/cli/getting-started).

## Segurança e RLS

- Público: lê categorias, componentes ativos, lojas ativas, ofertas disponíveis e montagens compartilhadas.
- Público: não grava catálogo nem cria builds diretamente no PostgREST.
- Compartilhamento: passa por `/api/builds`, é validado por Zod, resolve novamente componentes/ofertas no servidor e grava com a service role.
- Administração: usa sessão Supabase Auth e exige `admin_profiles.role` igual a `admin` ou `editor`.
- Catálogo: somente administradores autenticados podem inserir, editar ou desativar.
- Links externos: apenas HTTP/HTTPS, com `target="_blank"` e `rel="noopener noreferrer sponsored"` quando aplicável.

## Estrutura principal

```text
app/
  admin/                   painel e autenticação
  api/builds/              compartilhamento validado
  api/admin/[resource]/    CRUD administrativo protegido
  componente/[slug]/       detalhes e comparação
  montagem/[id]/           montagem pública somente leitura
  montar/                  wizard
components/ui/             componentes base
data/mock-data.ts          fallback e seed TypeScript
features/
  admin/                   tabelas e formulários
  builder/                 estado, wizard, cards e resumo
  components/              especificações
  offers/                  comparação de ofertas
lib/
  compatibility/           motor de regras puro
  supabase/                clientes server/browser e autenticação
  validations/             schemas Zod
public/products/           ilustrações demonstrativas locais
supabase/migrations/       schema PostgreSQL e RLS
supabase/seed.sql          catálogo SQL fictício
tests/                     testes Vitest
types/                     contratos TypeScript
```

## Compatibility engine

Cada verificação retorna `compatible`, `warning` ou `incompatible`, uma mensagem, código estável e os IDs envolvidos. O consumo mostrado soma os watts informados e adiciona 10% para a estimativa. A fonte recomendada usa aproximadamente 30% sobre a soma base e sobe para a próxima faixa comercial: 450, 500, 550, 600, 650, 750, 850 ou 1000 W.

O cálculo é uma estimativa. Picos transitórios, overclock, eficiência, periféricos e tolerâncias do fabricante exigem conferência adicional.

## Publicar na Vercel

1. Envie o repositório para um provedor Git e importe-o na Vercel, ou instale o CLI e execute:

```bash
npx vercel
```

2. Em Project Settings → Environment Variables, cadastre as quatro variáveis de ambiente.
3. Use `npm run build` como Build Command (o padrão detectado para Next.js já faz isso).
4. Faça o deploy de produção:

```bash
npx vercel --prod
```

5. Atualize `NEXT_PUBLIC_SITE_URL` com o domínio final e faça novo deploy. O Next.js tem suporte sem configuração adicional na Vercel, conforme a [documentação oficial](https://vercel.com/docs/frameworks/full-stack/nextjs).

## Limitações do MVP e próximos passos

- O catálogo do frontend lê o Supabase quando existem componentes reais e usa o fallback local explicitamente marcado quando não existem.
- Não existe scraping, cálculo real de frete nem promessa de preço atual.
- Não há conta de consumidor; a montagem privada fica apenas no navegador.
- Links portáteis de demonstração não têm persistência no servidor. Com Supabase e service role, o identificador é aleatório e persistente.
- Upload binário de imagem pode ser adicionado com Supabase Storage; o MVP administra URL/caminho de imagem.
- Próximas versões podem incluir múltiplos discos, múltiplos kits de RAM, importadores de afiliados, histórico de preço, disponibilidade regional e contas de usuário.

As instruções de ambiente seguem os requisitos atuais do [Next.js 16](https://nextjs.org/docs/app/getting-started/installation).
