import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { ProjectSection } from "@/components/ProjectSection";
import { ProjectDashboard } from "@/components/ProjectDashboard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Home, Briefcase, MessageSquare, ClipboardList, FileQuestion } from "lucide-react";
import { ContributorManager } from "@/components/ContributorManager";
import { useAuth } from "@/hooks/useAuth";
import { 
  fetchProject, 
  fetchChatMessages, 
  fetchJobDescriptions, 
  fetchInterviewQuestions,
  fetchTestTasks,
  fetchApplicationQuestions,
  createJobDescription, 
  createInterviewQuestion, 
  createTestTask, 
  createApplicationQuestion, 
  createChatMessage,
  deleteChatMessages,
} from "@/lib/api";
import type { Project, ChatMessage, ToneSettings, GreenhouseJob, ContentType, CandidateContext } from "@/types";
import { toast } from "sonner";
import { DEFAULT_TONE_SETTINGS } from "@/lib/constants";

// Section state type
interface SectionState {
  messages: ChatMessage[];
  content: string;
  hasLoaded: boolean;
}

export default function ProjectPage() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<ContentType | "home">("home");
  const [selectedJob, setSelectedJob] = useState<GreenhouseJob | null>(null);
  
  // Per-section state
  const [sectionStates, setSectionStates] = useState<Record<ContentType, SectionState>>({
    job_description: { messages: [], content: "", hasLoaded: false },
    interview_questions: { messages: [], content: "", hasLoaded: false },
    test_task: { messages: [], content: "", hasLoaded: false },
    application_questions: { messages: [], content: "", hasLoaded: false },
  });

  const [tone, setTone] = useState<ToneSettings>(DEFAULT_TONE_SETTINGS);

  const [candidateContext, setCandidateContext] = useState<CandidateContext>({});

  useEffect(() => {
    if (!id) return;
    loadProject();
  }, [id]);

  // Load section data when section changes - force reload to ensure fresh data
  useEffect(() => {
    if (!id || activeSection === "home") return;
    loadSectionData(activeSection as ContentType, true);
  }, [id, activeSection]);

  const loadProject = async () => {
    try {
      const proj = await fetchProject(id!);
      setProject(proj);
    } catch (error) {
      toast.error("Failed to load project");
    } finally {
      setLoading(false);
    }
  };

  const loadSectionData = async (section: ContentType, forceReload = false) => {
    // Don't reload if already loaded (unless forced)
    if (sectionStates[section].hasLoaded && !forceReload) return;

    try {
      const [msgs, content] = await Promise.all([
        fetchChatMessages(id!, section),
        getSectionContent(section),
      ]);

      setSectionStates(prev => ({
        ...prev,
        [section]: {
          messages: msgs,
          content: content,
          hasLoaded: true,
        },
      }));
    } catch (error) {
      console.error(`Failed to load ${section} data:`, error);
    }
  };

  const getSectionContent = async (section: ContentType): Promise<string> => {
    switch (section) {
      case "job_description": {
        const jds = await fetchJobDescriptions(id!);
        return jds[0]?.content || "";
      }
      case "interview_questions": {
        const qs = await fetchInterviewQuestions(id!);
        return qs[0]?.question || "";
      }
      case "test_task": {
        const tasks = await fetchTestTasks(id!);
        return tasks[0]?.problem_statement || "";
      }
      case "application_questions": {
        const qs = await fetchApplicationQuestions(id!);
        return qs[0]?.question || "";
      }
      default:
        return "";
    }
  };

  const handleClearChat = async (section: ContentType) => {
    if (!id) return;
    try {
      await deleteChatMessages(id, section);
      setSectionStates(prev => ({
        ...prev,
        [section]: { ...prev[section], messages: [] },
      }));
    } catch (error) {
      toast.error("Failed to clear chat");
    }
  };

  const handleSelectJobAsTemplate = async (job: GreenhouseJob) => {
    setSelectedJob(job);
    if (!id) return;
    
    const templateMessage = `I'd like to use the "${job.title}" role as a template. Please help me iterate on this for a new role.`;
    
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      project_id: id,
      role: "user",
      content: templateMessage,
      created_at: new Date().toISOString(),
    };
    
    setSectionStates(prev => ({
      ...prev,
      job_description: {
        ...prev.job_description,
        messages: [...prev.job_description.messages, userMessage],
      },
    }));
    
    try {
      await createChatMessage({
        project_id: id,
        role: "user",
        content: templateMessage,
      });
    } catch (error) {
      console.error("Failed to save template message:", error);
    }
    
    toast.success(`Using "${job.title}" as template`);
  };

  const updateSectionMessages = (section: ContentType, messages: ChatMessage[]) => {
    setSectionStates(prev => ({
      ...prev,
      [section]: { ...prev[section], messages },
    }));
  };

  const updateSectionContent = (section: ContentType, content: string) => {
    setSectionStates(prev => ({
      ...prev,
      [section]: { ...prev[section], content },
    }));
  };

  const handleContentGenerated = async (section: ContentType, content: string) => {
    if (!id) return;
    updateSectionContent(section, content);
  };

  const handleSaveContent = async (section: ContentType) => {
    if (!id) return;
    
    const content = sectionStates[section].content;
    if (!content?.trim()) return;

    switch (section) {
      case "job_description":
        // Extract job title from content (first heading or first line)
        const extractJobTitle = (text: string): string => {
          const lines = text.split('\n').filter(line => line.trim());
          for (const line of lines) {
            // Check for markdown heading
            const headingMatch = line.match(/^#+\s*(.+)$/);
            if (headingMatch) return headingMatch[1].trim();
            // Check for bold title
            const boldMatch = line.match(/^\*\*(.+?)\*\*/);
            if (boldMatch) return boldMatch[1].trim();
            // Use first non-empty line as fallback
            if (line.trim() && !line.startsWith('-') && !line.startsWith('*')) {
              return line.trim().substring(0, 100);
            }
          }
          return project?.name || "Generated JD";
        };
        
        await createJobDescription({
          project_id: id,
          title: extractJobTitle(content),
          content,
          tone_formal_casual: Math.round(tone.formal_casual * 100),
          tone_serious_playful: Math.round(tone.serious_playful * 100),
          tone_concise_detailed: Math.round(tone.concise_detailed * 100),
          tone_traditional_unconventional: Math.round(tone.traditional_unconventional * 100),
        });
        break;
      case "interview_questions":
        await createInterviewQuestion({
          project_id: id,
          question: content,
          question_type: "behavioral",
          stage: "phone_screen",
        });
        break;
      case "test_task":
        await createTestTask({
          project_id: id,
          title: project?.name ? `${project.name} Test Task` : "Test Task",
          problem_statement: content,
        });
        break;
      case "application_questions":
        await createApplicationQuestion({
          project_id: id,
          question: content,
        });
        break;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex-1 p-8">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-[600px]" />
        </div>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Project not found</p>
        </div>
      </Layout>
    );
  }

  const sectionTabs: { id: ContentType | "home"; label: string; icon: React.ReactNode }[] = [
    { id: "home", label: "Home", icon: <Home className="h-4 w-4" /> },
    { id: "job_description", label: "Job Description", icon: <Briefcase className="h-4 w-4" /> },
    { id: "interview_questions", label: "Interview Questions", icon: <MessageSquare className="h-4 w-4" /> },
    { id: "test_task", label: "Test Task", icon: <ClipboardList className="h-4 w-4" /> },
    { id: "application_questions", label: "Application Questions", icon: <FileQuestion className="h-4 w-4" /> },
  ];

  return (
    <Layout>
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header with section tabs */}
        <header className="border-b border-border">
          <div className="px-6 py-4 flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">{project.name}</h1>
              {project.department && (
                <p className="text-muted-foreground">{project.department}</p>
              )}
            </div>
            <ContributorManager projectId={id!} isOwner={project.created_by === user?.id} />
          </div>
          
          {/* Section tabs */}
          <div className="px-6">
            <Tabs value={activeSection} onValueChange={(v) => setActiveSection(v as ContentType | "home")}>
              <TabsList className="h-auto p-1 bg-muted/50">
                {sectionTabs.map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="flex items-center gap-2 px-4 py-2"
                  >
                    {tab.icon}
                    <span className="hidden sm:inline">{tab.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </header>

        {/* Main content based on active section */}
        <div className="flex-1 flex overflow-hidden">
          {activeSection === "home" ? (
            <ProjectDashboard
              projectId={id!}
              projectName={project.name}
              department={project.department || undefined}
              onNavigateToSection={(section) => setActiveSection(section)}
            />
          ) : (
            <ProjectSection
              projectId={id!}
              projectName={project.name}
              department={project.department || undefined}
              sectionType={activeSection as ContentType}
              messages={sectionStates[activeSection as ContentType].messages}
              onMessagesChange={(msgs) => updateSectionMessages(activeSection as ContentType, msgs)}
              content={sectionStates[activeSection as ContentType].content}
              onContentChange={(content) => updateSectionContent(activeSection as ContentType, content)}
              onContentGenerated={(content) => handleContentGenerated(activeSection as ContentType, content)}
              onSaveContent={() => handleSaveContent(activeSection as ContentType)}
              onClearChat={() => handleClearChat(activeSection as ContentType)}
              selectedJob={selectedJob || undefined}
              tone={tone}
              onToneChange={setTone}
              jobDescriptionContent={sectionStates.job_description.content}
              candidateContext={candidateContext}
              onCandidateContextChange={setCandidateContext}
            />
          )}
        </div>
      </div>
    </Layout>
  );
}
