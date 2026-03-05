import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  Home,
  FolderPlus, 
  Library,
  FileText,
  MessageSquare,
  ClipboardList,
  Users,
  Shield,
  Settings,
  LayoutGrid,
  ExternalLink,
  BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import logoImage from "@/assets/logo.png";
import { JobSearchSidebar } from "./JobSearchSidebar";
import { FeedbackButton } from "./FeedbackButton";
import { InboxSidebar } from "./InboxSidebar";

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { icon: Home, label: "Home", href: "/" },
  { icon: FolderPlus, label: "New Project", href: "/new" },
  { icon: Library, label: "Project Library", href: "/library" },
];

// Extensible config for linked recruit apps
const recruitApps = [
  { 
    icon: BarChart3, 
    label: "Recruit Metrics", 
    description: "Analytics & reporting",
    url: "https://recruitmetrics.lovable.app/" 
  },
];

const quickGenTypes = [
  { icon: FileText, label: "Job Description", type: "job_description" },
  { icon: MessageSquare, label: "Interview Questions", type: "interview_questions" },
  { icon: ClipboardList, label: "Test Tasks", type: "test_task" },
  { icon: Users, label: "Application Questions", type: "application_questions" },
];

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [unreadFeedbackCount, setUnreadFeedbackCount] = useState(0);

  useEffect(() => {
    const checkAdminAndFeedback = async () => {
      if (!user) return;
      const { data } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
      setIsAdmin(!!data);
      
      // If admin, fetch unread feedback count
      if (data) {
        const { count } = await supabase
          .from("feedback")
          .select("*", { count: "exact", head: true })
          .eq("is_read", false);
        setUnreadFeedbackCount(count || 0);
      }
    };
    checkAdminAndFeedback();
  }, [user]);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
        <Link to="/" className="p-4 border-b border-sidebar-border flex items-center gap-3 hover:bg-sidebar-accent/30 transition-colors">
          <img src={logoImage} alt="RDG Logo" className="h-8 w-8 rounded" />
          <div>
            <p className="font-semibold text-sidebar-foreground">RDG</p>
            <p className="text-sm text-sidebar-foreground/60">Recruit Document Generation</p>
          </div>
        </Link>

        <ScrollArea className="flex-1 p-3">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-base font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-6">
            <h3 className="px-3 text-sm font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-2">
              Quick Gen
            </h3>
            <div className="space-y-1">
              {quickGenTypes.map((item) => (
                <Link
                  key={item.type}
                  to={`/?quickgen=${item.type}`}
                  className="flex items-center gap-3 px-3 py-2 text-base text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground rounded-md transition-colors cursor-pointer"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Job Description Search */}
          <JobSearchSidebar />
        </ScrollArea>

        <div className="p-3 border-t border-sidebar-border space-y-1">
          <InboxSidebar />
          <FeedbackButton />
          
          {/* Recruit Apps Launcher */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="flex items-center gap-3 px-3 py-2 rounded-md text-base font-medium transition-colors w-full text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              >
                <LayoutGrid className="h-4 w-4" />
                Recruit Apps
              </button>
            </PopoverTrigger>
            <PopoverContent 
              side="right" 
              align="end" 
              className="w-64 p-2"
            >
              <div className="space-y-1">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">
                  Connected Apps
                </p>
                {recruitApps.map((app) => (
                  <a
                    key={app.url}
                    href={app.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-2 py-2 rounded-md text-sm hover:bg-accent transition-colors group"
                  >
                    <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                      <app.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">{app.label}</p>
                      <p className="text-sm text-muted-foreground">{app.description}</p>
                    </div>
                    <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <Link
            to="/settings"
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-base font-medium transition-colors",
              location.pathname === "/settings"
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
            )}
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
          {isAdmin && (
            <Link
              to="/admin"
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-base font-medium transition-colors relative",
                location.pathname === "/admin"
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <Shield className="h-4 w-4" />
              Admin
              {unreadFeedbackCount > 0 && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 h-5 min-w-5 px-1 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-sm font-medium">
                  {unreadFeedbackCount > 99 ? "99+" : unreadFeedbackCount}
                </span>
              )}
            </Link>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
