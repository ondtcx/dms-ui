// src/app/dashboard/home/page.tsx
"use client";

import { useAuth } from "@/lib/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { documentsService } from "@/lib/services/documents.service";
import { useState } from "react";
import toast from "react-hot-toast";

export default function HomePage() {
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const {
    data: documents,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["documents"],
    queryFn: () => documentsService.getAll({ page: 1, limit: 10 }),
  });

  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: () => documentsService.getStats(),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Selecciona un archivo");
      return;
    }

    setUploading(true);
    try {
      await documentsService.upload(selectedFile, {
        isPublic: false,
      });
      toast.success("Archivo subido exitosamente");
      setSelectedFile(null);
      refetch();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Error al subir archivo");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (id: number, filename: string) => {
    try {
      const blob = await documentsService.download(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Descarga iniciada");
    } catch (error) {
      toast.error("Error al descargar archivo");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar este documento?")) return;

    try {
      await documentsService.delete(id);
      toast.success("Documento eliminado");
      refetch();
    } catch (error) {
      toast.error("Error al eliminar documento");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="px-8 py-6">
          <h1 className="text-2xl font-bold text-gray-900">Inicio</h1>
          <p className="text-sm text-gray-500 mt-1">
            Bienvenido, {user?.name}
          </p>
        </div>
      </header>

      <div className="flex-1 px-8 py-6">
        {/* Estadísticas */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-gray-500 text-sm">Total Documentos</h3>
              <p className="text-3xl font-bold">{stats.totalDocuments}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-gray-500 text-sm">Espacio Usado</h3>
              <p className="text-3xl font-bold">{stats.totalSizeMB} MB</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-gray-500 text-sm">Categorías</h3>
              <p className="text-3xl font-bold">-</p>
            </div>
          </div>
        )}

        {/* Upload */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold mb-4">Subir Documento</h2>
          <div className="flex gap-4">
            <input
              type="file"
              onChange={handleFileChange}
              className="flex-1 border border-gray-300 rounded px-3 py-2"
            />
            <button
              onClick={handleUpload}
              disabled={uploading || !selectedFile}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {uploading ? "Subiendo..." : "Subir"}
            </button>
          </div>
        </div>

        {/* Lista de Documentos */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">Mis Documentos</h2>
          </div>
          <div className="divide-y">
            {isLoading ? (
              <div className="p-6 text-center">Cargando...</div>
            ) : documents?.data.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No hay documentos
              </div>
            ) : (
              documents?.data.map((doc) => (
                <div
                  key={doc.id}
                  className="p-6 flex justify-between items-center hover:bg-gray-50"
                >
                  <div>
                    <h3 className="font-medium">{doc.filename}</h3>
                    <p className="text-sm text-gray-500">
                      {(doc.size / 1024).toFixed(2)} KB
                    </p>
                    <p className="text-xs text-gray-400">
                      Subido por {doc.uploadedBy.name}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDownload(doc.id, doc.filename)}
                      className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                    >
                      Descargar
                    </button>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
