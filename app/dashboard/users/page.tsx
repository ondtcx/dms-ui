// src/app/dashboard/users/page.tsx
"use client";

import ProtectedRoute from "@/guards/ProtectedRoute";
import { UserRole } from "@/lib/types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersService } from "@/lib/services/users.service";
import { useState } from "react";
import toast from "react-hot-toast";
import Link from "next/link";

function UsersManagementContent() {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: UserRole.USER,
  });

  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => usersService.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: usersService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Usuario creado exitosamente");
      setIsCreating(false);
      setNewUser({ name: "", email: "", password: "", role: UserRole.USER });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Error al crear usuario");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: usersService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Usuario eliminado");
    },
    onError: () => {
      toast.error("Error al eliminar usuario");
    },
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(newUser);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar este usuario?")) return;
    deleteMutation.mutate(id);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-purple-100 text-purple-800";
      case "moderator":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-bold">Gestión de Usuarios</h1>
            </div>
            <div className="flex items-center">
              <Link
                href="/dashboard"
                className="text-gray-700 hover:text-blue-600"
              >
                ← Volver al Dashboard
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <button
            onClick={() => setIsCreating(!isCreating)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            {isCreating ? "Cancelar" : "+ Crear Usuario"}
          </button>
        </div>

        {isCreating && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-lg font-semibold mb-4">Nuevo Usuario</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nombre
                </label>
                <input
                  type="text"
                  required
                  value={newUser.name}
                  onChange={(e) =>
                    setNewUser({ ...newUser, name: e.target.value })
                  }
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) =>
                    setNewUser({ ...newUser, email: e.target.value })
                  }
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Contraseña
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newUser.password}
                  onChange={(e) =>
                    setNewUser({ ...newUser, password: e.target.value })
                  }
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Rol
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) =>
                    setNewUser({ ...newUser, role: e.target.value as UserRole })
                  }
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                >
                  <option value={UserRole.USER}>Usuario</option>
                  <option value={UserRole.MODERATOR}>Moderador</option>
                  <option value={UserRole.ADMIN}>Administrador</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
              >
                {createMutation.isPending ? "Creando..." : "Crear Usuario"}
              </button>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">Usuarios del Sistema</h2>
          </div>
          <div className="divide-y">
            {isLoading ? (
              <div className="p-6 text-center">Cargando...</div>
            ) : users?.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No hay usuarios
              </div>
            ) : (
              users?.map((user) => (
                <div
                  key={user.id}
                  className="p-6 flex justify-between items-center hover:bg-gray-50"
                >
                  <div>
                    <h3 className="font-medium">{user.name}</h3>
                    <p className="text-sm text-gray-500">{user.email}</p>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-1 ${getRoleBadgeColor(
                        user.role
                      )}`}
                    >
                      {user.role.toUpperCase()}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDelete(user.id)}
                    disabled={deleteMutation.isPending}
                    className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
                  >
                    Eliminar
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UsersManagementPage() {
  return (
    <ProtectedRoute requiredRole={UserRole.ADMIN}>
      <UsersManagementContent />
    </ProtectedRoute>
  );
}
