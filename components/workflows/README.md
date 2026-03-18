# Módulo de Workflows

Gestión de flujos de aprobación para documentos.

## Archivos

| Archivo | Descripción |
|---------|-------------|
| `lib/services/workflows.service.ts` | Capa de API — todos los endpoints del módulo |
| `app/dashboard/workflows/page.tsx` | Página principal con tabs |
| `components/workflows/PendingApprovalsTab.tsx` | Tab de aprobaciones pendientes del usuario actual |
| `components/workflows/WorkflowTemplatesTab.tsx` | Tab de gestión de plantillas (admin/director/coordinador) |
| `components/workflows/WorkflowTemplateDialog.tsx` | Dialog para crear/editar plantillas |
| `components/workflows/DocumentWorkflowCard.tsx` | Card del sidebar en el detalle de documento |

## Flujo de uso

```
1. Admin crea una plantilla de workflow
   └─ Define etapas ordenadas, cada una con nombre y rol aprobador

2. Usuario inicia un workflow en un documento
   └─ Selecciona una plantilla activa desde el detalle del documento

3. Backend asigna aprobadores automáticamente por rol (autoAssign)
   └─ Crea un WorkflowApproval por cada usuario con el rol de la etapa

4. Aprobadores ven sus pendientes en /dashboard/workflows
   └─ Pueden Aprobar / Rechazar / Solicitar cambios

5. Al aprobar la última etapa → workflow pasa a APPROVED
   Al rechazar en cualquier etapa → workflow pasa a REJECTED
```

## Roles

| Acción | Roles |
|--------|-------|
| Gestionar plantillas | `admin`, `director`, `coordinador` |
| Iniciar workflow en un documento | Cualquier usuario autenticado |
| Aprobar/Rechazar | Usuario asignado como aprobador en la etapa actual |
| Cancelar workflow | Solo quien lo inició |

## Estados de un workflow

```
DRAFT → PENDING → IN_PROGRESS → APPROVED
                              → REJECTED
                 → CANCELLED
```

## Tipos clave (`lib/types/index.ts`)

- `WorkflowTemplate` — plantilla reutilizable con `stateDefinitions[]`
- `StateDefinition` — etapa: `{ state, role, order }`
- `DocumentWorkflow` — instancia activa de un workflow en un documento
- `WorkflowApproval` — acción de un aprobador en una etapa
- `WorkflowStatus` — enum: `DRAFT | PENDING | IN_PROGRESS | APPROVED | REJECTED | CANCELLED`
- `ApprovalAction` — enum: `APPROVED | REJECTED | REQUESTED_CHANGES | COMMENTED`
