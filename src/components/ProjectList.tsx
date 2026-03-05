import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Folder, Clock, Users, Trash2, Copy, Globe, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { fetchProjects, deleteProject, cloneProject } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import type { Project } from "@/types";
import { toast } from "sonner";

interface ProjectListProps {
  showPublic?: boolean;
}

export function ProjectList({ showPublic = false }: ProjectListProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [contributorCounts, setContributorCounts] = useState<Record<string, number>>({});
  const navigate = useNavigate();

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await fetchProjects();
      const filteredData = showPublic ? data.filter((p) => p.is_public) : data;
      setProjects(filteredData);
      
      // Fetch contributor counts for all projects
      if (filteredData.length > 0) {
        const projectIds = filteredData.map(p => p.id);
        const { data: contributors } = await supabase
          .from("project_contributors")
          .select("project_id")
          .in("project_id", projectIds);
        
        if (contributors) {
          const counts: Record<string, number> = {};
          contributors.forEach(c => {
            counts[c.project_id] = (counts[c.project_id] || 0) + 1;
          });
          setContributorCounts(counts);
        }
      }
    } catch (error) {
      toast.error("Failed to load projects");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, [showPublic]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteProject(deleteId);
      setProjects((prev) => prev.filter((p) => p.id !== deleteId));
      toast.success("Project deleted");
    } catch (error) {
      toast.error("Failed to delete project");
    } finally {
      setDeleteId(null);
    }
  };

  const handleClone = async (project: Project) => {
    try {
      const newProject = await cloneProject(project.id, `${project.name} (Copy)`);
      toast.success("Project cloned successfully");
      navigate(`/project/${newProject.id}`);
    } catch (error) {
      toast.error("Failed to clone project");
    }
  };

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.department?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and actions */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="pl-9"
          />
        </div>
        {!showPublic && (
          <Button onClick={() => navigate("/new")}>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        )}
      </div>

      {/* Project grid */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-12">
          <Folder className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No projects found</h3>
          <p className="text-muted-foreground mb-4">
            {search
              ? "Try a different search term"
              : showPublic
              ? "No public templates available yet"
              : "Create your first project to get started"}
          </p>
          {!showPublic && !search && (
            <Button onClick={() => navigate("/new")}>
              <Plus className="h-4 w-4 mr-2" />
              Create Project
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <Card
              key={project.id}
              className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
              onClick={() => navigate(`/project/${project.id}`)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base line-clamp-1">{project.name}</CardTitle>
                  <div className="flex items-center gap-1 shrink-0">
                    {project.visibility === "public" && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="secondary" className="gap-1">
                              <Globe className="h-3 w-3" />
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>Public project</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    {contributorCounts[project.id] > 0 && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="outline" className="gap-1">
                              <UserPlus className="h-3 w-3" />
                              {contributorCounts[project.id]}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            Shared with {contributorCounts[project.id]} contributor{contributorCounts[project.id] > 1 ? 's' : ''}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </div>
                {project.department && (
                  <CardDescription>{project.department}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {project.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {project.description}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(project.updated_at).toLocaleDateString()}
                  </span>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleClone(project)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    {!showPublic && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(project.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All content including job descriptions,
              interview questions, and test tasks will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
