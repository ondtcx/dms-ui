# DMS Frontend — Aplicación web de gestión documental

Cliente web del sistema de gestión documental para instituciones educativas. Vive en el directorio `dms-frontend/` del monorepo `dms-fullstack` y consume la API REST de `dms-backend` (`http://localhost:3001/api`).

Cubre la operación diaria del producto: bandeja y detalle de documentos con versiones y auditoría, carga y oficialización, plantillas, flujos de trabajo, directorios y compartición, catálogos académicos, búsqueda y administración de usuarios. La página pública presenta el producto como *EduDocs – Gestión Documental para Instituciones Educativas* (`app/page.tsx`).

## Stack

| Componente | Versión |
| --- | --- |
| Next.js (App Router) | 15.3.5, con Turbopack en desarrollo y compilación turbo disponible |
| React | 19 |
| TypeScript | 5 |
| Tailwind CSS | 4 (`@tailwindcss/postcss`, configuración en `app/globals.css`) |
| Componentes de interfaz | shadcn/ui (estilo `new-york`) sobre Radix UI, iconos `lucide-react` |
| Datos del servidor | TanStack Query 5 + axios |
| Formularios | React Hook Form |
| Estado del cliente | Zustand 5 |
| Utilidades | `date-fns`, `recharts`, `react-big-calendar`, `papaparse`, `prismjs`, `react-simple-code-editor`, `react-hot-toast`, `handlebars` |
| Pruebas | Jest 30 + Testing Library; Playwright para extremo a extremo |

## Requisitos previos

- Node.js 20 (`Dockerfile`).
- Backend `dms-backend` en ejecución y accesible desde el navegador, con `PORT=3001` y el prefijo `api` (`http://localhost:3001/api`).
- Opcional: OnlyOffice Document Server en `http://localhost:8080` para edición y visualización en línea.

## Puesta en marcha

```bash
cd dms-frontend
npm install
cp .env.example .env.local
npm run dev
```

La aplicación queda disponible en `http://localhost:3000`.

## Variables de entorno

| Variable | Descripción | Ejemplo |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | URL base de la API del backend. Todas las llamadas del cliente pasan por ella. | `http://localhost:3001/api` |
| `NEXT_PUBLIC_ONLYOFFICE_URL` | URL de OnlyOffice Document Server para edición y visualización en línea. | `http://localhost:8080` |

Ambas están definidas en `.env.example` y en el `.env.local` local. `.gitignore` ignora `.env*`, por lo que ningún archivo de entorno se versiona. Las variables `NEXT_PUBLIC_*` se incorporan en tiempo de compilación: deben estar presentes también al construir la imagen Docker.

## Scripts disponibles

| Script | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo con Turbopack en `http://localhost:3000`. |
| `npm run build` | Compilación de producción de Next.js. |
| `npm run build:turbo` | Compilación de producción con Turbopack. |
| `npm run start` | Servidor de producción (requiere `npm run build` previo). |
| `npm run lint` | ESLint con `eslint-config-next`. |
| `npm test` | Pruebas unitarias y de integración con Jest en entorno `jsdom`. |
| `npm run test:watch` | Jest en modo observación. |
| `npm run test:coverage` | Jest con cobertura (proveedor `v8`). |
| `npx playwright test` | Pruebas end-to-end. No existe script dedicado en `package.json`. |

`next.config.ts` define `ignoreDuringBuilds` e `ignoreBuildErrors`, de modo que la compilación no falla por errores de lint o de TypeScript: ejecuta `npm run lint` y una verificación de tipos aparte para usarlos como compuerta de calidad.

## Estructura del proyecto

```txt
dms-frontend/
├─ app/               # App Router: landing, autenticación y dashboard
├─ components/        # Componentes de interfaz y de dominio
├─ lib/               # Cliente HTTP, servicios, tipos, contextos y utilidades
├─ hooks/             # Hooks de dominio (permisos, subidas, miniaturas)
├─ guards/            # Guardas de ruta del cliente
├─ e2e/               # Pruebas end-to-end de Playwright y sus fixtures
├─ scripts/           # Runner aislado para la prueba de catálogo de roles
├─ middleware.ts      # Control de acceso por cookie de sesión
└─ Dockerfile
```

- `app/`: rutas del App Router. Incluye la landing pública, el grupo de autenticación, el dashboard completo y las páginas de error.
- `components/`: `ui/` con los componentes base de shadcn/ui, más grupos de dominio (`documents/`, `templates/`, `settings/`, `search/`, `navigation/`, `notifications/`, `structure/`, `categories/`, `landing/`).
- `lib/`: `axios.ts` (instancia HTTP y manejo de errores), `react-query.tsx` (proveedor de TanStack Query), `services/`, `types/`, `contexts/`, y utilidades de dominio como visibilidad de documentos, capacidades por acción y configuración de estados de flujo.
- `hooks/`: `use-permissions`, `use-directory-submission`, `use-document-action-guard`, `use-document-thumbnails`, `use-upload-metadata`.
- `guards/`: `ProtectedRoute`, `PublicRoute` y `RoleGuard` para el control de acceso en el cliente.

## Capacidades y rutas

| Capacidad | Rutas |
| --- | --- |
| Landing pública | `/`, `/landing` |
| Autenticación (login, recuperación y restablecimiento de contraseña) | `/auth/login`, `/auth/forgot-password`, `/auth/reset-password` |
| Inicio del dashboard | `/dashboard`, `/dashboard/home` |
| Bandeja y listado de documentos | `/dashboard/documents` |
| Detalle de documento con versiones, metadatos, edición y trazabilidad | `/dashboard/documents/[id]`, `/dashboard/documents/[id]/edit`, `/dashboard/documents/[id]/edit-form`, `/dashboard/documents/[id]/audit` |
| Lotes documentales | `/dashboard/documents/batches/[id]` |
| Plantillas y generación por lotes | `/dashboard/templates`, `/dashboard/templates/[id]/create`, `/dashboard/templates/[id]/batch` |
| Flujos de trabajo | `/dashboard/workflows` |
| Búsqueda | `/dashboard/search` |
| Directorios y compartición heredada | `/dashboard/directories`, `/dashboard/directories/new` |
| Catálogos: categorías, tipos de documento y años académicos | `/dashboard/categories`, `/dashboard/document-types`, `/dashboard/academic-years` |
| Configuración del sistema | `/dashboard/settings` |
| Usuarios y roles | `/dashboard/users` |
| Archivo, papelera y calendario | `/dashboard/archive`, `/dashboard/trash`, `/dashboard/calendar` |
| Cuenta del usuario | `/dashboard/mi-cuenta` |
| Acceso denegado | `/errors/unauthorized` |

El registro público está deshabilitado: `middleware.ts` redirige `/auth/register` a `/auth/login`. Las rutas públicas son login y recuperación de contraseña; el resto exige la cookie `token` y redirige a `/auth/login` cuando falta. Si la sesión ya está activa, visitar una ruta pública lleva a `/dashboard/home`.

## Pruebas

```bash
# Pruebas unitarias y de integración (Jest + Testing Library, entorno jsdom)
npm test

# Cobertura
npm run test:coverage

# Extremo a extremo (Playwright)
npx playwright test
```

Jest descubre los archivos `**/__tests__/**/*.test.[jt]s?(x)` con el alias `@/*` apuntando a la raíz del proyecto; las pruebas viven junto al código que cubren (87 archivos al momento de esta documentación).

`playwright.config.ts` levanta automáticamente el frontend (`npm run dev` en el puerto 3000) y el backend (`cd ../dms-backend && npm run start:dev` en `http://localhost:3001/api`), y reutiliza servidores ya activos fuera de CI. Las especificaciones cubren inicio de sesión, flujo de subida y oficialización, recorrido de flujos de trabajo, verificación del inicio del dashboard y creación de usuarios con catálogo de roles.

La prueba de catálogo de roles se ejecuta de forma aislada con `scripts/run-catalog-role-e2e.ps1`, que aprovisiona su propia base PostgreSQL y su propio servidor en el puerto 3100 usando `playwright.catalog.config.ts`; ese runner es específico de Windows y depende de las rutas configuradas dentro del script.

## Docker

```bash
docker build -t dms-frontend .
docker run -p 3000:3000 --env-file .env.local dms-frontend
```

La imagen parte de `node:20-alpine`, compila la aplicación y arranca `npm start` exponiendo el puerto `3000`. Recuerda que las variables `NEXT_PUBLIC_*` deben existir durante la compilación.

## Documentación relacionada

- [`../README.md`](../README.md) — visión general del monorepo y puesta en marcha completa.
- [`../docs/product/overview.md`](../docs/product/overview.md) — propósito, alcance y actores del producto.
- [`../docs/architecture/backend.md`](../docs/architecture/backend.md) — arquitectura del backend que consume esta aplicación.
- [`../docs/development/getting-started.md`](../docs/development/getting-started.md) — guía de inicio del entorno de desarrollo.
