import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatInterface, ChatInterfaceHandle } from "@/components/ChatInterface";
import { Save, Eye, Edit3, MessageSquare, X, Download, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { generateCleanPDF } from "@/lib/pdfExport";
import type { ContentType, ToneSettings, CandidateContext, ChatMessage } from "@/types";
import { DEFAULT_TONE_SETTINGS } from "@/lib/constants";

interface DocumentEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  documentTitle: string;
  documentContent: string;
  projectId: string;
  projectName: string;
  department?: string;
  sectionType: ContentType;
  onSave: (content: string) => Promise<void>;
}

export function DocumentEditorModal({
  open,
  onOpenChange,
  documentId,
  documentTitle,
  documentContent,
  projectId,
  projectName,
  department,
  sectionType,
  onSave,
}: DocumentEditorModalProps) {
  const [content, setContent] = useState(documentContent);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [showChat, setShowChat] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const chatRef = useRef<ChatInterfaceHandle>(null);

  // Reset content when document changes
  useEffect(() => {
    setContent(documentContent);
  }, [documentContent, documentId]);

  const [tone] = useState<ToneSettings>(DEFAULT_TONE_SETTINGS);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(content);
      toast.success("Document saved");
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to save document");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    generateCleanPDF(content, documentTitle);
    toast.success("Downloaded as PDF");
  };

  const handleContentGenerated = (generatedContent: string) => {
    setContent(generatedContent);
    setShowChat(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 gap-0 [&>button]:hidden">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">{documentTitle}</DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowChat(!showChat)}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                {showChat ? "Hide AI Chat" : "Edit with AI"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                size="sm"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Saving..." : "Save"}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="ml-2"
              >
                <X className="h-4 w-4 mr-2" />
                Exit
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden">
          {/* Main editor area */}
          <div className={`flex-1 flex flex-col overflow-hidden ${showChat ? 'w-1/2' : 'w-full'}`}>
            {/* Mode tabs */}
            <div className="border-b px-4 py-2">
              <Tabs value={mode} onValueChange={(v) => setMode(v as "edit" | "preview")}>
                <TabsList className="h-8">
                  <TabsTrigger value="edit" className="text-xs px-3 h-7">
                    <Edit3 className="h-3 w-3 mr-1" />
                    Edit
                  </TabsTrigger>
                  <TabsTrigger value="preview" className="text-xs px-3 h-7">
                    <Eye className="h-3 w-3 mr-1" />
                    Preview
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Content area */}
            <div className="flex-1 min-h-0 p-4">
              {mode === "edit" ? (
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="h-full resize-none font-mono text-sm"
                  placeholder="Enter document content..."
                />
              ) : (
                <ScrollArea className="h-full">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown
                      components={{
                        h1: ({ children }) => <h1 className="text-2xl font-bold mb-4">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-xl font-semibold mb-3 mt-6">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-lg font-medium mb-2 mt-4">{children}</h3>,
                        p: ({ children }) => <p className="mb-3 leading-relaxed">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc pl-5 mb-4 space-y-1">{children}</ul>,
                        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                      }}
                    >
                      {content}
                    </ReactMarkdown>
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>

          {/* AI Chat panel */}
          {showChat && (
            <div className="w-1/2 border-l flex flex-col">
              <div className="px-4 py-2 border-b flex items-center justify-between">
                <span className="text-sm font-medium">AI Assistant</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowChat(false)}
                  className="h-7 w-7 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 min-h-0">
                <ChatInterface
                  ref={chatRef}
                  projectId={projectId}
                  messages={messages}
                  onMessagesChange={setMessages}
                  context={{
                    projectName,
                    department,
                    tone,
                    existingContent: content,
                    sectionType,
                  }}
                  onContentGenerated={handleContentGenerated}
                  sectionType={sectionType}
                  mode="edit"
                />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}