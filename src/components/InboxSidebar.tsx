import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Inbox, Eye, Trash2, Copy, Loader2, FileText, Download } from "lucide-react";
import { generateCleanPDF } from "@/lib/pdfExport";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { 
  fetchInboxDocuments, 
  fetchUnreadInboxCount, 
  markInboxItemAsRead, 
  deleteInboxItem 
} from "@/lib/sharing";
import { createProject, createJobDescription, createInterviewQuestion, createTestTask, createApplicationQuestion } from "@/lib/api";
import type { SharedDocument } from "@/types";

export function InboxSidebar() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<SharedDocument[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [viewingDoc, setViewingDoc] = useState<SharedDocument | null>(null);
  const [cloning, setCloning] = useState(false);

  const loadInbox = async () => {
    setLoading(true);
    try {
      const [docs, count] = await Promise.all([
        fetchInboxDocuments(),
        fetchUnreadInboxCount(),
      ]);
      setDocuments(docs);
      setUnreadCount(count);
    } catch (error) {
      console.error("Failed to load inbox:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load unread count on mount
    fetchUnreadInboxCount().then(setUnreadCount).catch(console.error);
  }, []);

  useEffect(() => {
    if (open) {
      loadInbox();
    }
  }, [open]);

  const handleView = async (doc: SharedDocument) => {
    setViewingDoc(doc);
    if (!doc.is_read) {
      try {
        await markInboxItemAsRead(doc.id);
        setDocuments(prev => prev.map(d => 
          d.id === doc.id ? { ...d, is_read: true } : d
        ));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        console.error("Failed to mark as read:", error);
      }
    }
  };

  const handleDelete = async (doc: SharedDocument) => {
    try {
      await deleteInboxItem(doc.id);
      setDocuments(prev => prev.filter(d => d.id !== doc.id));
      if (!doc.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      toast.success("Document removed from inbox");
    } catch (error) {
      toast.error("Failed to delete document");
    }
  };

  const handleCloneToProject = async (doc: SharedDocument) => {
    setCloning(true);
    try {
      // Create a new project with the document
      const projectName = `${doc.title} (Cloned)`;
      const project = await createProject({ name: projectName });

      // Add the document to the project based on type
      switch (doc.document_type) {
        case "job_description":
          await createJobDescription({
            project_id: project.id,
            title: doc.title,
            content: doc.content,
            tone_formal_casual: 50,
            tone_serious_playful: 50,
            tone_concise_detailed: 50,
            tone_traditional_unconventional: 50,
          });
          break;
        case "interview_questions":
          await createInterviewQuestion({
            project_id: project.id,
            question: doc.content,
            question_type: "behavioral",
            stage: "initial",
          });
          break;
        case "test_task":
          await createTestTask({
            project_id: project.id,
            title: doc.title,
            problem_statement: doc.content,
          });
          break;
        case "application_questions":
          await createApplicationQuestion({
            project_id: project.id,
            question: doc.content,
          });
          break;
      }

      toast.success("Cloned to new project");
      setViewingDoc(null);
      setOpen(false);
      navigate(`/project/${project.id}`);
    } catch (error) {
      toast.error("Failed to clone document");
    } finally {
      setCloning(false);
    }
  };

  const handleDownload = (doc: SharedDocument) => {
    generateCleanPDF(doc.content, doc.title);
    toast.success("Downloaded as PDF");
  };

  const formatDocumentType = (type: string) => {
    return type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button className="flex items-center gap-3 px-3 py-2 rounded-md text-base font-medium transition-colors w-full text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground relative">
            <Inbox className="h-4 w-4" />
            Inbox
            {unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute right-2 h-5 min-w-5 px-1 flex items-center justify-center"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </Badge>
            )}
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="w-96">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Inbox className="h-5 w-5" />
              Inbox
              {unreadCount > 0 && (
                <Badge variant="secondary">{unreadCount} new</Badge>
              )}
            </SheetTitle>
            <SheetDescription>
              Documents shared with you by colleagues
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-120px)] mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8">
                <Inbox className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">Your inbox is empty</p>
              </div>
            ) : (
              <div className="space-y-2 pr-4">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className={`p-3 rounded-lg border transition-colors ${
                      doc.is_read ? "bg-background" : "bg-primary/5 border-primary/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${!doc.is_read ? "text-primary" : ""}`}>
                          {doc.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          From: {doc.sender_email || "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {formatDocumentType(doc.document_type)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(doc.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      {!doc.is_read && (
                        <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />
                      )}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleView(doc)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(doc)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Document viewer dialog */}
      <Dialog open={!!viewingDoc} onOpenChange={(open) => !open && setViewingDoc(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {viewingDoc?.title}
            </DialogTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>From: {viewingDoc?.sender_email}</span>
              <span>•</span>
              <span className="capitalize">{viewingDoc?.document_type.replace(/_/g, " ")}</span>
            </div>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-auto border rounded-md p-4">
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown>{viewingDoc?.content || ""}</ReactMarkdown>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setViewingDoc(null)}
            >
              Close
            </Button>
            <Button
              variant="outline"
              onClick={() => viewingDoc && handleDownload(viewingDoc)}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
            <Button
              onClick={() => viewingDoc && handleCloneToProject(viewingDoc)}
              disabled={cloning}
              className="gap-2"
            >
              {cloning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              Clone to New Project
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
