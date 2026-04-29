/**
 * NXT Campus AI — powered by Google Gemini 2.0 Flash
 *
 * Get your free API key at: https://aistudio.google.com/app/apikey
 * Add to .env: VITE_GEMINI_API_KEY=your_key_here
 *
 * Free tier: 15 requests/min, 1M tokens/day — plenty for a student platform.
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
- Explaining concepts clearly with examples
- Solving problems step by step
- Creating study plans and revision strategies
- Exam tips and time management

Always:
- Break down complex topics into simple steps
- Give real examples and analogies
- Suggest practice problems when relevant
- Be encouraging and patient
- Format code properly in code blocks
- Use LaTeX-style notation for math when needed (e.g., x^2 + y^2 = r^2)`,

  lms: `You are NXT LMS AI, helping students with their coursework on NXT Campus.
You help with:
- Understanding course material and concepts
- Assignment help (guide, don't just give answers)
- Coding challenge hints and explanations
- Study schedules and exam preparation
- Understanding professor feedback
- Research and reference suggestions
Always encourage learning over just getting answers.`,

  coding: `You are NXT Code AI, an expert programming assistant for college students.
You help with:
- Debugging code (ask for the error message and code)
- Explaining algorithms and data structures
- Code reviews and optimization
- LeetCode/competitive programming problems
- Project architecture and design patterns
- Language-specific questions (Python, Java, C++, JS, etc.)
Always:
- Format code in proper code blocks with language tags
- Explain the logic, not just give the answer
- Suggest time/space complexity
- Mention edge cases`,

  career: `You are NXT Career AI, a career counselor for Indian college students.
You help with:
- Resume writing and review
- Interview preparation (technical + HR)
- Internship and job search strategies
- LinkedIn profile optimization
- Cover letter writing
- Salary negotiation
- Career path guidance (SWE, product, design, finance, etc.)
- FAANG/startup preparation
- Placement season tips
Be specific to the Indian job market and college placement context.`,

  sports: `You are NXT Sports AI, helping students with sports and fitness at college.
You help with:
- Booking sports facilities on campus
- Fitness and workout plans for students
- Sports rules and techniques
- Injury prevention and recovery
- Nutrition advice for student athletes
- College sports events and tournaments
Keep advice practical for students with limited time and resources.`,

  campus: `You are NXT Campus AI, helping students navigate campus life and services.
You help with:
- Campus services (laundry, printing, gate pickup, cab sharing, maintenance)
- Hostel life tips
- Mess food and nutrition
- Lost and found
- Campus navigation and facilities
- College rules and regulations
- Student welfare and mental health resources
Be practical and specific to Indian college campus life.`,

  events: `You are NXT Events AI, helping students with college events and opportunities.
You help with:
- Finding and registering for events (hackathons, workshops, seminars)
- Preparing for hackathons and coding contests
- Event organization tips
- Networking at events
- Building projects for hackathons
- Pitch deck and presentation tips
Be enthusiastic and encouraging about student participation.`,

  marketplace: `You are NXT Marketplace AI, helping students buy, sell, and rent on campus.
You help with:
- Pricing advice for used items
- Safe transaction tips
- What to buy/sell as a student
- Negotiation tips
- Identifying good deals
- Avoiding scams
Keep advice practical and relevant to student budgets.`,
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
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    return "⚠️ AI is not configured yet. Add your Gemini API key to the .env file as VITE_GEMINI_API_KEY. Get a free key at https://aistudio.google.com/app/apikey";
  }

  // Build system prompt with user context
  let systemPrompt = SYSTEM_PROMPTS[context];
  if (userContext?.name) {
    systemPrompt += `\n\nThe student's name is ${userContext.name}.`;
  }
  if (userContext?.college) {
    systemPrompt += ` They study at ${userContext.college}.`;
  }
  if (userContext?.department) {
    systemPrompt += ` Their department is ${userContext.department}.`;
  }

  // Convert messages to Gemini format
  const geminiMessages = messages.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const body = {
    system_instruction: {
      parts: [{ text: systemPrompt }],
    },
    contents: geminiMessages,
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

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      if (response.status === 429) {
        return "⏳ Too many requests. Please wait a moment and try again.";
      }
      if (response.status === 400) {
        return "❌ Invalid request. Please try rephrasing your question.";
      }
      console.error("Gemini API error:", err);
      return "❌ AI service error. Please try again.";
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return "I couldn't generate a response. Please try again.";
    }

    return text;
  } catch (err) {
    console.error("AI request failed:", err);
    return "❌ Could not connect to AI service. Check your internet connection.";
  }
}

// Quick one-shot question (no history)
export async function askAI(
  question: string,
  context: AIContext = "general",
  userContext?: { name?: string; college?: string }
): Promise<string> {
  return sendMessage([{ role: "user", content: question }], context, userContext);
}
