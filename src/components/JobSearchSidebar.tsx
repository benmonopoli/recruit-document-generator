import { useState } from "react";
import { Search, Download, Eye, Loader2, X, Briefcase, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { generateCleanPDF } from "@/lib/pdfExport";
import ReactMarkdown from "react-markdown";

interface GreenhouseJob {
  id: string;
  title: string;
  department: string | null;
  location: string | null;
  status: string | null;
}

interface JobDetails {
  id: string;
  title: string;
  department: string | null;
  location: string | null;
  employment_type: string | null;
  description: string | null;
  requirements: string | null;
}

export function JobSearchSidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<GreenhouseJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobDetails | null>(null);
  const [isLoadingJob, setIsLoadingJob] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);

  const searchJobs = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("greenhouse", {
        body: { action: "search_jobs", query: searchQuery },
      });

      if (error) throw error;
      setSearchResults(data?.jobs || []);
      setIsExpanded(true);
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Failed to search jobs");
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      searchJobs();
    }
  };

  const viewJob = async (job: GreenhouseJob) => {
    setIsLoadingJob(true);
    try {
      const { data, error } = await supabase.functions.invoke("greenhouse", {
        body: { action: "get_job", jobId: job.id },
      });

      if (error) throw error;

      if (data?.job) {
        setSelectedJob(data.job);
        setShowViewDialog(true);
      }
    } catch (error) {
      console.error("Error fetching job:", error);
      toast.error("Failed to load job details");
    } finally {
      setIsLoadingJob(false);
    }
  };

  const downloadJobAsPDF = async (job: GreenhouseJob, e?: React.MouseEvent) => {
    e?.stopPropagation();

    try {
      const { data, error } = await supabase.functions.invoke("greenhouse", {
        body: { action: "get_job", jobId: job.id },
      });

      if (error) throw error;

      const jobDetails = data?.job;
      if (jobDetails) {
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

  const formatJobContent = (job: JobDetails) => {
    // Process description and requirements to ensure proper bullet formatting
    const processContent = (html: string | null) => {
      if (!html) return "";
      
      // Convert HTML to cleaner markdown
      let text = html
        // Convert list items to bullets
        .replace(/<li>/gi, "\n• ")
        .replace(/<\/li>/gi, "")
        // Convert br tags to newlines
        .replace(/<br\s*\/?>/gi, "\n")
        // Remove other HTML tags
        .replace(/<[^>]*>/g, "")
        // Clean up multiple newlines
        .replace(/\n{3,}/g, "\n\n")
        .trim();
      
      return text;
    };

    const description = processContent(job.description);
    const requirements = processContent(job.requirements);

    return `${job.department ? `**Department:** ${job.department}\n` : ""}${job.location ? `**Location:** ${job.location}\n` : ""}${job.employment_type ? `**Employment Type:** ${job.employment_type}` : ""}

---

## About the Role

${description}

${requirements ? `---

## Requirements

${requirements}` : ""}`;
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setIsExpanded(false);
  };

  return (
    <div className="mt-6">
      <h3 className="px-3 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-2">
        Job Search
      </h3>
      
      {/* Search Input */}
      <div className="px-3 mb-2">
        <div className="relative">
          <Input
            placeholder="Search past roles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-8 text-xs pr-16 bg-sidebar-accent/30 border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/50"
          />
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-0.5">
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                onClick={clearSearch}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              onClick={searchJobs}
              disabled={isSearching || !searchQuery.trim()}
            >
              {isSearching ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Search className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Search Results */}
      {isExpanded && searchResults.length > 0 && (
        <ScrollArea className="h-48 px-3">
          <div className="space-y-1">
            {searchResults.map((job) => (
              <button
                key={job.id}
                onClick={() => viewJob(job)}
                disabled={isLoadingJob}
                className="w-full text-left p-2 rounded-md bg-sidebar-accent/20 hover:bg-sidebar-accent/40 transition-colors cursor-pointer disabled:opacity-50"
              >
                <p className="text-xs font-medium text-sidebar-foreground line-clamp-2 leading-snug">
                  {job.title}
                </p>
                {job.department && (
                  <p className="text-[10px] text-sidebar-foreground/50 mt-0.5">
                    {job.department}
                  </p>
                )}
              </button>
            ))}
          </div>
        </ScrollArea>
      )}

      {isExpanded && searchResults.length === 0 && !isSearching && searchQuery && (
        <div className="px-3">
          <p className="text-xs text-sidebar-foreground/50 text-center py-4">
            No jobs found
          </p>
        </div>
      )}

      {/* View Job Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-3xl h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Briefcase className="h-5 w-5 text-primary" />
              {selectedJob?.title}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {selectedJob && (
              <div className="space-y-6">
                {/* Meta info */}
                <div className="flex flex-wrap gap-x-6 gap-y-2 pb-4 border-b">
                  {selectedJob.department && (
                    <div>
                      <span className="text-sm font-medium text-foreground">Department:</span>
                      <span className="text-sm text-muted-foreground ml-2">{selectedJob.department}</span>
                    </div>
                  )}
                  {selectedJob.location && (
                    <div>
                      <span className="text-sm font-medium text-foreground">Location:</span>
                      <span className="text-sm text-muted-foreground ml-2">{selectedJob.location}</span>
                    </div>
                  )}
                  {selectedJob.employment_type && (
                    <div>
                      <span className="text-sm font-medium text-foreground">Type:</span>
                      <span className="text-sm text-muted-foreground ml-2">{selectedJob.employment_type}</span>
                    </div>
                  )}
                </div>

                {/* About the Role */}
                {selectedJob.description && (
                  <div className="space-y-3">
                    <h3 className="text-base font-semibold text-foreground">About the Role</h3>
                    <div 
                      className="text-sm text-muted-foreground leading-relaxed space-y-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_li]:leading-relaxed [&_p]:mb-3"
                      dangerouslySetInnerHTML={{ 
                        __html: selectedJob.description
                          .replace(/<ul>/gi, '<ul class="my-3">')
                          .replace(/<li>/gi, '<li class="ml-1">')
                      }} 
                    />
                  </div>
                )}

                {/* Requirements */}
                {selectedJob.requirements && (
                  <div className="space-y-3 pt-4 border-t">
                    <h3 className="text-base font-semibold text-foreground">Requirements</h3>
                    <div 
                      className="text-sm text-muted-foreground leading-relaxed space-y-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_li]:leading-relaxed [&_p]:mb-3"
                      dangerouslySetInnerHTML={{ 
                        __html: selectedJob.requirements
                          .replace(/<ul>/gi, '<ul class="my-3">')
                          .replace(/<li>/gi, '<li class="ml-1">')
                      }} 
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 px-6 py-4 border-t shrink-0">
            <Button
              variant="outline"
              onClick={() => setShowViewDialog(false)}
            >
              Close
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                if (selectedJob) {
                  const content = formatJobContent(selectedJob);
                  try {
                    await navigator.clipboard.writeText(content);
                    toast.success("Copied to clipboard");
                  } catch {
                    toast.error("Failed to copy");
                  }
                }
              }}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
            <Button
              onClick={() => {
                if (selectedJob) {
                  const content = formatJobContent(selectedJob);
                  generateCleanPDF(content, selectedJob.title);
                  toast.success("Downloaded as PDF");
                }
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
