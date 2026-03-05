import { useNavigate, useSearchParams } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { QuickGen } from "@/components/QuickGen";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FilePlus2, FolderOpen, Zap } from "lucide-react";
import type { ContentType } from "@/types";

export default function Index() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const quickgenType = searchParams.get("quickgen") as ContentType | null;

  return (
    <Layout>
      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto p-8">
          {/* Hero */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Zap className="h-4 w-4" />
              AI-Powered Recruiting Documents
            </div>
            <h1 className="text-4xl font-bold mb-4 font-sans">Recruit Document Generation</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Create compelling job descriptions, interview questions, test tasks, and
              application forms with AI assistance.
            </p>
          </div>

          {/* Cards */}
          <div className="space-y-4">
            {/* Create New Project */}
            <Card 
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => navigate("/new")}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FilePlus2 className="h-5 w-5 text-primary" />
                  Create New Project
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-lg text-muted-foreground">
                  Create job descriptions, interview question banks, and test tasks for your open roles.
                </p>
              </CardContent>
            </Card>

            {/* View Existing Projects */}
            <Card 
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => navigate("/library")}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FolderOpen className="h-5 w-5 text-primary" />
                  View Existing Projects
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-lg text-muted-foreground">
                  Browse and manage your saved recruiting projects
                </p>
              </CardContent>
            </Card>

            {/* Quick Gen */}
            <QuickGen initialType={quickgenType} />
          </div>
        </div>
      </div>
    </Layout>
  );
}
