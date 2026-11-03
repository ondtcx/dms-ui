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

### Prueba aislada del backend en Windows

Desde `dms-frontend`, `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run-visible-demo.ps1 -BackendSmokeTest` crea un PostgreSQL temporal, migra y carga datos ficticios, inicia el backend y comprueba su respuesta HTTP antes de detenerlo y cerrar PostgreSQL. Requiere PostgreSQL 18 y las dependencias ya instaladas; conserva el directorio temporal para inspección. No inicia el frontend ni habilita la demostración completa, que permanece bloqueada por falta de aislamiento integral. Las comprobaciones de puertos no reservan los puertos hasta el arranque: existe una carrera ordinaria con otros procesos concurrentes; la verificación de propiedad rechaza un listener ajeno.

La disponibilidad se comprueba mediante HTTP 200 en `/api`, ya que Swagger está deshabilitado en modo demostración. Esta respuesta no demuestra la conexión a la base de datos ni la contención de red.

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

### Visible demo isolation preflight

El fixture `scripts/demo-font-responses.js` ofrece respuestas locales para Geist y Geist Mono mediante las fuentes del sistema Arial y Courier New; si no están instaladas, se usan las fuentes de respaldo del navegador. No modifica la compilación normal. El runner aún no tiene una ruta de compilación o ejecución del frontend: cuando exista, deberá establecer `NEXT_FONT_GOOGLE_MOCKED_RESPONSES` exclusivamente en el entorno del proceso de compilación de demostración, con la ruta absoluta a ese fixture, antes de iniciar Next. La prueba `node scripts/test-demo-font-responses.cjs` comprueba el cargador instalado sin compilar ni acceder a la red. Esto no demuestra aislamiento de otras peticiones ni sustituye las medidas pendientes de contención.

From `dms-frontend` on Windows, run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run-visible-demo.ps1 -Preflight
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-visible-demo-isolation.ps1
```

The preflight checks the approved temporary parent, availability of loopback ports 55434, 3201 and 3200, and rejection of an occupied port. It does not reserve the ports after checking them, create a cluster, seed data, start services or prove full isolation. Running without `-Preflight` deliberately fails closed: filesystem and network containment and scheduled-task suppression for the full backend have not been established. This is not a browser demo.

The `-DatabaseSmokeTest` mode invokes the disposable PostgreSQL smoke implementation independently of the blocked full-app mode. It copies only the Prisma schema and migration inputs into a new runtime root, rejects reparse points and unexpected migration paths, and runs Prisma from that root with an explicit environment. Existing environment files are neither read nor modified by the runner. It checks listener ownership before the query and rechecks postmaster identity before stopping; failures can leave PostgreSQL or child processes running, and runtime data is retained without automatic deletion. Follow the printed diagnostic and verify process identity and data directory before manual recovery. Path checks and copies are not atomic: concurrent replacement remains possible, including by administrators or other local processes. Port checks are not reservations, and concurrent local processes can change paths, listeners, or identity between checks.

**The migration copy and deployment have not been runtime verified.** An earlier database-only smoke verified an authenticated query and shutdown before migration deployment was added. Do not treat deterministic guard tests or mocked dispatch as evidence that the new copy or migration works on a real PostgreSQL installation. A runtime check must verify those behaviors and inspect retained data; no browser or application services are started by this mode.

After migration, the smoke test invokes a dedicated fictional seed with the same random database URL and a separately generated administrator password in a controlled child environment. The parent rechecks postmaster and listener ownership immediately before starting the child; the entrypoint requires an explicit marker and matching target. Those environment values are an operator contract, not proof of ownership. A normal local check-to-connection race remains, and the checks do not defend against an adversarial administrator. The seed integration has not been runtime verified against PostgreSQL.

The initdb password file is created with a protected Windows ACL granting only the current user access, and its ACL is checked before writing the password. Unsupported filesystems or runtimes and ACL verification failures stop the smoke test. This does not protect against administrators, privileged processes, the same user, or concurrent path replacement; the deterministic tests do not create a real credential file or verify filesystem ACL enforcement.

### Visible browser journey (not yet runtime verified)

`playwright.demo.config.ts` discovers only the headed demo and never starts a server or uses a default service. Discovery and type checking do not launch the demo:

```powershell
npx playwright test --config playwright.demo.config.ts --list
npx tsc --noEmit --incremental false
```

**Do not run the journey until independent verification proves a fully disposable environment.** The isolation preflight above is incomplete and is not that proof. Verify a fresh dedicated database, dedicated file storage and working directory, all backend side effects including scheduled jobs and external integrations, loopback-only frontend and API, correct frontend API configuration, exclusive service and port ownership, and safe process lifecycle. Ensure no existing users, documents, database, storage, or services are reused. The demo does not provision, verify, or clean up any of these resources; an environment variable is only an operator attestation, not isolation enforcement. Existing port and shutdown races and retained smoke-test data remain unresolved.

Once those prerequisites are independently proven, provide `DEMO_BASE_URL` and `DEMO_API_ORIGIN` explicitly as loopback HTTP(S) origins, `DEMO_ADMIN_EMAIL` and `DEMO_ADMIN_PASSWORD` for a disposable administrator with user and role management permissions, `DEMO_ROLE_LABEL` for an active catalog role that can upload documents, and `DEMO_ISOLATION_CONFIRMED=yes`. Supply credentials privately through the process environment, never in command history or screenshots. The admin must not require two-factor interaction. Then, from `dms-frontend`, run `npx playwright test --config playwright.demo.config.ts`. Both browser contexts block service workers and route intercepted requests to the two configured origins only. This is defense in depth, not network isolation: it does not cover every network channel or contain backend requests or filesystem access. Do not enable traces, screenshots, videos, or external recording around credentials. On failure, the report identifies a sanitized stage and category; the journey attempts to close both browser contexts, so the browser is not kept open for inspection.

The intended journey creates a uniquely named fictional account, signs in using a separate browser session, uploads a fictional in-memory PDF, and shows its initial version and creation activity across a reload. It does not demonstrate automatic handover, workflow execution, a second version, or archival: there is no supported archive-creation UI in this journey. It does not delete any data; disposal of the verified isolated environment is a separate authorized operation. Select a role with sufficient permissions; failures or unavailable controls are not evidence that a step succeeded. The selectors and real integration remain unverified until a safe runtime exists.

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
