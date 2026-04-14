'use client';

import { useEffect, useState } from 'react';
import { reportsService } from '@/lib/services/reports.service';
import { DashboardReport } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BarChart3,
  FileText,
  Users,
  HardDrive,
  TrendingUp,
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function ReportsPage() {
  const [report, setReport] = useState<DashboardReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    try {
      setLoading(true);
      const data = await reportsService.getDashboard();
      setReport(data);
    } catch (error) {
      console.error('Error loading report:', error);
      toast.error('Error al cargar el dashboard');
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('es-ES').format(num);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">No se pudo cargar el dashboard</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Dashboard Analítico</h1>
            <p className="text-muted-foreground">
              Métricas y estadísticas del sistema
            </p>
          </div>
        </div>
        <Badge variant="outline" className="gap-2">
          <Clock className="h-3 w-3" />
          {report.executionTime}ms
        </Badge>
      </div>

      {/* Cards de resumen */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documentos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(report.summary.totalDocuments.total)}
            </div>
            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-600" />
                {formatNumber(report.summary.totalDocuments.active)} activos
              </span>
              <span className="flex items-center gap-1">
                <XCircle className="h-3 w-3 text-red-600" />
                {formatNumber(report.summary.totalDocuments.deleted)} eliminados
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(report.summary.totalUsers.total)}
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {report.summary.totalUsers.byRole.slice(0, 3).map((roleData) => (
                <Badge key={roleData.role} variant="outline" className="text-xs">
                  {roleData.role}: {roleData.count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Almacenamiento</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatBytes(report.summary.totalStorage.total)}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Promedio: {formatBytes(report.summary.totalStorage.average)} por documento
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Uploads recientes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Uploads Recientes (30 días)
            </CardTitle>
            <CardDescription>Tendencia de documentos subidos</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart
                data={report.charts.recentUploads.map((u) => ({
                  fecha: new Date(u.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
                  count: u.count,
                }))}
                margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorUploads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="count"
                  name="Documentos"
                  stroke="hsl(var(--primary))"
                  fill="url(#colorUploads)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distribución por categoría */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Categoría</CardTitle>
            <CardDescription>Documentos por categoría</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={report.charts.categoryDistribution.slice(0, 8)}
                  dataKey="count"
                  nameKey="categoryName"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) =>
                    (percent ?? 0) > 0.05 ? `${name} (${Math.round((percent ?? 0) * 100)}%)` : ''
                  }
                  labelLine={false}
                >
                  {report.charts.categoryDistribution.slice(0, 8).map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color || `hsl(${index * 45}, 60%, 55%)`}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => [value, 'Documentos']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Actividad de usuarios */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Usuarios Más Activos
          </CardTitle>
          <CardDescription>Top 10 usuarios por cantidad de documentos</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead className="text-right">Documentos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.charts.userActivity.map((user) => (
                <TableRow key={user.userId}>
                  <TableCell className="font-medium">{user.userName}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{user.documentCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Estadísticas de workflows */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Estadísticas de Workflows
            </CardTitle>
            <CardDescription>Estado de los workflows del sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total workflows</span>
                <span className="font-bold">{report.charts.workflowStats.total}</span>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart
                  data={report.charts.workflowStats.byStatus.map((s) => ({
                    estado: s.status.toLowerCase(),
                    count: s.count,
                  }))}
                  margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="estado" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" name="Workflows" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tiempo promedio de finalización</span>
                  <span className="font-medium">
                    {Math.round(report.charts.workflowStats.avgCompletionTime / 1000 / 60 / 60)} horas
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Almacenamiento por departamento */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Almacenamiento por Departamento
            </CardTitle>
            <CardDescription>Uso de almacenamiento por departamento</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {report.summary.totalStorage.byDepartment.slice(0, 5).map((dept) => (
                <div key={dept.department} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{dept.department}</span>
                    <span className="text-muted-foreground">
                      {formatBytes(dept.totalSize)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{
                          width: `${
                            (dept.totalSize /
                              Math.max(
                                ...report.summary.totalStorage.byDepartment.map((d) => d.totalSize)
                              )) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {dept.documentCount} docs
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
