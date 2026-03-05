import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2, Bot, User, Download, Save, FolderOpen, FileText, MessageSquare, ClipboardList, Users, Zap, Upload, Search, X, Briefcase, ChevronDown, ChevronUp, Plus, Copy, Check, Pencil, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { streamGenerate } from "@/lib/ai";
import { fetchProjects, createProject, createJobDescription, createInterviewQuestion, createTestTask, createApplicationQuestion } from "@/lib/api";
import { toast } from "sonner";
import { generateCleanPDF, extractTitleFromContent } from "@/lib/pdfExport";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import type { Project, ContentType, ToneSettings } from "@/types";
import { ToneControls } from "@/components/ToneControls";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface GreenhouseJob {
  id: string;
  title: string;
  department: string | null;
  location: string | null;
  status: string | null;
}

const CONTENT_TYPES: { label: string; value: ContentType; Icon: typeof FileText }[] = [
  { label: "Job Description", value: "job_description", Icon: FileText },
  { label: "Interview Q's", value: "interview_questions", Icon: MessageSquare },
  { label: "Test Task", value: "test_task", Icon: ClipboardList },
  { label: "Application Q's", value: "application_questions", Icon: Users },
];

interface QuickGenProps {
  initialType?: ContentType | null;
}

// Copy button component with feedback
function CopyButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };
  
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 text-sm gap-1"
      onClick={handleCopy}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

export function QuickGen({ initialType }: QuickGenProps) {
  const [selectedType, setSelectedType] = useState<ContentType | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState("");
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initializedRef = useRef(false);
  
  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedContext, setUploadedContext] = useState<string | null>(null);
  
  // Search state
  const [showJobSearch, setShowJobSearch] = useState(false);
  const [jobSearchQuery, setJobSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<GreenhouseJob[]>([]);
  
  // Content expansion state
  const [isContentExpanded, setIsContentExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  
  // New project creation state
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  // Tone settings state - using shared constant
  const [toneSettings, setToneSettings] = useState<ToneSettings>(() => {
    // Import dynamically to avoid circular dependency issues
    return {
      formal_casual: 0.4,
      serious_playful: 0.3,
      concise_detailed: 0.5,
      traditional_unconventional: 0.4,
      preset: "company-standard",
    };
  });
  
  // Throttle ref for streaming updates
  const lastUpdateTimeRef = useRef(0);
  const UPDATE_THROTTLE_MS = 50;

  useEffect(() => {
    if (initialType && !initializedRef.current) {
      initializedRef.current = true;
      handleTypeSelect(initialType);
    } else if (!initialType) {
      initializedRef.current = false;
    }
  }, [initialType]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleTypeSelect = (type: ContentType) => {
    setSelectedType(type);
    setMessages([]);
    setGeneratedContent("");
    
    // Show typing indicator first, then intro message, then question
    const typeLabel = CONTENT_TYPES.find(t => t.value === type)?.label || type;
    
    // Start with typing indicator
    const typingMessage: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "[TYPING]",
    };
    setMessages([typingMessage]);
    
    // After a brief delay, show intro message
    setTimeout(() => {
      const introMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `👋 Hi! I'm your AI recruiting assistant. I'll help you create a professional ${typeLabel.toLowerCase()} step by step.`,
      };
      setMessages([introMessage]);
      
      // After another delay, add the options message
      setTimeout(() => {
        const optionsMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `💡 **Quick start options:** You can upload a candidate profile or job description you like as a template, use an existing role to build from, or just chat with me and we'll create something great together!`,
        };
        setMessages(prev => [...prev, optionsMessage]);
        
        // After another delay, add the first question
        setTimeout(() => {
          const questionMessage: Message = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: `So, what's the job title and which team or department is this role for?`,
          };
          setMessages(prev => [...prev, questionMessage]);
        }, 600);
      }, 600);
    }, 1200);
  };

  const parseResponse = (content: string) => {
    const jdMatch = content.match(/---JOB_DESCRIPTION_START---([\s\S]*?)---JOB_DESCRIPTION_END---/);
    if (jdMatch) {
      const jdContent = jdMatch[1].trim();
      const chatContent = content.replace(/---JOB_DESCRIPTION_START---[\s\S]*?---JOB_DESCRIPTION_END---/, '').trim();
      return { jdContent, chatContent };
    }
    return { jdContent: null, chatContent: content };
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading || !selectedType) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: content.trim(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    const assistantMessage: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
    };

    setMessages([...newMessages, assistantMessage]);

    let fullContent = "";

    try {
      // Include uploaded context in the conversation if available
      const messagesWithContext = uploadedContext 
        ? [{ role: "system" as const, content: `Reference context for generating content:\n${uploadedContext}` }, ...newMessages.map((m) => ({ role: m.role, content: m.content }))]
        : newMessages.map((m) => ({ role: m.role, content: m.content }));
        
      await streamGenerate(
        selectedType,
        messagesWithContext,
        { sectionType: selectedType, tone: toneSettings },
        {
          onDelta: (delta) => {
            fullContent += delta;
            
            // Throttle UI updates for performance
            const now = Date.now();
            if (now - lastUpdateTimeRef.current < UPDATE_THROTTLE_MS) return;
            lastUpdateTimeRef.current = now;
            
            const { jdContent, chatContent } = parseResponse(fullContent);
            
            setMessages([
              ...newMessages,
              { ...assistantMessage, content: chatContent },
            ]);
            
            if (jdContent) {
              setGeneratedContent(jdContent);
            }
          },
          onDone: () => {
            setIsLoading(false);
            const { jdContent, chatContent } = parseResponse(fullContent);
            
            // If content was generated, add a completion message
            let finalChatContent = chatContent;
            if (jdContent && !chatContent.toLowerCase().includes('generated')) {
              finalChatContent = chatContent ? `${chatContent}\n\nI've generated the content for you! Would you like me to adjust anything?` : "I've generated the content for you! Would you like me to adjust anything?";
            }
            
            setMessages([
              ...newMessages,
              { ...assistantMessage, content: finalChatContent },
            ]);
            
            if (jdContent) {
              setGeneratedContent(jdContent);
              setIsContentExpanded(true);
            }
          },
          onError: (error) => {
            setIsLoading(false);
            setMessages([
              ...newMessages,
              {
                ...assistantMessage,
                content: `Error: ${error.message}. Please try again.`,
              },
            ]);
          },
        }
      );
    } catch (error) {
      setIsLoading(false);
      setMessages([
        ...newMessages,
        {
          ...assistantMessage,
          content: `Error: ${error instanceof Error ? error.message : "Unknown error"}. Please try again.`,
        },
      ]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const extractTitle = () => {
    return extractTitleFromContent(generatedContent, "Document");
  };

  const handleDownloadPDF = () => {
    const title = extractTitle();
    generateCleanPDF(generatedContent, title);
    toast.success("Downloaded as PDF");
  };

  const handleDownloadMarkdown = () => {
    const title = extractTitle();
    const cleanFilename = title.replace(/[^a-zA-Z0-9\s-]/g, '').trim();
    const blob = new Blob([generatedContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cleanFilename}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Downloaded as Markdown");
  };

  const handleSaveToProject = async () => {
    setShowProjectPicker(true);
    setShowNewProjectForm(false);
    setNewProjectName("");
    try {
      const fetchedProjects = await fetchProjects();
      setProjects(fetchedProjects);
    } catch (error) {
      toast.error("Failed to load projects");
    }
  };

  const handleCreateAndSave = async () => {
    if (!newProjectName.trim() || !selectedType || !generatedContent) return;
    
    setIsCreatingProject(true);
    try {
      const newProject = await createProject({ name: newProjectName.trim() });
      await saveToProject(newProject);
    } catch (error) {
      toast.error("Failed to create project");
    } finally {
      setIsCreatingProject(false);
    }
  };

  const saveToProject = async (project: Project) => {
    if (!selectedType || !generatedContent) return;
    
    setIsSaving(true);
    try {
      const title = extractTitle();
      
      switch (selectedType) {
        case "job_description":
          await createJobDescription({
            project_id: project.id,
            title,
            content: generatedContent,
            tone_formal_casual: 50,
            tone_serious_playful: 50,
            tone_concise_detailed: 50,
            tone_traditional_unconventional: 50,
          });
          break;
        case "interview_questions":
          await createInterviewQuestion({
            project_id: project.id,
            question: generatedContent,
            question_type: "behavioral",
            stage: "initial",
          });
          break;
        case "test_task":
          await createTestTask({
            project_id: project.id,
            title,
            problem_statement: generatedContent,
          });
          break;
        case "application_questions":
          await createApplicationQuestion({
            project_id: project.id,
            question: generatedContent,
          });
          break;
      }
      
      toast.success(`Saved to "${project.name}"`);
      setShowProjectPicker(false);
    } catch (error) {
      toast.error("Failed to save to project");
    } finally {
      setIsSaving(false);
    }
  };

  const reset = () => {
    setSelectedType(null);
    setMessages([]);
    setGeneratedContent("");
    setInput("");
    setUploadedContext(null);
  };

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const { data, error } = await supabase.functions.invoke("analyze-cv", {
        body: formData,
      });

      if (error) throw error;

      if (data?.success && data?.data?.analysis) {
        setUploadedContext(data.data.analysis);
        
        // Get the content type label for the message
        const typeLabel = CONTENT_TYPES.find(t => t.value === selectedType)?.label?.toLowerCase() || "content";
        
        // Add context to chat with type-aware message and action buttons
        const contextMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `I've analyzed **"${file.name}"**. Here's what I found:\n\n${data.data.analysis}\n\n---\n\n**Ready to create your ${typeLabel}:**\n\n[QUICK_ACTION:Generate now|Please generate the ${typeLabel} now based on the context I've provided. Output the complete document immediately.] [QUICK_ACTION:Help me refine it first|I'd like you to ask me some questions to help flesh out the requirements before generating]`,
        };
        setMessages(prev => [...prev, contextMessage]);
        toast.success("Document analyzed successfully");
      } else {
        throw new Error(data?.error || "Failed to analyze document");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to analyze document");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Search existing jobs
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

  // Select a job from search results (use as template)
  const selectJob = async (job: GreenhouseJob) => {
    setShowJobSearch(false);
    setIsLoading(true);

    try {
      // Fetch full job details
      const { data, error } = await supabase.functions.invoke("greenhouse", {
        body: { action: "get_job", jobId: job.id },
      });

      if (error) throw error;

      const jobDetails = data?.job;
      if (jobDetails) {
        const jobContext = `**Reference Role: ${jobDetails.title}**
${jobDetails.department ? `Department: ${jobDetails.department}` : ""}
${jobDetails.location ? `Location: ${jobDetails.location}` : ""}

${jobDetails.description ? `**Description:**\n${jobDetails.description.replace(/<[^>]*>/g, "")}` : ""}

${jobDetails.requirements ? `**Requirements:**\n${jobDetails.requirements.replace(/<[^>]*>/g, "")}` : ""}`;

        setUploadedContext(jobContext);
        
        const typeLabel = CONTENT_TYPES.find(t => t.value === selectedType)?.label?.toLowerCase() || "content";
        const contextMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `I've loaded the job details for **${jobDetails.title}**${jobDetails.department ? ` (${jobDetails.department})` : ""}.\n\n---\n\n**Ready to create your ${typeLabel}:**\n\n[QUICK_ACTION:Generate now|Please generate the ${typeLabel} now based on the context I've provided. Output the complete document immediately.] [QUICK_ACTION:Help me refine it first|I'd like you to ask me some questions to help flesh out the requirements before generating]`,
        };
        setMessages(prev => [...prev, contextMessage]);
        toast.success(`Loaded: ${jobDetails.title}`);
      }
    } catch (error) {
      console.error("Error fetching job:", error);
      toast.error("Failed to load job details");
    } finally {
      setIsLoading(false);
      setJobSearchQuery("");
      setSearchResults([]);
    }
  };

  // Download job as PDF
  const downloadJobAsPDF = async (job: GreenhouseJob, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const { data, error } = await supabase.functions.invoke("greenhouse", {
        body: { action: "get_job", jobId: job.id },
      });

      if (error) throw error;

      const jobDetails = data?.job;
      if (jobDetails) {
        // Convert job details to clean markdown format (same as ProjectSection)
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

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Zap className="h-5 w-5 text-primary" />
          Quick Gen
        </CardTitle>
        <p className="text-lg text-muted-foreground">
          Generate and download docs without creating a project
        </p>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0 p-4 pt-0">
        {!selectedType ? (
          <div className="grid grid-cols-2 gap-3">
            {CONTENT_TYPES.map((type) => {
              const IconComponent = type.Icon;
              return (
                <Button
                  key={type.value}
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2 hover:border-primary/50 transition-colors"
                  onClick={() => handleTypeSelect(type.value)}
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <IconComponent className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-base font-medium">{type.label}</span>
                </Button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col h-full min-h-0 gap-3">
            {/* Type indicator & reset */}
            <div className="flex items-center justify-between">
              <span className="text-base font-medium text-muted-foreground flex items-center gap-1.5">
                {(() => {
                  const typeInfo = CONTENT_TYPES.find(t => t.value === selectedType);
                  if (typeInfo) {
                    const IconComponent = typeInfo.Icon;
                    return <><IconComponent className="h-3.5 w-3.5" /> {typeInfo.label}</>;
                  }
                  return null;
                })()}
              </span>
              <Button variant="ghost" size="sm" onClick={reset} className="h-7 text-base">
                Start Over
              </Button>
            </div>

            {/* Chat messages */}
            <ScrollArea className="flex-1 min-h-0" ref={scrollRef}>
              <div className="space-y-3 pr-2">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-2 animate-fade-in",
                      message.role === "user" ? "flex-row-reverse" : ""
                    )}
                  >
                    <div
                      className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center shrink-0",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      {message.role === "user" ? (
                        <User className="h-3 w-3" />
                      ) : (
                        <Bot className="h-3 w-3" />
                      )}
                    </div>
                    <div
                      className={cn(
                        "rounded-lg px-3 py-2 text-base max-w-[85%]",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      {message.content === "[TYPING]" ? (
                        <span className="flex items-center gap-1">
                          <span className="flex gap-1">
                            <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                            <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                            <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                          </span>
                        </span>
                      ) : message.content ? (
                        message.role === "assistant" ? (
                          (() => {
                            // Check for quick action buttons pattern
                            const actionPattern = /\[QUICK_ACTION:([^|]+)\|([^\]]+)\]/g;
                            const hasActions = actionPattern.test(message.content);
                            
                            if (hasActions) {
                              // Split content into text and actions
                              const parts = message.content.split(/\[QUICK_ACTION:[^\]]+\]/g);
                              const actions: { label: string; prompt: string }[] = [];
                              let match;
                              const regex = /\[QUICK_ACTION:([^|]+)\|([^\]]+)\]/g;
                              while ((match = regex.exec(message.content)) !== null) {
                                actions.push({ label: match[1], prompt: match[2] });
                              }
                              
                              return (
                                <div>
                                  <ReactMarkdown
                                    components={{
                                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                                      hr: () => <hr className="my-3 border-border" />,
                                    }}
                                  >
                                    {parts.join('')}
                                  </ReactMarkdown>
                                  <div className="flex flex-wrap gap-2 mt-3">
                                    {actions.map((action, idx) => (
                                      <Button
                                        key={idx}
                                        size="sm"
                                        variant={idx === 0 ? "default" : "outline"}
                                        className="h-7 text-sm"
                                        onClick={() => sendMessage(action.prompt)}
                                        disabled={isLoading}
                                      >
                                        {idx === 0 && <Zap className="h-3 w-3 mr-1" />}
                                        {action.label}
                                      </Button>
                                    ))}
                                  </div>
                                </div>
                              );
                            }
                            
                            return (
                              <ReactMarkdown
                                components={{
                                  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                                }}
                              >
                                {message.content}
                              </ReactMarkdown>
                            );
                          })()
                        ) : (
                          <span className="whitespace-pre-wrap">{message.content}</span>
                        )
                      ) : (
                        <span className="flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Thinking...
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Generated content preview & actions */}
            {generatedContent && (
              <div className="border rounded-lg bg-card overflow-hidden">
                <div 
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setIsContentExpanded(!isContentExpanded)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Generated Content</span>
                    {!isContentExpanded && (
                      <span className="text-sm text-muted-foreground truncate max-w-[150px]">
                        — {extractTitle()}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {isEditing ? (
                      <>
                        <Button
                          variant="default"
                          size="sm"
                          className="h-7 text-sm gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            setGeneratedContent(editedContent);
                            setIsEditing(false);
                            toast.success("Changes saved");
                          }}
                        >
                          <Check className="h-3 w-3" />
                          Save
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsEditing(false);
                            setEditedContent(generatedContent);
                          }}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-sm gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditedContent(generatedContent);
                            setIsEditing(true);
                            setIsContentExpanded(true);
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                          Edit
                        </Button>
                        <CopyButton content={generatedContent} />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-sm gap-1"
                          onClick={(e) => { e.stopPropagation(); handleDownloadPDF(); }}
                        >
                          <Download className="h-3 w-3" />
                          PDF
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-sm gap-1"
                          onClick={(e) => { e.stopPropagation(); handleSaveToProject(); }}
                        >
                          <Save className="h-3 w-3" />
                          Save to project
                        </Button>
                      </>
                    )}
                    {isContentExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground ml-1" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground ml-1" />
                    )}
                  </div>
                </div>
                {isContentExpanded && (
                  <div className="border-t px-3 pb-3 max-h-[60vh] overflow-auto">
                    {isEditing ? (
                      <Textarea
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        className="mt-3 min-h-[300px] text-sm font-mono"
                        placeholder="Edit your content here..."
                      />
                    ) : (
                      <div className="prose prose-sm dark:prose-invert max-w-none pt-3">
                        <ReactMarkdown
                          components={{
                            h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-base font-semibold mt-4 mb-2">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-sm font-semibold mt-3 mb-1">{children}</h3>,
                            p: ({ children }) => <p className="text-sm mb-2">{children}</p>,
                            ul: ({ children }) => <ul className="text-sm list-disc pl-4 mb-2">{children}</ul>,
                            li: ({ children }) => <li className="mb-1">{children}</li>,
                            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                          }}
                        >
                          {generatedContent}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Context indicator */}
            {uploadedContext && (
              <div className="flex items-center gap-2 px-2 py-1.5 bg-primary/10 rounded-md text-xs">
                <FileText className="h-3 w-3 text-primary" />
                <span className="flex-1 truncate text-primary">Context loaded</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 hover:bg-primary/20"
                  onClick={() => setUploadedContext(null)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}

            {/* Input with action buttons */}
            <div className="space-y-2">
              <div className="flex gap-1 flex-wrap">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || isLoading}
                >
                  {isUploading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Upload className="h-3 w-3" />
                  )}
                  Upload
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => setShowJobSearch(true)}
                  disabled={isLoading}
                >
                  <Search className="h-3 w-3" />
                  Existing Roles
                </Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      disabled={isLoading}
                    >
                      <SlidersHorizontal className="h-3 w-3" />
                      Tone
                      {toneSettings.preset && (
                        <span className="text-muted-foreground">• {toneSettings.preset === "company-standard" ? "Company Standard" : toneSettings.preset}</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80" align="start">
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Tone Settings</h4>
                      <p className="text-xs text-muted-foreground">Adjust the voice and style of generated content</p>
                      <ToneControls
                        value={toneSettings}
                        onChange={setToneSettings}
                        disabled={isLoading}
                      />
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe the role you're hiring for and answer the AI's questions, or upload a candidate profile/job description you like as a template..."
                  className="min-h-[140px] text-sm resize-none"
                  disabled={isLoading}
                />
                <Button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || isLoading}
                  size="icon"
                  className="shrink-0"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      {/* Project Picker Dialog */}
      <Dialog open={showProjectPicker} onOpenChange={setShowProjectPicker}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Save to Project
            </DialogTitle>
            <DialogDescription>
              Choose a project to save this content to
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {/* Create new project option */}
            {showNewProjectForm ? (
              <div className="flex gap-2">
                <Input
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Enter project name..."
                  onKeyDown={(e) => e.key === "Enter" && handleCreateAndSave()}
                  autoFocus
                />
                <Button 
                  onClick={handleCreateAndSave} 
                  disabled={!newProjectName.trim() || isCreatingProject}
                >
                  {isCreatingProject ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => setShowNewProjectForm(false)}
                  disabled={isCreatingProject}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full justify-start h-auto py-3 border-dashed"
                onClick={() => setShowNewProjectForm(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create new project
              </Button>
            )}

            {/* Existing projects */}
            <div className="max-h-[250px] overflow-auto">
              {projects.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  No existing projects
                </div>
              ) : (
                <div className="space-y-2">
                  {projects.map((project) => (
                    <Button
                      key={project.id}
                      variant="outline"
                      className="w-full justify-start h-auto py-3"
                      onClick={() => saveToProject(project)}
                      disabled={isSaving}
                    >
                      <div className="flex-1 text-left">
                        <p className="font-medium">{project.name}</p>
                        {project.department && (
                          <p className="text-xs text-muted-foreground">{project.department}</p>
                        )}
                      </div>
                      {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Job Search Dialog */}
      <Dialog open={showJobSearch} onOpenChange={setShowJobSearch}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Search Existing Roles
            </DialogTitle>
            <DialogDescription>
              Find previous job postings to use as reference
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={jobSearchQuery}
                onChange={(e) => setJobSearchQuery(e.target.value)}
                placeholder="Search by title or department..."
                onKeyDown={(e) => e.key === "Enter" && searchJobs()}
              />
              <Button onClick={searchJobs} disabled={isSearching || !jobSearchQuery.trim()}>
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
            <div className="max-h-[300px] overflow-auto">
              {searchResults.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  {isSearching ? "Searching..." : "Search for roles to see results"}
                </div>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((job) => (
                    <div
                      key={job.id}
                      className="flex items-center gap-2 p-3 rounded-lg border border-border/50 bg-background/50"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{job.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {[job.department, job.location].filter(Boolean).join(" • ") || "No details"}
                        </p>
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
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
