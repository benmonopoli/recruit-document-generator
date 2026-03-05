import { Layout } from "@/components/Layout";
import { ProjectList } from "@/components/ProjectList";
import { SharedProjectsList } from "@/components/SharedProjectsList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Library() {
  return (
    <Layout>
      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-8">
          <h1 className="text-3xl font-bold mb-2">Project Library</h1>
          <p className="text-muted-foreground mb-8">
            Browse your projects, shared projects, and public templates.
          </p>

          <Tabs defaultValue="my-projects">
            <TabsList className="mb-6">
              <TabsTrigger value="my-projects">My Projects</TabsTrigger>
              <TabsTrigger value="shared-with-me">Shared with Me</TabsTrigger>
              <TabsTrigger value="public">Public Projects</TabsTrigger>
            </TabsList>

            <TabsContent value="my-projects">
              <ProjectList />
            </TabsContent>

            <TabsContent value="shared-with-me">
              <SharedProjectsList />
            </TabsContent>

            <TabsContent value="public">
              <ProjectList showPublic />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}
