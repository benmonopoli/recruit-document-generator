import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, Check, X, Upload } from "lucide-react";
import { toast } from "sonner";
import type { CandidateContext } from "@/types";

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

interface CandidateContextCardProps {
  candidateContext: CandidateContext;
  onContextChange: (context: CandidateContext) => void;
}

export function CandidateContextCard({ candidateContext, onContextChange }: CandidateContextCardProps) {
  const [isAnalyzingCV, setIsAnalyzingCV] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 10MB.");
      return;
    }

    setIsAnalyzingCV(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${FUNCTIONS_URL}/analyze-cv`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to analyze document");
      }

      onContextChange({
        ...candidateContext,
        cvFilename: data.data.filename,
        cvAnalysis: data.data.analysis,
      });

      toast.success("Document analyzed successfully");
    } catch (error) {
      console.error("Document analysis error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to analyze document");
    } finally {
      setIsAnalyzingCV(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleClearCV = () => {
    onContextChange({
      ...candidateContext,
      cvFilename: undefined,
      cvAnalysis: undefined,
    });
  };

  const hasCVData = !!candidateContext.cvAnalysis;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Candidate Profile
        </CardTitle>
        <CardDescription>
          Upload a resume or exported LinkedIn profile (PDF) and we'll extract key details to help craft a job description tailored to attract similar candidates.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasCVData ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <FileText className="h-4 w-4 text-green-600 shrink-0" />
              <span className="text-sm flex-1 truncate">{candidateContext.cvFilename}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleClearCV}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                View analysis
              </summary>
              <div className="mt-2 p-3 bg-muted/50 rounded-lg text-sm whitespace-pre-wrap">
                {candidateContext.cvAnalysis}
              </div>
            </details>
          </div>
        ) : (
          <div
            className={`border-2 border-dashed border-muted rounded-lg p-6 text-center transition-colors ${
              isAnalyzingCV ? "bg-muted/30" : "hover:border-muted-foreground/50 cursor-pointer"
            }`}
            onClick={() => !isAnalyzingCV && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              className="hidden"
              onChange={handleFileSelect}
              disabled={isAnalyzingCV}
            />
            {isAnalyzingCV ? (
              <>
                <Loader2 className="h-8 w-8 mx-auto text-muted-foreground mb-2 animate-spin" />
                <p className="text-sm text-muted-foreground">Analyzing document...</p>
              </>
            ) : (
              <>
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-1">
                  Drop a resume or LinkedIn PDF here
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  PDF, DOC, DOCX, or TXT • Max 10MB
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  Choose File
                </Button>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
