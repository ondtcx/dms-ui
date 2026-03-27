'use client';

import { useAuth } from '@/lib/contexts/AuthContext';
import { UserRole } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, GitBranch } from 'lucide-react';
import PendingApprovalsTab from '@/components/workflows/PendingApprovalsTab';
import WorkflowTemplatesTab from '@/components/workflows/WorkflowTemplatesTab';
import MyInitiatedWorkflowsTab from '@/components/workflows/MyInitiatedWorkflowsTab';

const TEMPLATE_MANAGER_ROLES = [UserRole.ADMIN, UserRole.DIRECTOR, UserRole.VICERRECTOR, UserRole.COORDINADOR];
const INITIATOR_ROLES = [
  UserRole.ADMIN, UserRole.DIRECTOR, UserRole.VICERRECTOR,
  UserRole.COORDINADOR, UserRole.PROFESOR, UserRole.SECRETARIO,
];

export default function WorkflowsPage() {
  const { user } = useAuth();

  const canManageTemplates = user ? TEMPLATE_MANAGER_ROLES.includes(user.role) : false;
  const canInitiate = user ? INITIATOR_ROLES.includes(user.role) : false;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <CheckCircle2 className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workflows</h1>
          <p className="text-muted-foreground">
            Gestiona aprobaciones de documentos y plantillas de flujo
          </p>
        </div>
      </div>

      <Tabs defaultValue="approvals">
        <TabsList>
          <TabsTrigger value="approvals" className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Mis Aprobaciones
          </TabsTrigger>
          {canInitiate && (
            <TabsTrigger value="my-flows" className="gap-2">
              <GitBranch className="h-4 w-4" />
              Mis Flujos
            </TabsTrigger>
          )}
          {canManageTemplates && (
            <TabsTrigger value="templates" className="gap-2">
              <GitBranch className="h-4 w-4" />
              Plantillas
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="approvals" className="mt-6">
          <PendingApprovalsTab />
        </TabsContent>

        {canInitiate && (
          <TabsContent value="my-flows" className="mt-6">
            <MyInitiatedWorkflowsTab />
          </TabsContent>
        )}

        {canManageTemplates && (
          <TabsContent value="templates" className="mt-6">
            <WorkflowTemplatesTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
