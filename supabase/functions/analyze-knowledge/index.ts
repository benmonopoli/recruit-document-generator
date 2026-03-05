import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AnalyzeRequest {
  action: "sync_all" | "sync_greenhouse" | "sync_website" | "get_status";
}

// Company website URLs to analyze for tone/voice matching
// Set COMPANY_ABOUT_URL and COMPANY_CAREERS_URL as Supabase Edge Function secrets
const COMPANY_URLS = [
  { url: Deno.env.get("COMPANY_ABOUT_URL") || "", type: "company_about" },
  { url: Deno.env.get("COMPANY_CAREERS_URL") || "", type: "careers_page" },
].filter(({ url }) => url !== "");

async function fetchWebsiteContent(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) return "";
    
    const html = await response.text();
    
    // Extract text content from HTML (simple extraction)
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    
    return textContent.slice(0, 15000); // Limit content size
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error);
    return "";
  }
}

async function fetchGreenhouseJobPosts(apiKey: string): Promise<Array<{ id: string; title: string; description: string; requirements: string }>> {
  const headers = {
    Authorization: `Basic ${btoa(apiKey + ":")}`,
    "Content-Type": "application/json",
  };

  try {
    // Fetch all jobs
    const jobsResponse = await fetch("https://harvest.greenhouse.io/v1/jobs?per_page=500", { headers });
    if (!jobsResponse.ok) {
      console.error("Failed to fetch jobs:", jobsResponse.status);
      return [];
    }
    
    const jobs = await jobsResponse.json();
    const jobPosts: Array<{ id: string; title: string; description: string; requirements: string }> = [];

    // Fetch job post content for each job (limit to 50 for performance)
    const jobsToFetch = jobs.slice(0, 50);
    
    for (const job of jobsToFetch) {
      try {
        const postResponse = await fetch(
          `https://harvest.greenhouse.io/v1/jobs/${job.id}/job_posts`,
          { headers }
        );
        
        if (postResponse.ok) {
          const posts = await postResponse.json();
          const livePost = posts.find((p: { live: boolean }) => p.live) || posts[0];
          
          if (livePost?.content || livePost?.requirements) {
            jobPosts.push({
              id: job.id.toString(),
              title: job.name,
              description: livePost.content || "",
              requirements: livePost.requirements || "",
            });
          }
        }
      } catch (err) {
        console.error(`Error fetching post for job ${job.id}:`, err);
      }
    }

    return jobPosts;
  } catch (error) {
    console.error("Greenhouse fetch error:", error);
    return [];
  }
}

async function analyzeContentWithAI(
  content: string,
  contentType: string,
  apiKey: string
): Promise<string> {
  const prompt = `Analyze the following ${contentType} content and extract:

1. **Writing Style Patterns**: Sentence structure, word choice preferences, typical phrasing
2. **Tone Characteristics**: Formal vs casual, direct vs soft, humorous elements
3. **Common Phrases**: Recurring expressions, signature language
4. **Structure Patterns**: How content is organized, section ordering
5. **Cultural Signals**: Values, priorities, and personality that come through
6. **Unique Voice Elements**: What makes this distinctly the company's own voice

Content to analyze:
${content.slice(0, 10000)}

Provide a structured analysis that can be used to guide AI-generated content to match the company's authentic voice. Be specific with examples.`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "You are an expert content analyst specializing in brand voice and tone analysis. Provide actionable insights that can guide content generation." },
        { role: "user", content: prompt }
      ],
      max_completion_tokens: 2000,
    }),
  });

  if (!response.ok) {
    console.error("AI analysis failed:", response.status);
    return "";
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action }: AnalyzeRequest = await req.json();
    
    const GREENHOUSE_API_KEY = Deno.env.get("GREENHOUSE_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (action === "get_status") {
      const { data: knowledge } = await supabase
        .from("company_knowledge")
        .select("content_type, updated_at, source_url");
      
      return new Response(JSON.stringify({ 
        status: "ok",
        knowledge: knowledge || [],
        hasGreenhouseKey: !!GREENHOUSE_API_KEY,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: string[] = [];

    // Sync Website Content
    if (action === "sync_all" || action === "sync_website") {
      console.log("Syncing website content...");
      
      for (const { url, type } of COMPANY_URLS) {
        const content = await fetchWebsiteContent(url);
        if (content) {
          const analysis = await analyzeContentWithAI(content, type, LOVABLE_API_KEY);
          
          if (analysis) {
            await supabase.from("company_knowledge").upsert({
              id: type,
              content_type: type,
              content: analysis,
              source_url: url,
              updated_at: new Date().toISOString(),
            }, { onConflict: "id" });
            
            results.push(`✓ Analyzed ${type} from ${url}`);
          }
        }
      }
    }

    // Sync Greenhouse Job Posts
    if ((action === "sync_all" || action === "sync_greenhouse") && GREENHOUSE_API_KEY) {
      console.log("Syncing Greenhouse job posts...");
      
      const jobPosts = await fetchGreenhouseJobPosts(GREENHOUSE_API_KEY);
      
      if (jobPosts.length > 0) {
        // Combine all job descriptions for analysis
        const combinedContent = jobPosts.map(job => 
          `## ${job.title}\n\n${job.description}\n\n${job.requirements}`
        ).join("\n\n---\n\n");
        
        const analysis = await analyzeContentWithAI(
          combinedContent,
          "job_descriptions",
          LOVABLE_API_KEY
        );
        
        if (analysis) {
          await supabase.from("company_knowledge").upsert({
            id: "job_descriptions",
            content_type: "job_descriptions",
            content: analysis,
            source_url: "greenhouse://historical-jobs",
            updated_at: new Date().toISOString(),
          }, { onConflict: "id" });
          
          results.push(`✓ Analyzed ${jobPosts.length} job descriptions from Greenhouse`);
        }

        // Also store raw examples for reference
        const topExamples = jobPosts.slice(0, 5).map(job => ({
          title: job.title,
          excerpt: (job.description + "\n" + job.requirements).slice(0, 500),
        }));

        await supabase.from("company_knowledge").upsert({
          id: "job_examples",
          content_type: "job_examples",
          content: JSON.stringify(topExamples, null, 2),
          source_url: "greenhouse://examples",
          updated_at: new Date().toISOString(),
        }, { onConflict: "id" });
        
        results.push(`✓ Stored ${topExamples.length} example job descriptions`);
      } else {
        results.push("⚠ No job posts found in Greenhouse");
      }
    } else if ((action === "sync_all" || action === "sync_greenhouse") && !GREENHOUSE_API_KEY) {
      results.push("⚠ GREENHOUSE_API_KEY not configured - skipping job sync");
    }

    return new Response(JSON.stringify({ 
      success: true,
      results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Analyze knowledge error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
