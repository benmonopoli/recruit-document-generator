import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { createProject } from "@/lib/api";
import { searchUsersByEmail } from "@/lib/sharing";
import { toast } from "sonner";
import { Loader2, Globe, Lock, X, Search, Plus } from "lucide-react";
import type { RegisteredUser } from "@/types";

const DEPARTMENTS = [
  "Engineering",
  "Product",
  "Design",
  "Marketing",
  "Sales",
  "Customer Success",
  "Operations",
  "HR",
  "Finance",
  "Legal",
];

export default function NewProject() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    department: "",
    description: "",
    visibility: "private" as "private" | "public",
  });

  // Contributor management
  const [contributors, setContributors] = useState<RegisteredUser[]>([]);
  const [searchEmail, setSearchEmail] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<RegisteredUser[]>([]);

  const handleSearch = async () => {
    if (!searchEmail.trim() || searchEmail.length < 3) {
      toast.error("Please enter at least 3 characters");
      return;
    }

    setSearching(true);
    try {
      const users = await searchUsersByEmail(searchEmail);
      // Filter out already added contributors
      const existingIds = contributors.map(c => c.id);
      setSearchResults(users.filter(u => !existingIds.includes(u.id)));
    } catch (error) {
      toast.error("Failed to search users");
    } finally {
      setSearching(false);
    }
  };

  const addContributor = (user: RegisteredUser) => {
    setContributors(prev => [...prev, user]);
    setSearchResults(prev => prev.filter(u => u.id !== user.id));
    setSearchEmail("");
  };

  const removeContributor = (userId: string) => {
    setContributors(prev => prev.filter(c => c.id !== userId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Please enter a project name");
      return;
    }

    setLoading(true);
    try {
      const project = await createProject({
        name: form.name,
        department: form.department,
        description: form.description,
        visibility: form.visibility,
        contributorIds: contributors.map(c => c.id),
      });
      toast.success("Project created!");
      navigate(`/project/${project.id}`);
    } catch (error) {
      toast.error("Failed to create project");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto p-8">
          <h1 className="text-3xl font-bold mb-2">New Project</h1>
          <p className="text-muted-foreground mb-8">
            Create a new recruiting project to generate job descriptions and hiring content.
          </p>

          <Card>
            <CardHeader>
              <CardTitle>Project Details</CardTitle>
              <CardDescription>
                Tell us about the role you're hiring for.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Project Name *</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g., Senior Backend Engineer"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Select
                    value={form.department}
                    onValueChange={(v) => setForm({ ...form, department: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Brief description of the role..."
                    rows={3}
                  />
                </div>

                {/* Visibility selection */}
                <div className="space-y-3">
                  <Label>Visibility</Label>
                  <RadioGroup
                    value={form.visibility}
                    onValueChange={(v) => setForm({ ...form, visibility: v as "private" | "public" })}
                    className="grid grid-cols-2 gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="private" id="private" />
                      <Label htmlFor="private" className="flex items-center gap-2 cursor-pointer">
                        <Lock className="h-4 w-4" />
                        Private
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="public" id="public" />
                      <Label htmlFor="public" className="flex items-center gap-2 cursor-pointer">
                        <Globe className="h-4 w-4" />
                        Public
                      </Label>
                    </div>
                  </RadioGroup>
                  <p className="text-sm text-muted-foreground">
                    {form.visibility === "public"
                      ? "Anyone can discover and clone this project."
                      : "Only you and contributors can access this project."}
                  </p>
                </div>

                {/* Contributors section */}
                <div className="space-y-3">
                  <Label>Contributors (Optional)</Label>
                  <p className="text-sm text-muted-foreground">
                    Add team members who can edit this project.
                  </p>

                  {/* Current contributors */}
                  {contributors.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {contributors.map((contributor) => (
                        <Badge key={contributor.id} variant="secondary" className="gap-1 pr-1">
                          {contributor.email}
                          <button
                            type="button"
                            onClick={() => removeContributor(contributor.id)}
                            className="ml-1 hover:bg-muted rounded"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Search for contributors */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Search by email..."
                      value={searchEmail}
                      onChange={(e) => setSearchEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleSearch())}
                    />
                    <Button type="button" variant="outline" onClick={handleSearch} disabled={searching}>
                      {searching ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {/* Search results */}
                  {searchResults.length > 0 && (
                    <div className="space-y-2 border rounded-md p-2">
                      {searchResults.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-2 rounded hover:bg-muted/50"
                        >
                          <span className="text-sm">{user.email}</span>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => addContributor(user)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create Project
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
