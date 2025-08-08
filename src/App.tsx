import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import NotificationSettingsComponent from "@/components/NotificationSettings";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Statistics from "./pages/Statistics";
import ImportData from "./pages/ImportData";
import Automation from "./pages/Automation";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import SelfService from "./pages/SelfService";
import ApiIntegration from "./pages/ApiIntegration";

// Admin pages
import UsersPage from "./pages/admin/Users";
import AuditLogsPage from "./pages/admin/AuditLogs";
import CategoriesPage from "./pages/admin/Categories";
import DocumentsAdminPage from "./pages/admin/Documents";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Index />
              </ProtectedRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/statistics" element={
              <ProtectedRoute>
                <Statistics />
              </ProtectedRoute>
            } />
            <Route path="/import-data" element={
              <ProtectedRoute>
                <ImportData />
              </ProtectedRoute>
            } />
            <Route path="/automation" element={
              <ProtectedRoute>
                <Automation />
              </ProtectedRoute>
            } />
            <Route path="/self-service" element={
              <SelfService />
            } />
            <Route path="/api-integration" element={
              <ProtectedRoute requiredRole="admin">
                <ApiIntegration />
              </ProtectedRoute>
            } />
            
            {/* Admin Routes */}
            <Route path="/admin/users" element={
              <ProtectedRoute requiredRole="admin">
                <UsersPage />
              </ProtectedRoute>
            } />
            <Route path="/admin/audit-logs" element={
              <ProtectedRoute requiredRole="admin">
                <AuditLogsPage />
              </ProtectedRoute>
            } />
            <Route path="/admin/categories" element={
              <ProtectedRoute>
                <CategoriesPage />
              </ProtectedRoute>
            } />
            <Route path="/admin/documents" element={
              <ProtectedRoute>
                <DocumentsAdminPage />
              </ProtectedRoute>
            } />
            
            {/* Placeholder routes for other admin pages */}
            <Route path="/admin/roles" element={
              <ProtectedRoute requiredRole="admin">
                <div className="p-6"><h1>Gestione Ruoli - In sviluppo</h1></div>
              </ProtectedRoute>
            } />
            <Route path="/admin/teams" element={
              <ProtectedRoute requiredRole="admin">
                <div className="p-6"><h1>Gestione Team - In sviluppo</h1></div>
              </ProtectedRoute>
            } />
            <Route path="/admin/departments" element={
              <ProtectedRoute requiredRole="admin">
                <div className="p-6"><h1>Gestione Dipartimenti - In sviluppo</h1></div>
              </ProtectedRoute>
            } />
            <Route path="/admin/interface" element={
              <ProtectedRoute>
                <div className="p-6"><h1>Personalizzazione Interfaccia - In sviluppo</h1></div>
              </ProtectedRoute>
            } />
            <Route path="/admin/forms" element={
              <ProtectedRoute>
                <div className="p-6"><h1>Gestione Moduli - In sviluppo</h1></div>
              </ProtectedRoute>
            } />
            <Route path="/admin/workflows" element={
              <ProtectedRoute>
                <div className="p-6"><h1>Gestione Workflow - In sviluppo</h1></div>
              </ProtectedRoute>
            } />
            <Route path="/admin/notifications" element={
              <ProtectedRoute>
                <div className="p-6">
                  <NotificationSettingsComponent />
                </div>
              </ProtectedRoute>
            } />
            <Route path="/admin/security" element={
              <ProtectedRoute requiredRole="admin">
                <div className="p-6"><h1>Impostazioni Sicurezza - In sviluppo</h1></div>
              </ProtectedRoute>
            } />
            <Route path="/admin/backup" element={
              <ProtectedRoute requiredRole="admin">
                <div className="p-6"><h1>Backup e Ripristino - In sviluppo</h1></div>
              </ProtectedRoute>
            } />
            <Route path="/admin/compliance" element={
              <ProtectedRoute requiredRole="admin">
                <div className="p-6"><h1>Conformità - In sviluppo</h1></div>
              </ProtectedRoute>
            } />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;