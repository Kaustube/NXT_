import { Link } from "react-router-dom";
import {
  Sparkles, ArrowRight, Zap, Shield, Users, MessageSquare,
  Trophy, Code, BookOpen, Rocket, Heart, Instagram, Mail,
} from "lucide-react";
import { useState, useEffect } from "react";
import Logo from "@/components/Logo";

export default function Landing() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-[hsl(var(--surface-1))] overflow-hidden">

      {/* Animated background orbs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,hsl(var(--primary)/0.1),transparent_40%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,hsl(var(--primary)/0.08),transparent_40%)]" />
        <div
          className="absolute top-20 left-[10%] w-64 h-64 bg-primary/20 rounded-full blur-3xl"
          style={{ transform: `translateY(${scrollY * 0.1}px)`, animation: "float 6s ease-in-out infinite" }}
        />
        <div
          className="absolute top-40 right-[15%] w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"
          style={{ transform: `translateY(${scrollY * 0.15}px)`, animation: "float 8s ease-in-out infinite 1s" }}
        />
        <div
          className="absolute bottom-20 left-[20%] w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"
          style={{ transform: `translateY(${scrollY * 0.08}px)`, animation: "float 10s ease-in-out infinite 2s" }}
        />
      </div>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center px-6 py-20">
        <div className="max-w-6xl mx-auto text-center space-y-8 z-10">

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            <span className="text-sm font-medium text-primary">Welcome to the Future of College Life</span>
          </div>

          <h1
            className="text-5xl md:text-7xl lg:text-8xl font-bold leading-tight animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100"
            style={{
              background: "linear-gradient(to bottom right, hsl(var(--foreground)), hsl(var(--foreground)/0.7))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            The Future of
            <br />
            <span style={{ WebkitTextFillColor: "hsl(var(--primary))" }}>College Networking</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            Your all-in-one platform for college life. Connect with students, join communities,
            ace challenges, book facilities, and build your future — all in one place.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
            <Link
              to="/auth"
              className="group px-8 py-4 rounded-xl bg-primary text-primary-foreground font-bold text-lg transition-all hover:scale-105 hover:shadow-[0_0_40px_hsl(var(--primary)/0.5)] flex items-center gap-2"
            >
              Get Started Free
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/auth"
              className="px-8 py-4 rounded-xl border-2 border-border bg-background/50 backdrop-blur-sm font-semibold text-lg hover:bg-[hsl(var(--surface-1))] hover:border-primary/50 transition-all hover:scale-105"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl md:text-5xl font-bold">Everything You Need to Succeed</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">From networking to learning, we've got you covered</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard icon={<MessageSquare className="h-6 w-6" />} title="Real-time Chat" description="Channels, DMs, and servers for your college and interests" color="from-blue-500/20 to-cyan-500/20" delay={0} />
            <FeatureCard icon={<Users className="h-6 w-6" />} title="Network" description="Connect with students across colleges and build your network" color="from-purple-500/20 to-pink-500/20" delay={100} />
            <FeatureCard icon={<Trophy className="h-6 w-6" />} title="Gamification" description="Earn XP, badges, and climb leaderboards as you learn" color="from-yellow-500/20 to-orange-500/20" delay={200} />
            <FeatureCard icon={<Code className="h-6 w-6" />} title="Coding Challenges" description="Daily problems, contests, and a built-in code compiler" color="from-green-500/20 to-emerald-500/20" delay={300} />
            <FeatureCard icon={<BookOpen className="h-6 w-6" />} title="LMS" description="Courses, assignments, and learning materials in one place" color="from-indigo-500/20 to-blue-500/20" delay={400} />
            <FeatureCard icon={<Rocket className="h-6 w-6" />} title="Opportunities" description="Events, hackathons, internships, and freelancing gigs" color="from-red-500/20 to-pink-500/20" delay={500} />
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="relative py-20 px-6 bg-[hsl(var(--surface-1))]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl md:text-5xl font-bold">Built for Ambitious Students</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Join thousands of students building their future</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <BenefitCard icon={<Zap className="h-8 w-8" />} title="Lightning Fast" description="Real-time updates, instant messaging, and blazing-fast performance" />
            <BenefitCard icon={<Shield className="h-8 w-8" />} title="Secure & Private" description="Messages are end-to-end encrypted. Your data stays yours." />
            <BenefitCard icon={<Heart className="h-8 w-8" />} title="Always Free" description="Core features are free forever. No hidden costs, no surprises" />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-32 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-4xl md:text-6xl font-bold leading-tight">
            Ready to Level Up
            <br />
            <span className="text-primary">Your College Game?</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Start networking, learning, and growing today. Free forever for students.
          </p>
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 px-10 py-5 rounded-xl bg-primary text-primary-foreground font-bold text-xl hover:scale-105 transition-all hover:shadow-[0_0_40px_hsl(var(--primary)/0.5)]"
          >
            Get Started Free
            <ArrowRight className="h-6 w-6" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-border py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <Logo size="sm" showText />
          <div className="flex items-center gap-5 text-sm text-muted-foreground flex-wrap justify-center">
            <Link to="/auth" className="hover:text-foreground transition-colors">Sign In</Link>
            <Link to="/auth" className="hover:text-foreground transition-colors">Sign Up</Link>
            <a
              href="https://instagram.com/nxtcampus"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-foreground transition-colors"
            >
              <Instagram className="h-4 w-4" />
              @nxtcampus
            </a>
            <a
              href="https://x.com/nxt_campus"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-foreground transition-colors"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              @nxt_campus
            </a>
            <a
              href="mailto:nxtcampusofficial@gmail.com"
              className="flex items-center gap-1.5 hover:text-foreground transition-colors"
            >
              <Mail className="h-4 w-4" />
              nxtcampusofficial@gmail.com
            </a>
          </div>
          <div className="text-sm text-muted-foreground">© 2026 NXT Campus. All rights reserved.</div>
        </div>
      </footer>

      {/* Animations injected via global CSS instead of inline style tag */}
    </div>
  );
}

function FeatureCard({
  icon, title, description, color, delay,
}: {
  icon: React.ReactNode; title: string; description: string; color: string; delay: number;
}) {
  return (
    <div
      className={`group relative p-6 rounded-2xl border border-border bg-background/50 backdrop-blur-sm hover:border-primary/50 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_hsl(var(--primary)/0.2)] animate-in fade-in slide-in-from-bottom-4`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
      <div className="relative z-10">
        <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary grid place-items-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
          {icon}
        </div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function BenefitCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="text-center space-y-4 p-6 rounded-2xl hover:bg-background/50 transition-colors">
      <div className="inline-flex h-16 w-16 rounded-2xl bg-primary/10 text-primary items-center justify-center">
        {icon}
      </div>
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
