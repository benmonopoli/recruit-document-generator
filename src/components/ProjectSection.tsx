import { useState, useRef, useEffect } from "react";
import { ChatInterface, ChatInterfaceHandle } from "@/components/ChatInterface";
import { ContentEditor } from "@/components/ContentEditor";
import { ToneControls } from "@/components/ToneControls";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, RefreshCw, SlidersHorizontal, Search, Briefcase, X, Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { generateCleanPDF } from "@/lib/pdfExport";
import type { ChatMessage, ToneSettings, GreenhouseJob, ContentType, CandidateContext } from "@/types";

interface CachedGreenhouseJob {
  id: string;
  title: string;
  department: string | null;
  location: string | null;
  status: string | null;
}


interface ProjectSectionProps {
  projectId: string;
  projectName: string;
  department?: string;
  sectionType: ContentType;
  messages: ChatMessage[];
  onMessagesChange: (messages: ChatMessage[]) => void;
  content: string;
  onContentChange: (content: string) => void;
  onContentGenerated: (content: string) => void;
  onSaveContent: () => Promise<void>;
  onClearChat?: () => Promise<void>;
  selectedJob?: GreenhouseJob;
  tone: ToneSettings;
  onToneChange: (tone: ToneSettings) => void;
  jobDescriptionContent?: string; // Shared JD content for context
  candidateContext?: CandidateContext;
  onCandidateContextChange?: (context: CandidateContext) => void;
}

const SECTION_LABELS: Record<ContentType, { title: string; previewTitle: string; refreshPrompt: string }> = {
  job_description: {
    title: "Job Description",
    previewTitle: "Job Description Preview",
    refreshPrompt: "Please regenerate the job description with the current settings.",
  },
  interview_questions: {
    title: "Interview Questions",
    previewTitle: "Interview Questions Preview",
    refreshPrompt: "Please regenerate the interview questions with the current settings.",
  },
  test_task: {
    title: "Test Task",
    previewTitle: "Test Task Preview",
    refreshPrompt: "Please regenerate the test task with the current settings.",
  },
  application_questions: {
    title: "Application Questions",
    previewTitle: "Application Questions Preview",
    refreshPrompt: "Please regenerate the application questions with the current settings.",
  },
};

export function ProjectSection({
  projectId,
  projectName,
  department,
  sectionType,
  messages,
  onMessagesChange,
  content,
  onContentChange,
  onContentGenerated,
  onSaveContent,
  onClearChat,
  selectedJob,
  tone,
  onToneChange,
  jobDescriptionContent,
  candidateContext,
  onCandidateContextChange,
}: ProjectSectionProps) {
  const [streamingPreview, setStreamingPreview] = useState("");
  const [toneOpen, setToneOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // Track which section we've shown the welcome for
  const [welcomeShownForSection, setWelcomeShownForSection] = useState<ContentType | null>(null);
  const chatRef = useRef<ChatInterfaceHandle>(null);
  
  // Past roles search state
  const [rolesSearchOpen, setRolesSearchOpen] = useState(false);
  const [jobSearchQuery, setJobSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<CachedGreenhouseJob[]>([]);

  const labels = SECTION_LABELS[sectionType];

  // Reset search state when section changes
  useEffect(() => {
    setRolesSearchOpen(false);
    setJobSearchQuery("");
    setSearchResults([]);
  }, [sectionType]);

  // Show welcome message when entering a section with existing content but no messages
  useEffect(() => {
    // Only show welcome if:
    // 1. There's existing content
    // 2. No messages yet for this section  
    // 3. We haven't already shown welcome for THIS specific section
    const hasContent = content && content.trim().length > 0;
    const noMessages = messages.length === 0;
    const notYetWelcomed = welcomeShownForSection !== sectionType;
    
    if (hasContent && noMessages && notYetWelcomed) {
      const welcomeMessage: ChatMessage = {
        id: crypto.randomUUID(),
        project_id: projectId,
        role: "assistant",
        content: `I found an existing ${labels.title.toLowerCase()} for this project. Would you like to continue editing it, or start fresh?\n\n[[Continue editing|continue_editing]]\n[[Start fresh|start_fresh]]`,
        created_at: new Date().toISOString(),
        section_type: sectionType,
      };
      onMessagesChange([welcomeMessage]);
      setWelcomeShownForSection(sectionType);
    }
  }, [content, messages.length, sectionType, welcomeShownForSection, labels.title, projectId, onMessagesChange]);

  const handleRefreshPreview = () => {
    if (!chatRef.current) return;
    setIsRefreshing(true);
    chatRef.current.sendMessage(labels.refreshPrompt);
  };

  const handleContentGenerated = (generatedContent: string) => {
    setIsRefreshing(false);
    setStreamingPreview("");
    onContentGenerated(generatedContent);
  };

  const handleStreamingContent = (streamContent: string) => {
    setStreamingPreview(streamContent);
  };

  const handleSave = async () => {
    if (!content?.trim()) return;
    setIsSaving(true);
    try {
      await onSaveContent();
      toast.success("Saved to project");
    } catch (error) {
      toast.error("Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  // Search past roles
  const searchJobs = async () => {
    if (!jobSearchQuery.trim()) return;

    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("greenhouse", {
        body: { action: "search_jobs", query: jobSearchQuery },
      });

      if (error) throw error;
      setSearchResults(data?.jobs || []);
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Failed to search jobs");
    } finally {
      setIsSearching(false);
    }
  };

  // Select a job from search results
  const selectJob = async (job: CachedGreenhouseJob) => {
    if (!chatRef.current) return;
    
    try {
      // Fetch full job details
      const { data, error } = await supabase.functions.invoke("greenhouse", {
        body: { action: "get_job", jobId: job.id },
      });

      if (error) throw error;

      const jobDetails = data?.job;
      if (jobDetails) {
        // Build concise location/dept info
        const details = [jobDetails.department, jobDetails.location].filter(Boolean).join(", ");
        
        // Send a simple message - the AI will summarize the role intelligently
        const contextMessage = `I'd like to use "${jobDetails.title}"${details ? ` (${details})` : ""} as a template.`;

        chatRef.current.sendMessage(contextMessage);
        setRolesSearchOpen(false);
        setJobSearchQuery("");
        setSearchResults([]);
        toast.success(`Using "${jobDetails.title}" as template`);
      }
    } catch (error) {
      console.error("Error fetching job:", error);
      toast.error("Failed to load job details");
    }
  };

  // Download job as PDF
  const downloadJobAsPDF = async (job: CachedGreenhouseJob, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const { data, error } = await supabase.functions.invoke("greenhouse", {
        body: { action: "get_job", jobId: job.id },
      });

      if (error) throw error;

      const jobDetails = data?.job;
      if (jobDetails) {
        // Convert job details to clean markdown format
        const content = `# ${jobDetails.title}

${jobDetails.department ? `**Department:** ${jobDetails.department}` : ""}
${jobDetails.location ? `**Location:** ${jobDetails.location}` : ""}
${jobDetails.employment_type ? `**Employment Type:** ${jobDetails.employment_type}` : ""}

## About the Role

${jobDetails.description ? jobDetails.description.replace(/<[^>]*>/g, "").trim() : ""}

${jobDetails.requirements ? `## Requirements

${jobDetails.requirements.replace(/<[^>]*>/g, "").trim()}` : ""}`;

        generateCleanPDF(content, jobDetails.title);
        toast.success("Downloaded as PDF");
      }
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast.error("Failed to download PDF");
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      searchJobs();
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Chat panel */}
      <div className="w-1/2 border-r border-border flex flex-col">
        <ChatInterface
          ref={chatRef}
          projectId={projectId}
          messages={messages}
          onMessagesChange={onMessagesChange}
          onClearChat={onClearChat}
          context={{
            projectName,
            department,
            tone,
            greenhouseData: selectedJob,
            jobDescriptionContent: sectionType !== "job_description" ? jobDescriptionContent : undefined,
            sectionType,
            candidateContext,
            existingContent: content, // Pass current content for editing mode
          }}
          onContentGenerated={handleContentGenerated}
          onStreamingContent={handleStreamingContent}
          candidateContext={candidateContext}
          onCandidateContextChange={onCandidateContextChange}
          sectionType={sectionType}
        />
      </div>

      {/* Preview panel */}
      <div className="w-1/2 flex flex-col overflow-hidden p-4 gap-3">
        {/* Tone dropdown and refresh button */}
        <div className="flex items-center gap-2">
          <Collapsible open={toneOpen} onOpenChange={setToneOpen} className="flex-1">
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  Tone Settings
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${toneOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 p-4 border rounded-lg bg-muted/30">
              <ToneControls value={tone} onChange={onToneChange} />
            </CollapsibleContent>
          </Collapsible>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshPreview}
            disabled={isRefreshing || !messages.length}
            className="shrink-0"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Past Roles Search */}
        <Collapsible open={rolesSearchOpen} onOpenChange={setRolesSearchOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Search Past Roles
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${rolesSearchOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 p-4 border rounded-lg bg-muted/30 space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search existing roles..."
                  value={jobSearchQuery}
                  onChange={(e) => setJobSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  className="pl-9 h-9"
                />
                {jobSearchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                    onClick={() => {
                      setJobSearchQuery("");
                      setSearchResults([]);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <Button
                size="sm"
                onClick={searchJobs}
                disabled={isSearching || !jobSearchQuery.trim()}
              >
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Search"
                )}
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {searchResults.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center gap-2 p-2 rounded-md border border-border/50 bg-background/50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{job.title}</div>
                      {job.department && (
                        <div className="text-xs text-muted-foreground">{job.department}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => selectJob(job)}
                      >
                        Use as Template
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                        onClick={(e) => downloadJobAsPDF(job, e)}
                        title="Download PDF"
                      >
                        <Download className="h-3.5 w-3.5 mr-1" />
                        PDF
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {searchResults.length === 0 && jobSearchQuery && !isSearching && (
              <p className="text-sm text-muted-foreground text-center py-2">
                No roles found. Try a different search term.
              </p>
            )}
          </CollapsibleContent>
        </Collapsible>

        <div className="flex-1 min-h-0">
          <ContentEditor
            content={streamingPreview || content}
            onChange={onContentChange}
            title={labels.previewTitle}
            readOnly={!!streamingPreview}
            onSave={handleSave}
            isSaving={isSaving}
            showSaveButton={!!content?.trim()}
            isStreaming={!!streamingPreview}
          />
        </div>
      </div>
    </div>
  );
}
