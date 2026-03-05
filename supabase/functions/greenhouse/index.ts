import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GreenhouseJob {
  id: number;
  name: string;
  status: string;
  departments: Array<{ name: string }>;
  offices: Array<{ name: string }>;
  custom_fields?: Record<string, unknown>;
  created_at: string;
  closed_at?: string;
  keyed_custom_fields?: Record<string, { value: unknown }>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GREENHOUSE_API_KEY = Deno.env.get("GREENHOUSE_API_KEY");
    if (!GREENHOUSE_API_KEY) {
      throw new Error("GREENHOUSE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, jobId, forceRefresh, query } = await req.json();

    const headers = {
      Authorization: `Basic ${btoa(GREENHOUSE_API_KEY + ":")}`,
      "Content-Type": "application/json",
    };

    if (action === "list_jobs") {
      // Check cache first unless force refresh
      if (!forceRefresh) {
        const { data: cachedJobs } = await supabase
          .from("greenhouse_jobs_cache")
          .select("*")
          .order("created_date", { ascending: false });

        if (cachedJobs && cachedJobs.length > 0) {
          // Check if cache is less than 1 hour old
          const cacheAge = Date.now() - new Date(cachedJobs[0].cached_at).getTime();
          if (cacheAge < 60 * 60 * 1000) {
            return new Response(JSON.stringify({ jobs: cachedJobs, fromCache: true }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      }

      // Fetch from Greenhouse API
      const response = await fetch("https://harvest.greenhouse.io/v1/jobs?per_page=100", {
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Greenhouse API error:", response.status, errorText);
        throw new Error(`Greenhouse API error: ${response.status}`);
      }

      const jobs: GreenhouseJob[] = await response.json();

      // Transform and cache jobs
      const transformedJobs = jobs.map((job) => ({
        id: job.id.toString(),
        title: job.name,
        status: job.status,
        department: job.departments?.[0]?.name || null,
        location: job.offices?.[0]?.name || null,
        created_date: job.created_at,
        closed_date: job.closed_at || null,
        custom_fields: job.keyed_custom_fields || job.custom_fields || null,
        cached_at: new Date().toISOString(),
      }));

      // Upsert to cache
      if (transformedJobs.length > 0) {
        const { error: upsertError } = await supabase
          .from("greenhouse_jobs_cache")
          .upsert(transformedJobs, { onConflict: "id" });

        if (upsertError) {
          console.error("Cache upsert error:", upsertError);
        }
      }

      return new Response(JSON.stringify({ jobs: transformedJobs, fromCache: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get_job") {
      if (!jobId) {
        throw new Error("jobId is required");
      }

      // Fetch job details including job post content
      const [jobResponse, jobPostResponse] = await Promise.all([
        fetch(`https://harvest.greenhouse.io/v1/jobs/${jobId}`, { headers }),
        fetch(`https://harvest.greenhouse.io/v1/jobs/${jobId}/job_posts`, { headers }),
      ]);

      if (!jobResponse.ok) {
        throw new Error(`Failed to fetch job: ${jobResponse.status}`);
      }

      const job = await jobResponse.json();
      let jobPosts = [];
      
      if (jobPostResponse.ok) {
        jobPosts = await jobPostResponse.json();
      }

      // Find the live job post
      const livePost = jobPosts.find((post: { live: boolean }) => post.live) || jobPosts[0];

      return new Response(
        JSON.stringify({
          job: {
            id: job.id,
            title: job.name,
            status: job.status,
            department: job.departments?.[0]?.name,
            location: job.offices?.[0]?.name,
            created_date: job.created_at,
            description: livePost?.content || null,
            requirements: livePost?.requirements || null,
            custom_fields: job.keyed_custom_fields || job.custom_fields,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "search_jobs") {
      if (!query) {
        throw new Error("query is required for search");
      }
      const { data: jobs } = await supabase
        .from("greenhouse_jobs_cache")
        .select("*")
        .or(`title.ilike.%${query}%,department.ilike.%${query}%`)
        .order("created_date", { ascending: false })
        .limit(20);

      return new Response(JSON.stringify({ jobs: jobs || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    console.error("Greenhouse function error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
