import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const systemPrompt = `Analyze this document and extract key information. First identify the document type, then provide a relevant summary.

**Document Type**: [CV/Resume | Job Description | Test Task | Interview Guide | Company Info | Other: specify]

Then based on type:

FOR CV/RESUME:
- **Role**: [current title] | **Level**: [junior/mid/senior] | **Years**: [X years]
- **Skills**: [top 5-6 skills] | **Background**: [industries]
- **Strengths**: [2 key achievements]

FOR JOB DESCRIPTION:
- **Title**: [job title] | **Level**: [seniority] | **Team**: [department]
- **Key Responsibilities**: [3-4 main duties]
- **Requirements**: [must-haves] | **Nice-to-haves**: [optional skills]

FOR OTHER DOCUMENTS:
- **Purpose**: [what this document is for]
- **Key Points**: [3-5 main takeaways]
- **Relevant Info**: [anything useful for recruiting content]

Be brief and factual.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Authenticated user:", user.id);

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return new Response(
        JSON.stringify({ success: false, error: "No file provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check file type
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Unsupported file type. Please upload PDF, DOC, DOCX, or TXT files." 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Processing CV:", file.name, file.type, file.size);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Read file content
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    
    let analysisResponse: Response;

    if (file.type === "application/pdf") {
      console.log("Sending PDF to vision model...");
      
      // Convert PDF to base64 and send to vision model
      // Gemini Pro can read PDFs directly via vision API
      const base64 = btoa(String.fromCharCode(...bytes));
      
      analysisResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: [
                { type: "text", text: "Identify and analyze this document:" },
                { type: "image_url", image_url: { url: `data:application/pdf;base64,${base64}` } },
              ],
            },
          ],
          max_completion_tokens: 500,
        }),
      });
    } else if (file.type === "text/plain") {
      const textContent = new TextDecoder().decode(bytes);
      console.log(`Analyzing ${textContent.length} characters of text`);
      
      analysisResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Identify and analyze this document:\n\n${textContent.substring(0, 8000)}` },
          ],
          max_completion_tokens: 500,
        }),
      });
    } else {
      // DOC/DOCX - try to extract readable text
      const decoded = new TextDecoder().decode(bytes);
      const textContent = decoded.replace(/[^\x20-\x7E\n\r\t]/g, " ").replace(/\s+/g, " ").trim();
      
      if (textContent.length < 100) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Could not extract text from DOC/DOCX file. Please try PDF or TXT format." 
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      console.log(`Analyzing ${textContent.length} characters from DOC/DOCX`);
      
      analysisResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Identify and analyze this document:\n\n${textContent.substring(0, 8000)}` },
          ],
          max_completion_tokens: 500,
        }),
      });
    }

    if (!analysisResponse.ok) {
      const errorText = await analysisResponse.text();
      console.error("AI analysis error:", analysisResponse.status, errorText);
      
      if (analysisResponse.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (analysisResponse.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: "AI service credits exhausted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ success: false, error: "Failed to analyze CV" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const analysisData = await analysisResponse.json();
    const analysis = analysisData.choices?.[0]?.message?.content || "";

    if (!analysis) {
      return new Response(
        JSON.stringify({ success: false, error: "Could not generate analysis" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Analysis complete");

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: { 
          filename: file.name,
          analysis 
        } 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error analyzing CV:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to analyze CV";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
