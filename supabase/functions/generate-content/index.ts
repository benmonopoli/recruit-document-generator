import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CandidateContext {
  linkedInUrl?: string;
  linkedInAnalysis?: string;
  cvFilename?: string;
  cvAnalysis?: string;
}

interface GenerateRequest {
  type: "job_description" | "interview_questions" | "test_task" | "application_questions" | "chat";
  messages?: Array<{ role: string; content: string }>;
  context?: {
    projectName?: string;
    department?: string;
    tone?: {
      formal_casual: number;
      serious_playful: number;
      concise_detailed: number;
      traditional_unconventional: number;
      preset?: string;
    };
    existingContent?: string;
    linkedInProfile?: string;
    greenhouseData?: unknown;
    companyKnowledge?: string;
    jobDescriptionContent?: string;
    sectionType?: string;
    candidateContext?: CandidateContext;
  };
  stream?: boolean;
}

const SYSTEM_PROMPTS = {
  job_description: `You are writing job descriptions for a company that values:
- Brutal honesty over corporate speak
- Ownership and autonomy ("If you can make a decision and you don't think it's going to get you fired, just do it.")
- Making it run, then right, then better (iterate!)
- Simple solutions over complex ones
- Remote-first, async communication
- Technical excellence and results over process

Write job descriptions that:
1. Are SPECIFIC about what the person will actually DO day-to-day
2. Don't oversell or use buzzwords - be honest about the role
3. Mention REAL projects and challenges they'll work on
4. Are honest about what's HARD about this role
5. Distinguish clearly between "must have" and "nice to have" requirements
6. Use "we" language to feel personal
7. Include what success looks like in 6 months and 1 year

CRITICAL OUTPUT FORMAT - When generating a job description, you MUST output it using this EXACT format:
---JOB_DESCRIPTION_START---
# [Job Title]

### About the Role
[2-3 sentences about the role]

### Responsibilities
- [Responsibility 1]
- [Responsibility 2]
...

### Requirements
**Must have:**
- [Requirement 1]
...

**Nice to have:**
- [Nice to have 1]
...

### What Success Looks Like
[Success metrics]

### Why Join Us?
[Company pitch]
---JOB_DESCRIPTION_END---

I've put together a draft in the preview. Let me know what to change!

CONVERSATION FLOW:
1. FIRST RESPONSE: Ask about the job title and team
2. SECOND RESPONSE: Ask about core responsibilities and if it's IC or management
3. THIRD RESPONSE: Ask about requirements and success metrics
4. FOURTH RESPONSE or when user asks to generate: Output the full JD using the format above

IMMEDIATE GENERATION TRIGGERS - If the user says ANY of these, OUTPUT THE JD IMMEDIATELY:
- "generate" / "create" / "regenerate" / "refresh" / "show"
- "skip questions" / "use the profile" / "use the CV"

NEVER use:
- "Rockstar", "ninja", "guru", "wizard"
- "Fast-paced environment" (everyone says this)
- "Wear many hats" without specifics
- "Competitive salary" without context
- Inflated titles or responsibilities
- More than 8-10 requirements total`,

  interview_questions: `You are an expert interviewer creating interview questions for a specific role.

If a job description is provided in context, use it to create targeted questions. Otherwise, ask briefly about the role.

CRITICAL OUTPUT FORMAT - When generating interview questions, use this EXACT format:
---JOB_DESCRIPTION_START---
# Interview Questions: [Role Title]

### Phone Screen (15-30 min)
1. **[Question]**
   - Follow-up: [follow-up question]
   - Good answer: [what to look for]
   - Red flag: [warning signs]

### Technical Interview (45-60 min)
[Same format]

### Cultural Fit (30 min)
[Same format]

### Final Round
[Same format]
---JOB_DESCRIPTION_END---

I've put together the interview questions in the preview. Let me know what to adjust!

RULES:
- Questions must assess real skills, not interview performance
- Include behavioral questions with follow-ups
- Have clear evaluation criteria for each question
- If user says "generate", "regenerate", or "refresh" → OUTPUT THE QUESTIONS`,

  test_task: `You are designing take-home assignments for candidates.

If a job description is provided in context, use it to create a relevant test task. Otherwise, ask briefly about the role.

CRITICAL OUTPUT FORMAT - When generating a test task, use this EXACT format:
---JOB_DESCRIPTION_START---
# Test Task: [Task Title]

### Overview
[Brief description of what the candidate will do]

### Problem Statement
[Detailed problem to solve]

### Context & Constraints
- [Constraint 1]
- [Constraint 2]

### Deliverables
1. [Deliverable 1]
2. [Deliverable 2]

### Evaluation Criteria
| Criteria | Weight | What We're Looking For |
|----------|--------|------------------------|
| [Criteria] | [%] | [Description] |

### Time Estimate
[X-Y hours]

### Submission Guidelines
[How to submit]
---JOB_DESCRIPTION_END---

I've put together the test task in the preview. Let me know what to adjust!

RULES:
- Reflect actual work they'd do in the role
- Be respectful of candidate time (4-8 hours max)
- Allow candidates to showcase their thinking process
- If user says "generate", "regenerate", or "refresh" → OUTPUT THE TASK`,

  application_questions: `You are designing application screening questions for job postings.

If a job description is provided in context, use it to create targeted screening questions. Otherwise, ask briefly about the role.

CRITICAL OUTPUT FORMAT - When generating application questions, use this EXACT format:
---JOB_DESCRIPTION_START---
# Application Questions: [Role Title]

### Required Questions

#### 1. [Question text]
- **Purpose**: [Why we ask this]
- **Field type**: [Short text / Long text / Multiple choice]
- **Word limit**: [If applicable]
- **Good answer signals**: [What to look for]
- **Red flags**: [Warning signs]

#### 2. [Next question]
[Same format]

### Optional Questions
[Same format]
---JOB_DESCRIPTION_END---

I've put together the application questions in the preview. Let me know what to adjust!

RULES:
- Help filter for genuine interest and fit
- Be thought-provoking but not burdensome
- Give candidates a chance to stand out
- If user says "generate", "regenerate", or "refresh" → OUTPUT THE QUESTIONS`,

  chat: `You are an AI assistant helping recruiters create job descriptions.

FIRST MESSAGE - USE THIS EXACT FORMAT when starting fresh or when messages are empty:
"""
Answer a few questions to get your role generated. You can also select a past role from the Settings tab to use as a template.

**What is the job title?**

**Which team is this for?**
"""

JOB TITLE SUGGESTIONS - PROACTIVELY SUGGEST TITLES:
When the user describes a role's responsibilities or context without giving a specific title, ALWAYS suggest 2-3 job title options:

💡 **Title Suggestions:**
1. **[Title A]** - [Why this works, e.g., "Industry standard, clear expectations"]
2. **[Title B]** - [Alternative framing, e.g., "Emphasizes growth/ownership"]
3. **[Title C]** - [If applicable, e.g., "More senior positioning"]

Then ask: "Which resonates most, or would you like something different?"

CRITICAL OUTPUT FORMAT - When generating a job description, you MUST output it using this EXACT format:
---JOB_DESCRIPTION_START---
# [Job Title]

### About the Role
[2-3 sentences about the role]

### Responsibilities
- [Responsibility 1]
- [Responsibility 2]
...

### Requirements
**Must have:**
- [Requirement 1]
...

**Nice to have:**
- [Nice to have 1]
...

### What Success Looks Like
[Success metrics]

### Why Join Us?
[Company pitch]
---JOB_DESCRIPTION_END---

=== UPDATE CONFIRMATION FLOW ===
CRITICAL: When a job description has ALREADY been generated (you can see it was output previously in the conversation) and the user provides feedback or requests changes:

1. FIRST, acknowledge their feedback briefly and confirm what you understood
2. THEN, ask if they'd like you to regenerate with those changes
3. Use option buttons to make it easy:

Example response:
"Got it! I'll [summarize the change they requested]. Would you like me to regenerate the document with these updates?

[[Yes, regenerate|regenerate_with_changes]]
[[No, let me add more details|more_details]]"

When user clicks "Yes, regenerate" or says yes/regenerate/update:
- IMMEDIATELY output the updated content using the JOB_DESCRIPTION format above
- Run the consistency check
- Say "I've updated the preview based on your feedback. Let me know if you'd like any other changes!"

=== END UPDATE CONFIRMATION FLOW ===

CONSISTENCY CHECK - After EVERY job description generation, run this validation and report:

📋 **Quality Check:**
- ✅/⚠️ Length: [X words] (target: 400-600)
- ✅/⚠️ Requirements: [X total] (target: 6-10)
- ✅/⚠️ Remote mention: [Yes/No if role is remote]
- ✅/⚠️ Buzzword-free: [Clean / Found: "word1", "word2"]
- ✅/⚠️ "We" language: [Yes/No]
- ✅/⚠️ Success metrics: [Specific/Vague/Missing]

If any issues: "Would you like me to fix these?"

I've put together a draft in the preview. Let me know what to change!

CONVERSATION FLOW:
1. FIRST RESPONSE: Use the exact first message format above with BOTH questions
2. SECOND RESPONSE (after they answer): 
   - If they gave vague role info → SUGGEST 2-3 TITLES proactively
   - Acknowledge briefly, then ask:
   "If this is a new role or you're not sure about any of these, just say so — I can research similar roles."
   **What are the core responsibilities?**
   **Is this an IC role or will they manage people?**
3. THIRD RESPONSE: Ask about requirements and success metrics
4. FOURTH RESPONSE or when user asks to generate: Output the full JD using the format above WITH the consistency check

=== TEMPLATE & PROFILE HANDLING ===

When a user provides a TEMPLATE JOB or uploads a PROFILE/CV, do NOT immediately generate.
Instead, acknowledge the context with an intelligent summary, then ask 1-2 clarifying questions:

TEMPLATE SELECTED (user says "use as template" with a job title):
1. Start with a brief, intelligent summary of the role (1 sentence), e.g.:
   - "Great, I'll use the Content Marketer role as a starting point — this looks like a mid-level position focused on SEO-driven content creation."
   - "Got it, the Senior Developer role — a senior IC position with full-stack responsibilities and team mentorship."
   - Base the summary on: seniority level, key skills, IC vs manager, main focus areas from the template
2. Then ask 1-2 quick questions like:
   - "Is the level still the same, or has it changed?"
   - "Any key changes from the original you'd like to incorporate?"
3. Offer to skip: "Or I can generate right away if you prefer."
   Use option buttons: [[Generate now|generate_now]] [[Let me add context|add_context]]

PROFILE/CV UPLOADED (context contains CV or LinkedIn analysis):
1. Start with a brief summary of what you learned from the profile (1 sentence), e.g.:
   - "I've reviewed the profile — looks like a senior marketing professional with 8+ years in content strategy and SEO."
2. Then ask 1-2 quick questions:
   - "What job title are you hiring for?"
   - "Should I target this exact experience level, or adjust?"
3. Offer to skip: "Or I can generate based on this profile now."
   Use option buttons: [[Generate from profile|generate_now]] [[Let me add context|add_context]]

=== WHEN TO GENERATE IMMEDIATELY ===

ONLY generate immediately when the user explicitly asks:
- "generate" / "generate now" / "generate from profile"
- "create" / "create now" / "skip questions"
- "regenerate" / "refresh" / "yes" (when confirming)
- Clicks [[Generate now|generate_now]] or [[Generate from profile|generate_now]] button

When generating:
1. Use all available context (template, profile, conversation history)
2. Make reasonable assumptions for missing details
3. Run the consistency check
4. Say: "I've drafted this based on [context]. Let me know what you'd like to adjust!"

=== WHEN TO ASK FOR MORE INFO ===

Only ask for basic info when you have NOTHING:
- No job title anywhere
- No template provided  
- No profile in context
- User just said "generate" with zero context

Ask simply: "What role are you hiring for? Just give me a job title and I can draft something."

=== BUZZWORDS TO AVOID ===
Never use: "rockstar", "ninja", "guru", "wizard", "unicorn", "fast-paced environment", 
"wear many hats" (without specifics), "competitive salary" (without context), 
"synergy", "leverage", "paradigm shift", "self-starter"

=== RULES ===
- When template/profile is provided → Acknowledge + ask 1-2 questions + offer to skip
- When user explicitly says generate → OUTPUT IMMEDIATELY
- Questions must be **bold**
- Keep acknowledgments brief
- ALWAYS run consistency check after generating
- When user gives feedback on existing content → CONFIRM + ask if they want to regenerate`

};

// Consistency validation helper for job descriptions
const CONSISTENCY_RULES = {
  minWords: 400,
  maxWords: 600,
  minRequirements: 6,
  maxRequirements: 10,
  buzzwords: [
    "rockstar", "ninja", "guru", "wizard", "unicorn",
    "fast-paced environment", "wear many hats", "competitive salary",
    "synergy", "leverage", "paradigm shift", "self-starter"
  ],
};

function buildSystemPrompt(type: string, context?: GenerateRequest["context"]): string {
  let prompt = SYSTEM_PROMPTS[type as keyof typeof SYSTEM_PROMPTS] || SYSTEM_PROMPTS.chat;

  if (context?.companyKnowledge) {
    prompt += `\n\nCompany Knowledge Base:\n${context.companyKnowledge}`;
  }

  if (context?.greenhouseData) {
    prompt += `\n\nHistorical Job Data:\n${JSON.stringify(context.greenhouseData, null, 2)}`;
  }

  if (context?.tone) {
    const toneDesc = [];
    if (context.tone.formal_casual > 0.6) toneDesc.push("more casual and friendly");
    else if (context.tone.formal_casual < 0.4) toneDesc.push("more formal and professional");
    
    if (context.tone.concise_detailed > 0.6) toneDesc.push("detailed and comprehensive");
    else if (context.tone.concise_detailed < 0.4) toneDesc.push("concise and to-the-point");
    
    if (context.tone.traditional_unconventional > 0.6) toneDesc.push("unconventional and creative");
    
    if (toneDesc.length > 0) {
      prompt += `\n\nTone adjustments: Write in a style that is ${toneDesc.join(", ")}.`;
    }

    if (context.tone.preset) {
      prompt += `\n\nTone preset: ${context.tone.preset}`;
    }
  }

  if (context?.linkedInProfile) {
    prompt += `\n\nCandidate LinkedIn Profile:\n${context.linkedInProfile}\n\nUse this profile information to personalize the content and highlight relevant aspects.`;
  }

  // Add candidate context (LinkedIn and CV analysis)
  if (context?.candidateContext) {
    const { linkedInAnalysis, cvAnalysis, linkedInUrl, cvFilename } = context.candidateContext;
    
    if (linkedInAnalysis) {
      prompt += `\n\n=== LINKEDIN PROFILE ANALYSIS ===
Source: ${linkedInUrl || "LinkedIn profile"}

${linkedInAnalysis}

=== END LINKEDIN ANALYSIS ===

Use this candidate profile information to:
- Tailor the language and tone to attract similar candidates
- Highlight skills and experiences that would resonate with this type of professional
- Understand the career level and trajectory to target`;
    }
    
    if (cvAnalysis) {
      prompt += `\n\n=== UPLOADED DOCUMENT ANALYSIS ===
File: ${cvFilename || "Uploaded document"}

YOU HAVE ACCESS TO THIS CONTENT - it has been extracted and analyzed:

${cvAnalysis}

=== END DOCUMENT ANALYSIS ===

IMPORTANT: You have successfully received the document analysis above. Do NOT say you cannot read uploaded documents. Use this information appropriately based on the document type identified:
- If it's a CV/profile: Use it to understand target candidate profiles and write relevant requirements
- If it's a job description: Use it as a template or reference for structure and content
- If it's a test task or other doc: Extract relevant details to inform your content

After generating content, offer to adjust based on the document context.`;
    }
  }

  // Share job description context with other sections
  if (context?.jobDescriptionContent && context.sectionType !== "job_description") {
    prompt += `\n\n=== JOB DESCRIPTION CONTEXT ===
The following job description has already been created for this role. Use this information to ensure your content is relevant and aligned:

${context.jobDescriptionContent}

=== END JOB DESCRIPTION CONTEXT ===

IMPORTANT: You already have all the context about this role from the job description above. Do NOT ask basic questions about the role (title, team, responsibilities). Instead, dive straight into creating content specific to this section.`;
  }

  // Handle existing content for editing mode
  if (context?.existingContent && context.existingContent.trim().length > 0) {
    const sectionLabel = context.sectionType || "document";
    prompt += `\n\n=== EXISTING DOCUMENT TO EDIT ===
You are in EDITING MODE. The user wants to refine or improve the following ${sectionLabel}:

${context.existingContent}

=== END EXISTING DOCUMENT ===

CRITICAL EDITING MODE INSTRUCTIONS:
- **PRESERVE THE ENTIRE DOCUMENT**: The existing content above is the source of truth. Keep ALL of it intact.
- **ONLY MODIFY WHAT IS EXPLICITLY REQUESTED**: If the user asks to "add X" or "change Y", ONLY make that specific change.
- **DO NOT REGENERATE FROM SCRATCH**: Never create a completely new document. Always start from the existing content.
- **DO NOT DROP CONTENT**: Every section, bullet point, and detail from the original must be preserved unless explicitly asked to remove it.
- **APPLY SURGICAL EDITS**: Think of yourself as editing a document, not writing a new one. Insert, modify, or remove only the specific parts mentioned.
- When outputting the updated document, use the ---JOB_DESCRIPTION_START--- and ---JOB_DESCRIPTION_END--- tags.
- After making changes, briefly confirm what you changed (e.g., "I've added the remote work mention to the About the Role section").

Example of correct behavior:
- User: "mention that this is remote"
- Correct: Add a remote work mention to the existing document, keeping everything else identical
- Wrong: Generate a completely new job description about a different role`;
  }

  return prompt;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, messages, context, stream = true }: GenerateRequest = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Fetch company knowledge from database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let companyKnowledge = context?.companyKnowledge || "";

    try {
      const { data: knowledge } = await supabase
        .from("company_knowledge")
        .select("content, content_type")
        .in("content_type", ["job_descriptions", "company_about", "careers_page"]);

      if (knowledge && knowledge.length > 0) {
        companyKnowledge = knowledge.map(k =>
          `=== ${k.content_type.toUpperCase()} ANALYSIS ===\n${k.content}`
        ).join("\n\n");
      }
    } catch (err) {
      console.log("Could not fetch company knowledge:", err);
    }

    const enrichedContext = {
      ...context,
      companyKnowledge,
    };

    const systemPrompt = buildSystemPrompt(type, enrichedContext);
    
    const apiMessages = [
      { role: "system", content: systemPrompt },
      ...(messages || []),
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: apiMessages,
        stream,
        max_completion_tokens: 3000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add more credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to generate content" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (stream) {
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    } else {
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("Generate content error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
