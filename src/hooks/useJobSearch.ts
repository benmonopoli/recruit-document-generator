import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { generateCleanPDF } from "@/lib/pdfExport";
import { toast } from "sonner";

export interface CachedGreenhouseJob {
  id: string;
  title: string;
  department: string | null;
  location: string | null;
  status: string | null;
}

export interface JobDetails extends CachedGreenhouseJob {
  description?: string;
  requirements?: string;
  employment_type?: string;
}

interface UseJobSearchReturn {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: CachedGreenhouseJob[];
  isSearching: boolean;
  searchJobs: () => Promise<void>;
  clearSearch: () => void;
  fetchJobDetails: (jobId: string) => Promise<JobDetails | null>;
  downloadJobAsPDF: (job: CachedGreenhouseJob, e?: React.MouseEvent) => Promise<void>;
}

/**
 * Custom hook for searching and managing Greenhouse job data.
 * Consolidates job search logic used across QuickGen, ProjectSection, and GreenhouseJobs.
 */
export function useJobSearch(): UseJobSearchReturn {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CachedGreenhouseJob[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const searchJobs = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("greenhouse", {
        body: { action: "search_jobs", query: searchQuery },
      });

      if (error) throw error;
      setSearchResults(data?.jobs || []);
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Failed to search jobs");
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setSearchResults([]);
  }, []);

  const fetchJobDetails = useCallback(async (jobId: string): Promise<JobDetails | null> => {
    try {
      const { data, error } = await supabase.functions.invoke("greenhouse", {
        body: { action: "get_job", jobId },
      });

      if (error) throw error;
      return data?.job || null;
    } catch (error) {
      console.error("Error fetching job:", error);
      toast.error("Failed to load job details");
      return null;
    }
  }, []);

  const downloadJobAsPDF = useCallback(async (job: CachedGreenhouseJob, e?: React.MouseEvent) => {
    e?.stopPropagation();
    
    try {
      const jobDetails = await fetchJobDetails(job.id);
      
      if (jobDetails) {
        // Convert job details to clean markdown format
        const content = `# ${jobDetails.title}

${jobDetails.department ? `**Department:** ${jobDetails.department}` : ""}
${jobDetails.location ? `**Location:** ${jobDetails.location}` : ""}
${(jobDetails as JobDetails).employment_type ? `**Employment Type:** ${(jobDetails as JobDetails).employment_type}` : ""}

## About the Role

${(jobDetails as JobDetails).description ? (jobDetails as JobDetails).description!.replace(/<[^>]*>/g, "").trim() : ""}

${(jobDetails as JobDetails).requirements ? `## Requirements

${(jobDetails as JobDetails).requirements!.replace(/<[^>]*>/g, "").trim()}` : ""}`;

        generateCleanPDF(content, jobDetails.title);
        toast.success("Downloaded as PDF");
      }
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast.error("Failed to download PDF");
    }
  }, [fetchJobDetails]);

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    searchJobs,
    clearSearch,
    fetchJobDetails,
    downloadJobAsPDF,
  };
}
