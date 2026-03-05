import { useState, useEffect } from "react";
import { X, Plus, Loader2, UserPlus, Globe, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { fetchProjectContributors, addContributor, removeContributor, searchUsersByEmail } from "@/lib/sharing";
import { updateProject, fetchProject } from "@/lib/api";
import type { ProjectContributor, RegisteredUser } from "@/types";

interface ContributorManagerProps {
  projectId: string;
  isOwner: boolean;
}

export function ContributorManager({ projectId, isOwner }: ContributorManagerProps) {
  const [contributors, setContributors] = useState<ProjectContributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [searchEmail, setSearchEmail] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<RegisteredUser[]>([]);
  const [adding, setAdding] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [togglingVisibility, setTogglingVisibility] = useState(false);

  const loadProjectData = async () => {
    try {
      const [contributorsData, projectData] = await Promise.all([
        fetchProjectContributors(projectId),
        fetchProject(projectId),
      ]);
      setContributors(contributorsData);
      setIsPublic(projectData.visibility === "public");
    } catch (error) {
      console.error("Failed to load project data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadContributors = async () => {
    try {
      const data = await fetchProjectContributors(projectId);
      setContributors(data);
    } catch (error) {
      console.error("Failed to load contributors:", error);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search as user types
  useEffect(() => {
    loadProjectData();
  }, [projectId]);

  const handleToggleVisibility = async (checked: boolean) => {
    setTogglingVisibility(true);
    try {
      await updateProject(projectId, { visibility: checked ? "public" : "private" });
      setIsPublic(checked);
      toast.success(checked ? "Project is now public" : "Project is now private");
    } catch (error) {
      toast.error("Failed to update visibility");
    } finally {
      setTogglingVisibility(false);
    }
  };

  // Debounced search as user types
  useEffect(() => {
    if (searchEmail.trim().length < 3) {
      setSearchResults([]);
      return;
    }

    const debounceTimer = setTimeout(async () => {
      setSearching(true);
      try {
        const users = await searchUsersByEmail(searchEmail);
        // Filter out existing contributors
        const existingIds = contributors.map(c => c.user_id);
        setSearchResults(users.filter(u => !existingIds.includes(u.id)));
      } catch (error) {
        console.error("Failed to search users:", error);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchEmail, contributors]);

  const handleAddContributor = async (user: RegisteredUser) => {
    setAdding(true);
    try {
      await addContributor(projectId, user.id);
      toast.success(`Added ${user.email} as contributor`);
      setSearchResults(prev => prev.filter(u => u.id !== user.id));
      await loadProjectData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add contributor");
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveContributor = async (contributor: ProjectContributor) => {
    try {
      await removeContributor(contributor.id);
      toast.success("Contributor removed");
      setContributors(prev => prev.filter(c => c.id !== contributor.id));
    } catch (error) {
      toast.error("Failed to remove contributor");
    }
  };

  if (loading) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <UserPlus className="h-4 w-4" />
          Share Project
          {contributors.length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {contributors.length}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Project</DialogTitle>
          <DialogDescription>
            Add contributors to give them ongoing edit access to the entire project. They can modify all documents, and the project will appear in their "Shared with Me" library.
          </DialogDescription>
        </DialogHeader>

        {/* Public visibility toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
          <div className="flex items-center gap-3">
            {isPublic ? (
              <Globe className="h-5 w-5 text-green-500" />
            ) : (
              <Lock className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <Label htmlFor="public-toggle" className="text-sm font-medium cursor-pointer">
                {isPublic ? "Public Project" : "Private Project"}
              </Label>
              <p className="text-xs text-muted-foreground">
                {isPublic 
                  ? "Anyone can view this project in Public Projects" 
                  : "Only you and contributors can access"}
              </p>
            </div>
          </div>
          <Switch
            id="public-toggle"
            checked={isPublic}
            onCheckedChange={handleToggleVisibility}
            disabled={togglingVisibility}
          />
        </div>

        {/* Current contributors */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Current Contributors</h4>
          {contributors.length === 0 ? (
            <p className="text-sm text-muted-foreground">No contributors yet</p>
          ) : (
            <div className="space-y-2">
              {contributors.map((contributor) => (
                <div
                  key={contributor.id}
                  className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                >
                  <span className="text-sm">{contributor.user_email || "Unknown user"}</span>
                  {isOwner && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleRemoveContributor(contributor)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add new contributor */}
        {isOwner && (
          <div className="space-y-3 pt-4 border-t">
            <h4 className="text-sm font-medium">Add Contributor</h4>
            <div className="relative">
              <Input
                placeholder="Start typing email to search..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
              />
              {searching && (
                <Loader2 className="h-4 w-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              )}
            </div>
            {searchEmail.length > 0 && searchEmail.length < 3 && (
              <p className="text-xs text-muted-foreground">Type at least 3 characters to search</p>
            )}

            {/* Search results */}
            {searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-2 rounded-md border"
                  >
                    <span className="text-sm">{user.email}</span>
                    <Button
                      size="sm"
                      onClick={() => handleAddContributor(user)}
                      disabled={adding}
                    >
                      {adding ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
