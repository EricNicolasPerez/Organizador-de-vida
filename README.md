# Organizador

Toda tu vida, un solo sistema. Módulos v1: **Finanzas** y **Entrenamiento**.

Stack: Next.js 16 · Supabase (Postgres + Auth) · Tailwind CSS 4 · Vitest.

## Puesta en marcha

1. Creá un proyecto gratis en [supabase.com](https://supabase.com).
2. En **SQL Editor**, ejecutá en orden los archivos de `supabase/migrations/`.
3. En **Authentication → Sign In / Providers**, desactivá *Allow new users to sign up* (en v1 el registro está cerrado).
4. En **Authentication → Users → Add user**, creá tu usuario (email + contraseña, marcá *Auto confirm*).
5. Copiá `.env.example` a `.env.local` y completá `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` (en **Project Settings → API**).
6. `pnpm install` y `pnpm dev`. Abrí http://localhost:3000.

## Publicar

Importá el repositorio en Vercel y cargá las dos variables de entorno. Desde el celular, abrí la URL y elegí *Agregar a pantalla de inicio*.

## Pruebas

```bash
pnpm test
```

Las pruebas de base de datos corren con PGlite (Postgres en memoria): no necesitan Supabase.
