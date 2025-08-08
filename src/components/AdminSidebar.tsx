import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Users, 
  Settings, 
  Shield, 
  Palette, 
  Bell, 
  FileText, 
  Database,
  UserCog,
  Lock,
  Eye,
  ChevronDown,
  ChevronRight,
  Home,
  BarChart3,
  Zap,
  FolderOpen
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const AdminSidebar = ({ isOpen, onClose }: AdminSidebarProps) => {
  const { profile } = useAuth();
  const location = useLocation();
  const [expandedSections, setExpandedSections] = useState<string[]>(['users']);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const isActive = (path: string) => location.pathname === path;
  const isExpanded = (section: string) => expandedSections.includes(section);

  const menuSections = [
    {
      id: 'main',
      title: 'Principale',
      items: [
        { path: '/dashboard', icon: Home, label: 'Dashboard', badge: null },
        { path: '/statistics', icon: BarChart3, label: 'Statistiche', badge: null },
        { path: '/automation', icon: Zap, label: 'Automazione', badge: 'Pro' },
      ]
    },
    {
      id: 'users',
      title: 'Gestione Utenti',
      icon: Users,
      expandable: true,
      items: [
        { path: '/admin/users', icon: Users, label: 'Utenti', badge: null },
        { path: '/admin/roles', icon: UserCog, label: 'Ruoli e Permessi', badge: null },
        { path: '/admin/teams', icon: Users, label: 'Team', badge: null },
        { path: '/admin/departments', icon: Database, label: 'Dipartimenti', badge: null },
      ]
    },
    {
      id: 'content',
      title: 'Gestione Contenuti',
      icon: FileText,
      expandable: true,
      items: [
        { path: '/admin/categories', icon: Database, label: 'Categorie', badge: null },
        { path: '/admin/documents', icon: FolderOpen, label: 'Documenti', badge: 'New' },
        { path: '/admin/forms', icon: FileText, label: 'Moduli e Campi', badge: null },
        { path: '/admin/workflows', icon: Settings, label: 'Workflow', badge: null },
      ]
    },
    {
      id: 'customization',
      title: 'Personalizzazione',
      icon: Palette,
      expandable: true,
      items: [
        { path: '/admin/interface', icon: Palette, label: 'Interfaccia', badge: null },
        { path: '/admin/notifications', icon: Bell, label: 'Notifiche', badge: null },
      ]
    },
    {
      id: 'security',
      title: 'Privacy e Sicurezza',
      icon: Shield,
      expandable: true,
      items: [
        { path: '/admin/audit-logs', icon: Eye, label: 'Log di Controllo', badge: null },
        { path: '/admin/security', icon: Lock, label: 'Impostazioni Sicurezza', badge: null },
        { path: '/admin/backup', icon: Database, label: 'Backup e Ripristino', badge: null },
        { path: '/admin/compliance', icon: Shield, label: 'Conformità', badge: null },
      ]
    }
  ];

  // Filtra le sezioni in base al ruolo
  const filteredSections = menuSections.filter(section => {
    if (profile?.role === 'admin') return true;
    if (profile?.role === 'technician') {
      return ['main', 'content', 'customization'].includes(section.id);
    }
    return section.id === 'main';
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:relative lg:inset-auto">
      {/* Overlay per mobile */}
      <div 
        className="fixed inset-0 bg-black/50 lg:hidden" 
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-80 bg-white border-r shadow-lg lg:relative lg:shadow-none overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold">Amministrazione</h2>
              <p className="text-sm text-muted-foreground">
                {profile?.role === 'admin' ? 'Controllo completo sistema' : 'Gestione operativa'}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="lg:hidden">
              ×
            </Button>
          </div>

          <div className="space-y-2">
            {filteredSections.map((section) => (
              <div key={section.id}>
                {section.expandable ? (
                  <>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start h-auto p-3",
                        "hover:bg-muted/50"
                      )}
                      onClick={() => toggleSection(section.id)}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                          <section.icon className="h-5 w-5" />
                          <span className="font-medium">{section.title}</span>
                        </div>
                        {isExpanded(section.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </div>
                    </Button>
                    
                    {isExpanded(section.id) && (
                      <div className="ml-4 space-y-1 border-l-2 border-muted pl-4">
                        {section.items?.map((item) => (
                          <Link
                            key={item.path}
                            to={item.path}
                            onClick={onClose}
                            className={cn(
                              "flex items-center justify-between p-2 rounded-md text-sm transition-colors",
                              "hover:bg-muted/50",
                              isActive(item.path) && "bg-primary/10 text-primary font-medium"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <item.icon className="h-4 w-4" />
                              <span>{item.label}</span>
                            </div>
                            {item.badge && (
                              <Badge variant="secondary" className="text-xs">
                                {item.badge}
                              </Badge>
                            )}
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-1">
                    <div className="px-3 py-2 text-sm font-medium text-muted-foreground">
                      {section.title}
                    </div>
                    {section.items?.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={onClose}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-md transition-colors",
                          "hover:bg-muted/50",
                          isActive(item.path) && "bg-primary/10 text-primary font-medium"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon className="h-5 w-5" />
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <Badge variant="secondary" className="text-xs">
                            {item.badge}
                          </Badge>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
                
                {section.id !== filteredSections[filteredSections.length - 1].id && (
                  <Separator className="my-4" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSidebar;