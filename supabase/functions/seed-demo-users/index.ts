import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Demo = {
  email: string;
  password: string;
  display_name: string;
  username: string;
  roll_number?: string;
  bio?: string;
  skills?: string[];
  interests?: string[];
};

const PASSWORD = "123456";

const users: Demo[] = [
  // Bennett — 8
  {
    email: "S24CSEU1380@bennett.edu.in",
    password: PASSWORD,
    display_name: "Kaustubh Singh",
    username: "kaustubh",
    roll_number: "S24CSEU1380",
    bio: "CSE @ Bennett. Building things on the side.",
    skills: ["React", "Node", "Postgres"],
    interests: ["Startups", "Systems", "Design"],
  },
  {
    email: "S24CSEU1409@bennett.edu.in",
    password: PASSWORD,
    display_name: "Aryan Parmar",
    username: "aryan",
    roll_number: "S24CSEU1409",
    bio: "Backend, infra, anything that runs at 3am.",
    skills: ["Go", "Kubernetes", "Postgres"],
    interests: ["Distributed systems", "DevOps"],
  },
  {
    email: "S24CSEU0016@bennett.edu.in",
    password: PASSWORD,
    display_name: "Atharv Kundu",
    username: "atharv",
    roll_number: "S24CSEU0016",
    bio: "ML student. Currently chasing transformers.",
    skills: ["Python", "PyTorch", "NLP"],
    interests: ["AI research", "Reading papers"],
  },
  {
    email: "S24CSEU1382@bennett.edu.in",
    password: PASSWORD,
    display_name: "Ashay Jain",
    username: "ashay",
    roll_number: "S24CSEU1382",
    skills: ["TypeScript", "Next.js"],
    interests: ["Frontend", "UI"],
  },
  {
    email: "S24CSEU1386@bennett.edu.in",
    password: PASSWORD,
    display_name: "Aryan Singh",
    username: "aryansingh",
    roll_number: "S24CSEU1386",
    skills: ["Figma", "React"],
    interests: ["Product design"],
  },
  {
    email: "S24CSEU1375@bennett.edu.in",
    password: PASSWORD,
    display_name: "Palash Arora",
    username: "palash",
    roll_number: "S24CSEU1375",
    skills: ["C++", "DSA"],
    interests: ["Competitive programming"],
  },
  {
    email: "S24CSEU1381@bennett.edu.in",
    password: PASSWORD,
    display_name: "Vaibhav Dhabhai",
    username: "vaibhav",
    roll_number: "S24CSEU1381",
    skills: ["Java", "Spring"],
    interests: ["Backend"],
  },
  {
    email: "S24CSEU1378@bennett.edu.in",
    password: PASSWORD,
    display_name: "Funshul Jain",
    username: "funshul",
    roll_number: "S24CSEU1378",
    skills: ["Rust", "WebAssembly"],
    interests: ["Performance"],
  },
  // IITD — 3
  {
    email: "user1@iitd.ac.in",
    password: PASSWORD,
    display_name: "Devansh Rao",
    username: "devansh",
    skills: ["Algorithms", "C++"],
    interests: ["Research"],
  },
  {
    email: "user2@iitd.ac.in",
    password: PASSWORD,
    display_name: "Aditi Sharma",
    username: "aditi",
    skills: ["ML", "Statistics"],
    interests: ["AI", "Math"],
  },
  {
    email: "user3@iitd.ac.in",
    password: PASSWORD,
    display_name: "Rohan Bhatt",
    username: "rohan",
    skills: ["Embedded", "C"],
    interests: ["Robotics"],
  },
  // DU — 4
  {
    email: "user1@du.ac.in",
    password: PASSWORD,
    display_name: "Vanya Khanna",
    username: "vanya",
    skills: ["Economics", "Python"],
    interests: ["Fintech"],
  },
  {
    email: "user2@du.ac.in",
    password: PASSWORD,
    display_name: "Tanmay Joshi",
    username: "tanmay",
    skills: ["Writing", "Research"],
    interests: ["Policy", "Journalism"],
  },
  {
    email: "user3@du.ac.in",
    password: PASSWORD,
    display_name: "Naina Verma",
    username: "naina",
    skills: ["Marketing", "SEO"],
    interests: ["Growth"],
  },
  {
    email: "user4@du.ac.in",
    password: PASSWORD,
    display_name: "Yash Agarwal",
    username: "yash",
    skills: ["Public speaking", "Debate"],
    interests: ["Law"],
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const results: Array<{ email: string; status: string; id?: string }> = [];

  for (const u of users) {
    try {
      const { data, error } = await admin.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: {
          display_name: u.display_name,
          username: u.username,
          roll_number: u.roll_number ?? null,
        },
      });

      let userId: string | undefined = data?.user?.id;

      if (error) {
        // Likely already exists — find them
        const { data: list } = await admin.auth.admin.listUsers();
        const existing = list?.users?.find((x) => x.email === u.email);
        if (!existing) {
          results.push({ email: u.email, status: `error: ${error.message}` });
          continue;
        }
        userId = existing.id;
        results.push({ email: u.email, status: "exists", id: userId });
      } else {
        results.push({ email: u.email, status: "created", id: userId });
      }

      if (userId) {
        // Patch profile with bio/skills/interests after trigger
        await admin
          .from("profiles")
          .update({
            bio: u.bio ?? null,
            skills: u.skills ?? [],
            interests: u.interests ?? [],
          })
          .eq("user_id", userId);

        // Auto-join servers based on college + all global servers
        const domain = u.email.split("@")[1];
        const { data: college } = await admin
          .from("colleges")
          .select("id")
          .eq("email_domain", domain)
          .maybeSingle();

        const { data: servers } = await admin
          .from("servers")
          .select("id, kind, college_id");

        const joins = (servers ?? [])
          .filter(
            (s: any) =>
              s.kind === "global" ||
              (s.kind === "college" && s.college_id === college?.id),
          )
          .map((s: any) => ({ server_id: s.id, user_id: userId }));

        if (joins.length) {
          await admin
            .from("server_members")
            .upsert(joins, { onConflict: "server_id,user_id" });
        }
      }
    } catch (e: any) {
      results.push({ email: u.email, status: `error: ${e.message}` });
    }
  }

  return new Response(JSON.stringify({ ok: true, results }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
});
