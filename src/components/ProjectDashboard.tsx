import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  Briefcase, 
  MessageSquare, 
  ClipboardList, 
  FileQuestion, 
  FileText,
  Calendar,
  ChevronRight,
  ChevronDown,
  FolderOpen,
  Download,
  MessageCircle,
  Edit3,
  Share2,
  Eye
} from "lucide-react";
import { 
  fetchJobDescriptions, 
  fetchInterviewQuestions, 
  fetchTestTasks, 
  fetchApplicationQuestions,
  updateJobDescription,
  updateTestTask,
} from "@/lib/api";
import type { JobDescription, InterviewQuestion, TestTask, ApplicationQuestion, ContentType } from "@/types";
import { format } from "date-fns";
import { generateCleanPDF } from "@/lib/pdfExport";
import { DocumentEditorModal } from "@/components/DocumentEditorModal";
import { ShareDialog } from "@/components/ShareDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import ReactMarkdown from "react-markdown";

interface ProjectDashboardProps {
  projectId: string;
  projectName: string;
  department?: string;
  onNavigateToSection: (section: ContentType) => void;
}

interface DocumentCounts {
  jobDescriptions: number;
  interviewQuestions: number;
  testTasks: number;
  applicationQuestions: number;
}

export function ProjectDashboard({ 
  projectId, 
  projectName, 
  department,
  onNavigateToSection 
}: ProjectDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [jobDescriptions, setJobDescriptions] = useState<JobDescription[]>([]);
  const [interviewQuestions, setInterviewQuestions] = useState<InterviewQuestion[]>([]);
  const [testTasks, setTestTasks] = useState<TestTask[]>([]);
  const [applicationQuestions, setApplicationQuestions] = useState<ApplicationQuestion[]>([]);
  
  // Editor modal state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<{
    id: string;
    title: string;
    content: string;
    sectionType: ContentType;
  } | null>(null);

  useEffect(() => {
    loadAllDocuments();
  }, [projectId]);

  const loadAllDocuments = async () => {
    try {
      const [jds, iqs, tts, aqs] = await Promise.all([
        fetchJobDescriptions(projectId),
        fetchInterviewQuestions(projectId),
        fetchTestTasks(projectId),
        fetchApplicationQuestions(projectId),
      ]);
      setJobDescriptions(jds);
      setInterviewQuestions(iqs);
      setTestTasks(tts);
      setApplicationQuestions(aqs);
    } catch (error) {
      console.error("Failed to load documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditDocument = (doc: { id: string; title: string; content: string; sectionType: ContentType }) => {
    setEditingDocument(doc);
    setEditorOpen(true);
  };

  const handleSaveDocument = async (content: string) => {
    if (!editingDocument) return;
    
    if (editingDocument.sectionType === "job_description") {
      await updateJobDescription(editingDocument.id, { content });
      setJobDescriptions(prev => 
        prev.map(jd => jd.id === editingDocument.id ? { ...jd, content } : jd)
      );
    } else if (editingDocument.sectionType === "test_task") {
      await updateTestTask(editingDocument.id, { problem_statement: content });
      setTestTasks(prev =>
        prev.map(t => t.id === editingDocument.id ? { ...t, problem_statement: content } : t)
      );
    }
    // Note: interview_questions and application_questions don't have update functions yet
  };

  const counts: DocumentCounts = {
    jobDescriptions: jobDescriptions.length,
    interviewQuestions: interviewQuestions.length,
    testTasks: testTasks.length,
    applicationQuestions: applicationQuestions.length,
  };

  const totalDocuments = Object.values(counts).reduce((a, b) => a + b, 0);

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const handleDownload = (title: string, content: string, version?: number) => {
    const versionText = version ? ` (v${version})` : "";
    const filename = `${title}${versionText}`;
    generateCleanPDF(content, filename);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const sectionCards = [
    {
      id: "job_description" as ContentType,
      title: "Job Descriptions",
      count: counts.jobDescriptions,
      icon: Briefcase,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      id: "interview_questions" as ContentType,
      title: "Interview Questions",
      count: counts.interviewQuestions,
      icon: MessageSquare,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      id: "test_task" as ContentType,
      title: "Test Tasks",
      count: counts.testTasks,
      icon: ClipboardList,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      id: "application_questions" as ContentType,
      title: "Application Questions",
      count: counts.applicationQuestions,
      icon: FileQuestion,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
  ];

  return (
    <ScrollArea className="flex-1">
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        {/* Project Overview */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FolderOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Project Overview</h2>
                {department && (
                  <p className="text-sm text-muted-foreground">{department}</p>
                )}
              </div>
            </div>
          </div>
          <Badge variant="secondary" className="text-sm">
            {totalDocuments} {totalDocuments === 1 ? "document" : "documents"}
          </Badge>
        </div>

        {/* Document Section Cards with Expandable Lists */}
        <div className="space-y-4">
          {sectionCards.map((section) => {
            const isExpanded = expandedSections[section.id] || false;
            const documents = section.id === "job_description" ? jobDescriptions :
                             section.id === "interview_questions" ? interviewQuestions :
                             section.id === "test_task" ? testTasks : applicationQuestions;
            
            return (
              <Collapsible key={section.id} open={isExpanded} onOpenChange={() => toggleSection(section.id)}>
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardContent className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-lg ${section.bgColor} flex items-center justify-center`}>
                            <section.icon className={`h-5 w-5 ${section.color}`} />
                          </div>
                          <div>
                            <p className="font-semibold">{section.title}</p>
                            <p className="text-sm text-muted-foreground">{section.count} documents</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigateToSection(section.id);
                            }}
                          >
                            Go to section
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="border-t px-4 pb-4">
                      {documents.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">No documents yet</p>
                      ) : (
                        <div className="space-y-2 pt-3">
                          {section.id === "job_description" && jobDescriptions.map((jd) => (
                            <div 
                              key={jd.id}
                              className="flex items-center justify-between p-3 rounded-lg border bg-background"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-muted-foreground">{projectName}</p>
                                <p className="font-bold truncate">{jd.title}</p>
                                <p className="text-sm text-muted-foreground">Version {jd.version}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditDocument({
                                    id: jd.id,
                                    title: jd.title,
                                    content: jd.content,
                                    sectionType: "job_description",
                                  })}
                                >
                                  <Edit3 className="h-4 w-4 mr-1" />
                                  Edit
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => onNavigateToSection("job_description")}
                                >
                                  <MessageCircle className="h-4 w-4 mr-1" />
                                  Chat
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDownload(jd.title, jd.content, jd.version)}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                          {section.id === "test_task" && testTasks.map((task) => (
                            <div 
                              key={task.id}
                              className="flex items-center justify-between p-3 rounded-lg border bg-background"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-bold">{task.title}</p>
                                <p className="text-sm text-muted-foreground">
                                  {format(new Date(task.created_at), "MMM d, yyyy")}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditDocument({
                                    id: task.id,
                                    title: task.title,
                                    content: task.problem_statement,
                                    sectionType: "test_task",
                                  })}
                                >
                                  <Edit3 className="h-4 w-4 mr-1" />
                                  Edit
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => onNavigateToSection("test_task")}
                                >
                                  <MessageCircle className="h-4 w-4 mr-1" />
                                  Chat
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDownload(task.title, task.problem_statement)}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                          {section.id === "interview_questions" && (
                            <div className="flex items-center justify-between p-3 rounded-lg border bg-background">
                              <div className="flex-1 min-w-0">
                                <p className="font-bold">{interviewQuestions.length} Questions</p>
                                <p className="text-sm text-muted-foreground">Interview question bank</p>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onNavigateToSection("interview_questions")}
                              >
                                <MessageCircle className="h-4 w-4 mr-1" />
                                View All
                              </Button>
                            </div>
                          )}
                          {section.id === "application_questions" && (
                            <div className="flex items-center justify-between p-3 rounded-lg border bg-background">
                              <div className="flex-1 min-w-0">
                                <p className="font-bold">{applicationQuestions.length} Questions</p>
                                <p className="text-sm text-muted-foreground">Application form questions</p>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onNavigateToSection("application_questions")}
                              >
                                <MessageCircle className="h-4 w-4 mr-1" />
                                View All
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>

        {/* Recent Documents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Recent Documents
            </CardTitle>
            <CardDescription>
              Your latest generated content across all sections
            </CardDescription>
          </CardHeader>
          <CardContent>
            {totalDocuments === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No documents yet</p>
                <p className="text-sm mt-1">Start by creating a job description or other content</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => onNavigateToSection("job_description")}
                >
                  Create Job Description
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Recent Job Descriptions */}
                {jobDescriptions.slice(0, 5).map((jd) => (
                  <div 
                    key={jd.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="h-8 w-8 rounded bg-blue-500/10 flex items-center justify-center shrink-0">
                        <Briefcase className="h-4 w-4 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-muted-foreground">{projectName}</p>
                        <p className="font-bold truncate">{jd.title}</p>
                        <p className="text-sm text-muted-foreground">
                          Version {jd.version} • {format(new Date(jd.created_at), "MMM d")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>{jd.title}</DialogTitle>
                          </DialogHeader>
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown>{jd.content}</ReactMarkdown>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditDocument({
                          id: jd.id,
                          title: jd.title,
                          content: jd.content,
                          sectionType: "job_description",
                        })}
                      >
                        <Edit3 className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <ShareDialog
                        documentType="job_description"
                        title={jd.title}
                        content={jd.content}
                        sourceProjectId={projectId}
                        trigger={
                          <Button variant="outline" size="sm">
                            <Share2 className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(jd.title, jd.content, jd.version)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Recent Test Tasks */}
                {testTasks.slice(0, 3).map((task) => (
                  <div 
                    key={task.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="h-8 w-8 rounded bg-orange-500/10 flex items-center justify-center shrink-0">
                        <ClipboardList className="h-4 w-4 text-orange-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold truncate">{task.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(task.created_at), "MMM d")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>{task.title}</DialogTitle>
                          </DialogHeader>
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown>{task.problem_statement}</ReactMarkdown>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditDocument({
                          id: task.id,
                          title: task.title,
                          content: task.problem_statement,
                          sectionType: "test_task",
                        })}
                      >
                        <Edit3 className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <ShareDialog
                        documentType="test_task"
                        title={task.title}
                        content={task.problem_statement}
                        sourceProjectId={projectId}
                        trigger={
                          <Button variant="outline" size="sm">
                            <Share2 className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(task.title, task.problem_statement)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Document Editor Modal */}
      {editingDocument && (
        <DocumentEditorModal
          open={editorOpen}
          onOpenChange={setEditorOpen}
          documentId={editingDocument.id}
          documentTitle={editingDocument.title}
          documentContent={editingDocument.content}
          projectId={projectId}
          projectName={projectName}
          department={department}
          sectionType={editingDocument.sectionType}
          onSave={handleSaveDocument}
        />
      )}
    </ScrollArea>
  );
}