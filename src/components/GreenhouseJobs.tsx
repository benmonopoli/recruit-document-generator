import { useState, useEffect, useMemo, useCallback } from "react";
import { Search, RefreshCw, Building2, MapPin, Calendar, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { fetchGreenhouseJobs, fetchGreenhouseJob } from "@/lib/ai";
import type { GreenhouseJob } from "@/types";
import { cn } from "@/lib/utils";

interface GreenhouseJobsProps {
  onSelectJob?: (job: GreenhouseJob) => void;
  selectedJobId?: string;
}

export function GreenhouseJobs({ onSelectJob, selectedJobId }: GreenhouseJobsProps) {
  const [jobs, setJobs] = useState<GreenhouseJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadJobs = async (forceRefresh = false) => {
    try {
      setError(null);
      if (forceRefresh) setRefreshing(true);
      else setLoading(true);

      const { jobs: fetchedJobs } = await fetchGreenhouseJobs(forceRefresh);
      setJobs(fetchedJobs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load jobs");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  // Memoize filtered jobs to avoid recalculating on every render
  const filteredJobs = useMemo(() => 
    jobs.filter(
      (job) =>
        job.title.toLowerCase().includes(search.toLowerCase()) ||
        job.department?.toLowerCase().includes(search.toLowerCase()) ||
        job.location?.toLowerCase().includes(search.toLowerCase())
    ), 
    [jobs, search]
  );

  const handleSelectJob = useCallback(async (job: GreenhouseJob) => {
    if (onSelectJob) {
      try {
        const { job: fullJob } = await fetchGreenhouseJob(job.id);
        onSelectJob(fullJob);
      } catch {
        onSelectJob(job);
      }
    }
  }, [onSelectJob]);

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-destructive mb-4">{error}</p>
        <Button onClick={() => loadJobs(true)} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border space-y-3">
        <Alert className="bg-muted/50 border-muted">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Click any past role to use it as a template. The AI will help you iterate on it for your new position.
          </AlertDescription>
        </Alert>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search past roles..."
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => loadJobs(true)}
            disabled={refreshing}
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {filteredJobs.length} role{filteredJobs.length !== 1 ? "s" : ""} found
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {filteredJobs.map((job) => (
            <Card
              key={job.id}
              className={cn(
                "cursor-pointer transition-colors hover:bg-accent/50",
                selectedJobId === job.id && "ring-2 ring-primary"
              )}
              onClick={() => handleSelectJob(job)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{job.title}</CardTitle>
                  <Badge
                    variant={job.status === "open" ? "default" : "secondary"}
                    className="shrink-0"
                  >
                    {job.status || "unknown"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {job.department && (
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {job.department}
                    </span>
                  )}
                  {job.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {job.location}
                    </span>
                  )}
                  {job.created_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(job.created_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredJobs.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No jobs found matching your search.</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
