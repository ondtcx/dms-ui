"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Send,
  RefreshCw,
  MessageSquare,
  FileSearch,
  X,
  FileText,
  User,
  Building2,
  Search,
  Check,
} from "lucide-react";
import { TransferStats } from "@/components/transfer-stats";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "react-hot-toast";
import { documentsService } from "@/lib/services/documents.service";
import { transfersService } from "@/lib/services/transfer.service";
import { usersService } from "@/lib/services/users.service";
import { departmentsService } from "@/lib/services/departments.service";
import type {
  Document,
  CreateTransferDto,
  User as UserType,
} from "@/lib/types";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type RecipientType = "user" | "department";

export default function NewTransferPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [selectedDocumentIds, setSelectedDocumentIds] = useState<number[]>([]);
  const [recipientType, setRecipientType] = useState<RecipientType>("user");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("");
  const [userSearch, setUserSearch] = useState("");
  const [departmentSearch, setDepartmentSearch] = useState("");
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("select");

  const { data: documents, isLoading: isLoadingDocuments } = useQuery({
    queryKey: ["my-documents"],
    queryFn: () => documentsService.getAll({}),
  });

  const { data: usersData, isLoading: isLoadingUsers } = useQuery({
    queryKey: ["users", userSearch],
    queryFn: async () => {
      const users = await usersService.getAllForSelection();
      if (!userSearch) return users;
      return users.filter(
        (u) =>
          u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
          u.email.toLowerCase().includes(userSearch.toLowerCase()),
      );
    },
  });

  const { data: departmentsData, isLoading: isLoadingDepartments } = useQuery({
    queryKey: ["departments-active", departmentSearch],
    queryFn: async () => {
      const response = await departmentsService.getAll({
        search: departmentSearch,
        isActive: true,
      });
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateTransferDto) => transfersService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfer-stats"] });
      queryClient.invalidateQueries({ queryKey: ["transfers-sent"] });
      toast.success("Transferencia creada exitosamente");
      handleReset();
      router.push("/dashboard/transfers/sent");
    },
    onError: () => {
      toast.error("Error al crear la transferencia");
    },
  });

  const handleRecipientTypeChange = (value: RecipientType) => {
    setRecipientType(value);
    setSelectedUserIds([]);
    setSelectedDepartmentId("");
  };

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const handleReset = () => {
    setSelectedDocumentIds([]);
    setRecipientType("user");
    setSelectedUserIds([]);
    setSelectedDepartmentId("");
    setUserSearch("");
    setDepartmentSearch("");
    setMessage("");
  };

  const handleSendTransfer = async () => {
    if (selectedDocumentIds.length === 0) {
      toast.error("Selecciona al menos un documento");
      return;
    }

    if (recipientType === "user" && selectedUserIds.length === 0) {
      toast.error("Selecciona al menos un usuario destinatario");
      return;
    }

    if (recipientType === "department" && !selectedDepartmentId) {
      toast.error("Selecciona un departamento destinatario");
      return;
    }

    try {
      for (const docId of selectedDocumentIds) {
        for (const userId of selectedUserIds) {
          await createMutation.mutateAsync({
            documentId: docId,
            toUserId: userId,
            comment: message || undefined,
          });
        }
        if (recipientType === "department") {
          await createMutation.mutateAsync({
            documentId: docId,
            toDepartmentId: parseInt(selectedDepartmentId),
            comment: message || undefined,
          });
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const selectedDocuments =
    documents?.data?.filter((d) => selectedDocumentIds.includes(d.id)) || [];

  const selectedUsers =
    usersData?.filter((u) => selectedUserIds.includes(u.id.toString())) || [];

  const canSend =
    selectedDocumentIds.length > 0 &&
    ((recipientType === "user" && selectedUserIds.length > 0) ||
      (recipientType === "department" && selectedDepartmentId)) &&
    !createMutation.isPending;

  return (
    <div className="bg-background">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TransferStats />
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <Card className="border-border bg-card">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <CardHeader className="pb-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-foreground">
                        Documentos
                      </CardTitle>
                      <CardDescription>
                        Selecciona documentos existentes para transferir
                      </CardDescription>
                    </div>
                  </div>
                  <TabsList className="mt-4 grid w-full grid-cols-1 bg-secondary/50">
                    <TabsTrigger value="select" className="gap-2">
                      <FileSearch className="h-4 w-4" />
                      Seleccionar Documentos
                      {selectedDocumentIds.length > 0 && (
                        <Badge
                          variant="secondary"
                          className="ml-1 bg-primary text-primary-foreground"
                        >
                          {selectedDocumentIds.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>
                </CardHeader>

                <CardContent className="pt-6">
                  <TabsContent value="select" className="m-0">
                    <div className="h-[500px] overflow-hidden rounded-lg border border-border">
                      {isLoadingDocuments ? (
                        <div className="flex flex-col items-center justify-center py-12">
                          <p className="text-muted-foreground">
                            Cargando documentos...
                          </p>
                        </div>
                      ) : !documents?.data?.length ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <FileText className="h-12 w-12 text-muted-foreground/50" />
                          <p className="mt-4 text-muted-foreground">
                            No tienes documentos para transferir
                          </p>
                        </div>
                      ) : (
                        <div className="divide-y divide-border">
                          {documents.data.map((doc) => (
                            <div
                              key={doc.id}
                              className={`flex items-center gap-4 p-4 transition-colors hover:bg-secondary/30 ${
                                selectedDocumentIds.includes(doc.id)
                                  ? "bg-primary/5"
                                  : ""
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={selectedDocumentIds.includes(doc.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedDocumentIds((prev) => [
                                      ...prev,
                                      doc.id,
                                    ]);
                                  } else {
                                    setSelectedDocumentIds((prev) =>
                                      prev.filter((id) => id !== doc.id),
                                    );
                                  }
                                }}
                                className="h-4 w-4 rounded border-gray-300"
                              />
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                                <FileText className="h-5 w-5 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="truncate font-medium text-foreground">
                                  {((doc?.versions?.[0]?.filename) ?? '')}
                                </p>
                                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>
                                    {doc.category?.name || "Sin categoría"}
                                  </span>
                                  <span>•</span>
                                  <span>{formatFileSize(((doc?.versions?.[0]?.size) ?? 0))}</span>
                                  <span>•</span>
                                  <span>
                                    {new Date(doc.createdAt).toLocaleDateString(
                                      "es-ES",
                                    )}
                                  </span>
                                </div>
                              </div>
                              {doc.description && (
                                <p className="truncate text-sm text-muted-foreground max-w-xs">
                                  {doc.description}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </CardContent>
              </Tabs>
            </Card>
          </div>

          <div className="space-y-6 lg:col-span-2">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-base text-foreground">
                  Documentos Seleccionados
                </CardTitle>
                <CardDescription>
                  {selectedDocumentIds.length === 0
                    ? "Ningún documento seleccionado"
                    : `${selectedDocumentIds.length} documento(s) para transferir`}
                </CardDescription>
              </CardHeader>
              {selectedDocuments.length > 0 && (
                <CardContent className="pt-0">
                  <div className="max-h-40 space-y-2 overflow-auto">
                    {selectedDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between rounded bg-secondary/50 px-3 py-2 text-sm"
                      >
                        <span className="truncate text-foreground">
                          {((doc?.versions?.[0]?.filename) ?? '')}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedDocumentIds((prev) =>
                              prev.filter((id) => id !== doc.id),
                            )
                          }
                          className="ml-2 text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>

            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-base text-foreground">
                  Destinatario
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-foreground">
                    Tipo de Destinatario
                  </Label>
                  <RadioGroup
                    value={recipientType}
                    onValueChange={(value) =>
                      handleRecipientTypeChange(value as RecipientType)
                    }
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="user" id="user" />
                      <Label
                        htmlFor="user"
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <User className="h-4 w-4" />
                        Usuario
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="department" id="department" />
                      <Label
                        htmlFor="department"
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Building2 className="h-4 w-4" />
                        Departamento
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {recipientType === "user" ? (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">
                      Usuarios Destinatarios
                    </Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Buscar usuario..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <div className="max-h-60 overflow-auto rounded-lg border border-border bg-background">
                      {isLoadingUsers ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          Cargando usuarios...
                        </div>
                      ) : usersData?.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          No se encontraron usuarios
                        </div>
                      ) : (
                        <div className="divide-y divide-border">
                          {usersData?.map((user) => (
                            <label
                              key={user.id}
                              className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-secondary/50 transition-colors"
                            >
                              <Checkbox
                                checked={selectedUserIds.includes(
                                  user.id.toString(),
                                )}
                                onCheckedChange={() =>
                                  toggleUser(user.id.toString())
                                }
                              />
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
                                <User className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="truncate text-sm font-medium text-foreground">
                                  {user.name}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {user.email}
                                </p>
                              </div>
                              {selectedUserIds.includes(user.id.toString()) && (
                                <Check className="h-4 w-4 text-primary" />
                              )}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                    {selectedUsers.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">
                          Seleccionados ({selectedUsers.length})
                        </Label>
                        <div className="flex flex-wrap gap-2">
                          {selectedUsers.map((user) => (
                            <Badge
                              key={user.id}
                              variant="secondary"
                              className="gap-1.5"
                            >
                              <User className="h-3 w-3" />
                              {user.name}
                              <button
                                type="button"
                                onClick={() => toggleUser(user.id.toString())}
                                className="ml-1 rounded-full hover:bg-muted-foreground/20"
                              >
                                ×
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">
                      Departamento Destinatario
                    </Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Buscar departamento..."
                        value={departmentSearch}
                        onChange={(e) => setDepartmentSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <div className="max-h-60 overflow-auto rounded-lg border border-border bg-background">
                      {isLoadingDepartments ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          Cargando departamentos...
                        </div>
                      ) : departmentsData?.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          No se encontraron departamentos
                        </div>
                      ) : (
                        <div className="divide-y divide-border">
                          {departmentsData?.map((dept) => (
                            <label
                              key={dept.id}
                              className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-secondary/50 transition-colors"
                            >
                              <input
                                type="radio"
                                name="department"
                                checked={
                                  selectedDepartmentId === dept.id.toString()
                                }
                                onChange={() =>
                                  setSelectedDepartmentId(dept.id.toString())
                                }
                                className="h-4 w-4"
                              />
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <span className="text-sm text-foreground">
                                {dept.name}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">
                    Mensaje (opcional)
                  </Label>
                  <div className="relative">
                    <Textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Añade un mensaje para los destinatarios..."
                      className="min-h-20 resize-none bg-input pr-10"
                    />
                    <MessageSquare className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>

                <div className="flex items-center gap-3 border-t border-border pt-4">
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    disabled={createMutation.isPending}
                    className="flex-1 gap-2 bg-transparent"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Reiniciar
                  </Button>
                  <Button
                    onClick={handleSendTransfer}
                    disabled={!canSend}
                    className="flex-1 gap-2"
                  >
                    <Send className="h-4 w-4" />
                    {createMutation.isPending ? "Enviando..." : "Enviar"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
