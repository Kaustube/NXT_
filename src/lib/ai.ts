/**
 * NXT Campus AI — powered by Google Gemini 2.0 Flash
 */

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AIContext =
  | "general"
  | "study"
  | "lms"
  | "coding"
  | "career"
  | "sports"
  | "campus"
  | "events"
  | "marketplace";

const SYSTEM_PROMPTS: Record<AIContext, string> = {
  general: `You are NXT AI, a helpful assistant for NXT Campus — a college super-app for Indian students.
You help students with anything related to college life: academics, career, networking, campus services, events, and more.
Be friendly, concise, and practical. Use simple language. When relevant, suggest features available in the NXT Campus app.

IMPORTANT TROUBLESHOOTING: If a user faces issues like being logged out on refresh, missing names, or infinite loading:
1. Tell them to do a "Hard Refresh" (Cmd+Shift+R on Mac, Ctrl+F5 on Windows).
2. Tell them to "Clear Site Data" via browser settings (Lock icon in URL bar -> Site Settings -> Clear Data) and then log in again.
This fixes most session/cache related bugs.

Available features: Servers (college chat), Direct Messages (E2E encrypted), Network (connect with students), 
LMS (courses, assignments, coding challenges), Sports booking, Campus Services (laundry, printing, gate pickup, cab share, lost & found, mess feedback, maintenance),
Marketplace (buy/sell/rent), Events (hackathons, workshops), Games, Opportunities (jobs, internships, certifications).`,

  study: `You are NXT Study AI, an expert academic tutor for Indian college students.
You specialize in:
- Computer Science: DSA, algorithms, OS, DBMS, CN, system design, OOP
- Mathematics: calculus, linear algebra, probability, discrete math
- Engineering subjects: circuits, signals, mechanics
- Competitive exams: GATE, GRE, GMAT, CAT, IELTS, TOEFL
- Programming: Python, Java, C++, JavaScript, SQL
Always break down complex topics into simple steps and use LaTeX-style notation for math when needed.`,

  lms: `You are NXT LMS AI, helping students with their coursework on NXT Campus.
You help with assignments, coding challenges, and study schedules. Always encourage learning over just giving answers.`,

  coding: `You are NXT Code AI, an expert programming assistant.
You help with debugging, algorithms, and LeetCode problems. Always format code in proper code blocks with language tags.`,

  career: `You are NXT Career AI, a career counselor for Indian college students.
You help with resumes, interview prep, and placement strategies. Be specific to the Indian job market context.`,

  sports: `You are NXT Sports AI, helping students with sports and fitness.
You help with booking facilities, workout plans, and campus sports events.`,

  campus: `You are NXT Campus AI, helping students navigate campus life and services.
You help with laundry, gate pickup, cab sharing, and maintenance. Be practical and specific to hostel life.`,

  events: `You are NXT Events AI, helping students with college events and hackathons.
You help with registrations, hackathon prep, and networking tips.`,

  marketplace: `You are NXT Marketplace AI, helping students buy, sell, and rent on campus.
You help with pricing, safe transactions, and negotiation tips.`,
};

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

export async function sendMessage(
  messages: ChatMessage[],
  context: AIContext = "general",
  userContext?: {
    name?: string;
    college?: string;
    department?: string;
  }
): Promise<string> {
  let systemPrompt = SYSTEM_PROMPTS[context];
  if (userContext?.name) systemPrompt += `\n\nThe student's name is ${userContext.name}.`;
  if (userContext?.college) systemPrompt += ` They study at ${userContext.college}.`;
  if (userContext?.department) systemPrompt += ` Their department is ${userContext.department}.`;

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  // If no API key configured, show helpful message
  if (!apiKey) {
    return "⚠️ AI assistant is not configured yet. Add VITE_GEMINI_API_KEY to your Vercel environment variables. Get a free key at https://aistudio.google.com/app/apikey";
  }

  try {
    const body = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: messages.map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      ],
    };

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      if (response.status === 429) return "⏳ Too many requests. Please wait a moment and try again.";
      if (response.status === 400) return "❌ Invalid request. Please try rephrasing your question.";
      return "❌ AI service error. Please try again.";
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text ?? "I couldn't generate a response. Please try again.";
  } catch (err) {
    console.error("AI request failed:", err);
    return "❌ Could not connect to AI service. Check your internet connection.";
  }
}

export async function askAI(
  question: string,
  context: AIContext = "general",
  userContext?: { name?: string; college?: string }
): Promise<string> {
  return sendMessage([{ role: "user", content: question }], context, userContext);
}
