import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { Send, Loader2, Bot, User, Sparkles, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { ChatMessage, GenerationContext, CandidateContext, ContentType } from "@/types";
import { streamGenerate } from "@/lib/ai";
import { createChatMessage } from "@/lib/api";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Option buttons that can be embedded in chat messages
interface ChatOption {
  label: string;
  action: string;
}

interface ChatInterfaceProps {
  projectId: string;
  messages: ChatMessage[];
  onMessagesChange: (messages: ChatMessage[]) => void;
  context: GenerationContext;
  onContentGenerated?: (content: string, type: string) => void;
  onStreamingContent?: (content: string) => void;
  candidateContext?: CandidateContext;
  onCandidateContextChange?: (context: CandidateContext) => void;
  sectionType?: ContentType;
  mode?: "generate" | "edit";
  onClearChat?: () => Promise<void>;
}

export interface ChatInterfaceHandle {
  sendMessage: (content: string) => void;
}


const SECTION_LABELS: Record<ContentType, string> = {
  job_description: "Job Description",
  interview_questions: "Interview Questions",
  test_task: "Test Task",
  application_questions: "Application Questions",
};

// Parse options from message content (format: [[Option Label|action_id]])
const parseMessageOptions = (content: string): { text: string; options: ChatOption[] } => {
  const optionRegex = /\[\[([^|]+)\|([^\]]+)\]\]/g;
  const options: ChatOption[] = [];
  let match;
  
  while ((match = optionRegex.exec(content)) !== null) {
    options.push({ label: match[1], action: match[2] });
  }
  
  const text = content.replace(optionRegex, '').trim();
  return { text, options };
};

export const ChatInterface = forwardRef<ChatInterfaceHandle, ChatInterfaceProps>(({
  projectId,
  messages,
  onMessagesChange,
  context,
  onContentGenerated,
  onStreamingContent,
  candidateContext,
  onCandidateContextChange,
  sectionType,
  mode = "generate",
  onClearChat,
}, ref) => {
  // Some entry points rely on context.sectionType; always persist messages under the effective section.
  const effectiveSectionType = sectionType ?? context.sectionType;

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const addAssistantMessage = (content: string) => {
    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      project_id: projectId,
      role: "assistant",
      content,
      created_at: new Date().toISOString(),
      section_type: effectiveSectionType,
    };
    onMessagesChange([...messages, assistantMessage]);
    
    // Save to database
    createChatMessage({
      project_id: projectId,
      role: "assistant",
      content,
      section_type: effectiveSectionType,
    }).catch(error => console.error("Failed to save assistant message:", error));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 10MB.");
      return;
    }

    setIsUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      // Use supabase.functions.invoke to properly include auth token
      const { data, error } = await supabase.functions.invoke("analyze-cv", {
        body: formData,
      });

      if (error) {
        throw new Error(error.message || "Failed to analyze document");
      }

      if (!data?.success) {
        throw new Error(data?.error || "Failed to analyze document");
      }

      if (onCandidateContextChange && candidateContext) {
        onCandidateContextChange({
          ...candidateContext,
          cvFilename: data?.data?.filename,
          cvAnalysis: data?.data?.analysis,
        });
      }

      toast.success(`Analyzed: ${file.name}`);
      
      // Add smart AI response based on context
      const currentSection = sectionType || context.sectionType;
      const hasAnsweredQuestions = messages.some(m => m.role === "user" && !m.content.includes("uploaded"));
      
      if (!currentSection) {
        // No document type selected yet
        addAssistantMessage(
          `I've analyzed **${file.name}**. Which document would you like me to help create using this as a reference?\n\n` +
          `[[Job Description|generate_jd]]\n[[Interview Questions|generate_interview]]\n[[Test Task|generate_test]]\n[[Application Questions|generate_app]]`
        );
      } else if (!hasAnsweredQuestions || messages.length <= 1) {
        // Document type selected but no questions answered yet
        const docLabel = SECTION_LABELS[currentSection];
        addAssistantMessage(
          `I've analyzed **${file.name}**. Would you like me to generate a ${docLabel.toLowerCase()} based on this now, or would you prefer to answer a few questions first to refine the output?\n\n` +
          `[[Generate now|generate_now]]\n[[Answer questions first|ask_questions]]`
        );
      } else {
        // Already in conversation - just acknowledge
        addAssistantMessage(
          `I've analyzed **${file.name}**. I'll use this to refine the content. Feel free to continue our conversation or ask me to regenerate with this new context.`
        );
      }
    } catch (error) {
      console.error("File upload error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to analyze document");
    } finally {
      setIsUploadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleOptionClick = async (action: string) => {
    const currentSection = effectiveSectionType || "job_description";
    const docLabel = SECTION_LABELS[currentSection];
    
    switch (action) {
      case "generate_jd":
        sendMessage("Generate a job description now based on the uploaded document. Skip questions and create it immediately.");
        break;
      case "generate_interview":
        sendMessage("Generate interview questions now based on the uploaded document. Skip questions and create them immediately.");
        break;
      case "generate_test":
        sendMessage("Generate a test task now based on the uploaded document. Skip questions and create it immediately.");
        break;
      case "generate_app":
        sendMessage("Generate application questions now based on the uploaded document. Skip questions and create them immediately.");
        break;
      case "generate_now":
        sendMessage(`Generate a ${docLabel.toLowerCase()} now based on the uploaded document. Skip questions and create it immediately.`);
        break;
      case "ask_questions":
        sendMessage("Let's go through some questions to refine the output. Please ask me about the role.");
        break;
      case "continue_editing":
        sendMessage("I'd like to continue working on the existing document. What improvements would you suggest?");
        break;
      case "start_fresh":
        // If we have persisted chat for this section, clear it first so the user truly starts fresh.
        if (onClearChat) {
          try {
            await onClearChat();
            onMessagesChange([]);
          } catch (e) {
            console.error("Failed to clear chat:", e);
          }
        }
        sendMessage("I'd like to start fresh and create a new document from scratch.");
        break;
      case "regenerate_with_changes":
        sendMessage("Yes, please regenerate with those changes.");
        break;
      case "more_details":
        sendMessage("Let me add more details before regenerating.");
        break;
      default:
        sendMessage(action);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      project_id: projectId,
      role: "user",
      content: content.trim(),
      created_at: new Date().toISOString(),
      section_type: effectiveSectionType,
    };

    const newMessages = [...messages, userMessage];
    onMessagesChange(newMessages);
    setInput("");
    setIsLoading(true);

    // Save user message
    try {
      await createChatMessage({
        project_id: projectId,
        role: "user",
        content: content.trim(),
        section_type: effectiveSectionType,
      });
    } catch (error) {
      console.error("Failed to save user message:", error);
    }

    // Create placeholder for assistant message
    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      project_id: projectId,
      role: "assistant",
      content: "",
      created_at: new Date().toISOString(),
      section_type: effectiveSectionType,
    };

    onMessagesChange([...newMessages, assistantMessage]);

    let fullContent = "";
    let lastUpdateTime = 0;
    const UPDATE_THROTTLE_MS = 50; // Throttle UI updates to every 50ms

    // Helper to extract JD content and chat message
    const parseResponse = (content: string) => {
      const jdMatch = content.match(/---JOB_DESCRIPTION_START---([\s\S]*?)---JOB_DESCRIPTION_END---/);
      if (jdMatch) {
        const jdContent = jdMatch[1].trim();
        const chatContent = content.replace(/---JOB_DESCRIPTION_START---[\s\S]*?---JOB_DESCRIPTION_END---/, '').trim();
        return { jdContent, chatContent };
      }
      return { jdContent: null, chatContent: content };
    };

    // Throttled update function
    const updateUI = (force = false) => {
      const now = Date.now();
      if (!force && now - lastUpdateTime < UPDATE_THROTTLE_MS) return;
      lastUpdateTime = now;
      
      const { jdContent, chatContent } = parseResponse(fullContent);
      
      onMessagesChange([
        ...newMessages,
        { ...assistantMessage, content: chatContent },
      ]);
      
      if (jdContent && onStreamingContent) {
        onStreamingContent(jdContent);
      }
    };

    try {
      await streamGenerate(
        "chat",
        newMessages.map((m) => ({ role: m.role, content: m.content })),
        context,
        {
          onDelta: (delta) => {
            fullContent += delta;
            updateUI();
          },
          onDone: async () => {
            updateUI(true); // Force final update
            setIsLoading(false);
            const { jdContent, chatContent } = parseResponse(fullContent);
            
            // Save assistant message in background (don't await)
            createChatMessage({
              project_id: projectId,
              role: "assistant",
              content: chatContent,
              section_type: effectiveSectionType,
            }).catch(error => console.error("Failed to save assistant message:", error));

            // If JD was generated, notify parent
            if (jdContent && onContentGenerated) {
              onContentGenerated(jdContent, "generated");
            }
          },
          onError: (error) => {
            setIsLoading(false);
            onMessagesChange([
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
      onMessagesChange([
        ...newMessages,
        {
          ...assistantMessage,
          content: `Error: ${error instanceof Error ? error.message : "Unknown error"}. Please try again.`,
        },
      ]);
    }
  };

  // Expose sendMessage to parent via ref - must be after sendMessage is defined
  useImperativeHandle(ref, () => ({
    sendMessage,
  }), [sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden">
      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0 w-full" ref={scrollRef}>
        <div className="p-4 w-full">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              {mode === "edit" ? (
                <>
                  <h3 className="text-2xl font-semibold mb-2">
                    Edit your {sectionType ? SECTION_LABELS[sectionType].toLowerCase() : "document"}
                  </h3>
                  <p className="text-muted-foreground text-lg max-w-md mb-4">
                    Use AI to refine, rewrite, or improve your existing content.
                  </p>
                  <div className="text-muted-foreground text-base max-w-md mb-6 space-y-1">
                    <p>✏️ <strong>Ask for changes</strong> like "make it more concise" or "add more details"</p>
                    <p>🔄 <strong>Rewrite sections</strong> in a different tone or style</p>
                  </div>
                  <Button
                    variant="default"
                    size="lg"
                    onClick={() => sendMessage("What improvements would you suggest for this document?")}
                    disabled={isLoading}
                  >
                    Get Suggestions
                  </Button>
                </>
              ) : (
                <>
                  <h3 className="text-2xl font-semibold mb-2">
                    Let's build your {sectionType ? SECTION_LABELS[sectionType].toLowerCase() : "content"}
                  </h3>
                  <p className="text-muted-foreground text-lg max-w-md mb-4">
                    Answer a few questions to generate your content. The draft will appear in the preview on the right.
                  </p>
                  <div className="text-muted-foreground text-base max-w-md mb-6 space-y-1">
                    <p>💡 <strong>Select a past role</strong> from the library to use as a template</p>
                    <p>📄 <strong>Upload a document</strong> (CV, job description, etc.) for reference</p>
                  </div>
                  <Button
                    variant="default"
                    size="lg"
                    onClick={() => sendMessage(`Generate a ${sectionType ? SECTION_LABELS[sectionType].toLowerCase() : "job description"} for this role`)}
                    disabled={isLoading}
                  >
                    Get Started
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4 w-full">
              {messages.map((message) => {
                const { text, options } = message.role === "assistant" 
                  ? parseMessageOptions(message.content) 
                  : { text: message.content, options: [] };
                
                return (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-3 animate-fade-in w-full",
                      message.role === "user" ? "flex-row-reverse" : ""
                    )}
                  >
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      {message.role === "user" ? (
                        <User className="h-4 w-4" />
                      ) : (
                        <Bot className="h-4 w-4" />
                      )}
                    </div>
                    <div
                      className={cn(
                        "rounded-lg px-4 py-3 min-w-0 flex-1",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground ml-12"
                          : "bg-muted mr-12"
                      )}
                    >
                      <div className="text-lg">
                        {message.content ? (
                          message.role === "assistant" ? (
                            <>
                              <ReactMarkdown
                                components={{
                                  p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                                }}
                              >
                                {text}
                              </ReactMarkdown>
                              {options.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-3">
                                  {options.map((option, idx) => (
                                    <Button
                                      key={idx}
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleOptionClick(option.action)}
                                      disabled={isLoading}
                                      className="bg-background hover:bg-primary hover:text-primary-foreground transition-colors"
                                    >
                                      {option.label}
                                    </Button>
                                  ))}
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="whitespace-pre-wrap break-words">{message.content}</span>
                          )
                        ) : (
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Thinking...
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border p-4 bg-card">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              className="hidden"
              onChange={handleFileUpload}
              disabled={isUploadingFile || isLoading}
            />
            <Button
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingFile || isLoading}
              title="Upload resume or LinkedIn PDF"
            >
              {isUploadingFile ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Paperclip className="h-4 w-4" />
              )}
            </Button>
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe the role or ask for help..."
              className="min-h-[44px] max-h-32 resize-none"
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
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Upload a resume or LinkedIn PDF to tailor your job description
          </p>
        </div>
      </div>
    </div>
  );
});

ChatInterface.displayName = "ChatInterface";
