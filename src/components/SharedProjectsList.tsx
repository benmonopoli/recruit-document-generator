import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Folder, Clock, Users, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchProjects, cloneProject } from "@/lib/api";
import { fetchSharedWithMeProjects } from "@/lib/sharing";
import type { Project } from "@/types";
import { toast } from "sonner";

export function SharedProjectsList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadSharedProjects = async () => {
      try {
        setLoading(true);
        // Get project IDs where user is a contributor
        const sharedProjectIds = await fetchSharedWithMeProjects();
        
        if (sharedProjectIds.length === 0) {
          setProjects([]);
          return;
        }

        // Fetch full project details
        const allProjects = await fetchProjects();
        const sharedProjects = allProjects.filter(p => sharedProjectIds.includes(p.id));
        setProjects(sharedProjects);
      } catch (error) {
        toast.error("Failed to load shared projects");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    loadSharedProjects();
  }, []);

  const handleClone = async (project: Project) => {
    try {
      const newProject = await cloneProject(project.id, `${project.name} (Copy)`);
      toast.success("Project cloned successfully");
      navigate(`/project/${newProject.id}`);
    } catch (error) {
      toast.error("Failed to clone project");
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No shared projects</h3>
        <p className="text-muted-foreground">
          When someone adds you as a contributor, their projects will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <Card
          key={project.id}
          className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
          onClick={() => navigate(`/project/${project.id}`)}
        >
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <CardTitle className="text-base line-clamp-1">{project.name}</CardTitle>
              <Badge variant="outline" className="shrink-0">
                <Users className="h-3 w-3 mr-1" />
                Shared
              </Badge>
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
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
