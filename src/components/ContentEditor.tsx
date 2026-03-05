import { useState } from "react";
import { Copy, Check, Download, Pencil, Eye, Save, FileText, FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { generateCleanPDF, extractTitleFromContent } from "@/lib/pdfExport";
import ReactMarkdown from "react-markdown";

interface ContentEditorProps {
  content: string;
  onChange: (content: string) => void;
  title?: string;
  readOnly?: boolean;
  onSave?: () => void;
  isSaving?: boolean;
  showSaveButton?: boolean;
  isStreaming?: boolean;
}

export function ContentEditor({ content, onChange, title, readOnly, onSave, isSaving, showSaveButton = true, isStreaming }: ContentEditorProps) {
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<"edit" | "preview">("preview");

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPDF = () => {
    const title = extractTitleFromContent(content, "Job Description");
    generateCleanPDF(content, `${title} - Job Description`);
  };

  const handleDownloadMarkdown = () => {
    const title = extractTitleFromContent(content, "Job Description");
    const cleanFilename = title.replace(/[^a-zA-Z0-9\s-]/g, '').trim();
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cleanFilename}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Render as styled markdown matching Greenhouse formatting
  const renderMarkdown = (text: string) => (
    <ReactMarkdown
      components={{
        // H1 for main title - larger, bold
        h1: ({ children }) => (
          <h1 className="text-2xl font-bold text-foreground mb-4">{children}</h1>
        ),
        // H2 same as H3 for consistency
        h2: ({ children }) => (
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">{children}</h3>
        ),
        // H3 for section headers - Greenhouse style
        h3: ({ children }) => (
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">{children}</h3>
        ),
        // Regular paragraphs
        p: ({ children }) => (
          <p className="text-sm text-foreground leading-relaxed mb-3">{children}</p>
        ),
        // Unordered lists
        ul: ({ children }) => (
          <ul className="list-disc list-outside ml-5 mb-4 space-y-1.5">{children}</ul>
        ),
        // Ordered lists
        ol: ({ children }) => (
          <ol className="list-decimal list-outside ml-5 mb-4 space-y-1.5">{children}</ol>
        ),
        // List items
        li: ({ children }) => (
          <li className="text-sm text-foreground leading-relaxed">{children}</li>
        ),
        // Bold text
        strong: ({ children }) => (
          <strong className="font-semibold text-foreground">{children}</strong>
        ),
        // Italic text
        em: ({ children }) => (
          <em className="italic">{children}</em>
        ),
        // Horizontal rule
        hr: () => <hr className="my-6 border-border" />,
      }}
    >
      {text}
    </ReactMarkdown>
  );

  return (
    <div className="flex flex-col h-full border rounded-lg bg-card relative">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-3">
          <h3 className="font-medium">{title || "Content"}</h3>
          {isStreaming && (
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Generating...
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!readOnly && (
            <Tabs value={mode} onValueChange={(v) => setMode(v as "edit" | "preview")}>
              <TabsList className="h-8">
                <TabsTrigger value="preview" className="h-6 px-2 text-xs">
                  <Eye className="h-3 w-3 mr-1" />
                  Preview
                </TabsTrigger>
                <TabsTrigger value="edit" className="h-6 px-2 text-xs">
                  <Pencil className="h-3 w-3 mr-1" />
                  Edit
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}
          {showSaveButton && onSave && content?.trim() && (
            <Button 
              variant="default" 
              size="sm" 
              onClick={onSave}
              disabled={isSaving || readOnly}
              className="gap-1.5"
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save to Project"}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={handleCopy} title="Copy to clipboard">
            {copied ? (
              <Check className="h-4 w-4 text-success" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDownloadPDF} title="Download as PDF">
            <FileDown className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {mode === "edit" && !readOnly ? (
          <Textarea
            value={content}
            onChange={(e) => onChange(e.target.value)}
            className="h-full min-h-[400px] border-0 rounded-none resize-none font-mono text-sm"
            placeholder="Enter or paste content here..."
          />
        ) : (
          <div className="p-6">
            {content?.trim() ? (
              <div className="prose-greenhouse">
                {renderMarkdown(content)}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-sm text-muted-foreground">
                  Preview will appear as we receive more details about the role.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
