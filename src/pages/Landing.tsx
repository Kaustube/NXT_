import { Link } from "react-router-dom";
import { 
  Sparkles, ArrowRight, Zap, Shield, Users, MessageSquare, 
  Trophy, Code, BookOpen, Rocket, Star, Globe, Heart
} from "lucide-react";
import { useState, useEffect } from "react";

export default function Landing() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    const handleScroll = () => setScrollY(window.scrollY);
    
    window.addEventListener("mousemove", handleMouse);
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("mousemove", handleMouse);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const parallaxStyle = (speed: number) => ({
    transform: `translateY(${scrollY * speed}px)`,
  });

  const tiltStyle = (intensity: number) => ({
    transform: `perspective(1000px) rotateX(${(mousePos.y - window.innerHeight / 2) * intensity}deg) rotateY(${(mousePos.x - window.innerWidth / 2) * intensity}deg)`,
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-[hsl(var(--surface-1))] overflow-hidden">
      
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,hsl(var(--primary)/0.1),transparent_40%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,hsl(var(--primary)/0.08),transparent_40%)]" />
        
        {/* Floating orbs */}
        <div 
          className="absolute top-20 left-[10%] w-64 h-64 bg-primary/20 rounded-full blur-3xl animate-float"
          style={parallaxStyle(0.1)}
        />
        <div 
          className="absolute top-40 right-[15%] w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-float-delayed"
          style={parallaxStyle(0.15)}
        />
        <div 
          className="absolute bottom-20 left-[20%] w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-float-slow"
          style={parallaxStyle(0.08)}
        />
      </div>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-6 py-20">
        <div className="max-w-6xl mx-auto text-center space-y-8 z-10">
          
          {/* Badge */}
          <div 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-700"
            style={tiltStyle(0.002)}
          >
            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            <span className="text-sm font-medium text-primary">Welcome to the Future of College Life</span>
          </div>

          {/* Main heading with 3D effect */}
          <h1 
            className="text-5xl md:text-7xl lg:text-8xl font-bold leading-tight animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100"
            style={{
              ...tiltStyle(0.005),
              background: 'linear-gradient(to bottom right, hsl(var(--foreground)), hsl(var(--foreground)/0.7))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 0 80px hsl(var(--primary)/0.3)',
            }}
          >
            The Future of
            <br />
            <span className="text-primary">College Networking</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            Your all-in-one platform for college life. Connect with students, join communities, 
            ace challenges, book facilities, and build your future — all in one place.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
            <Link
              to="/auth"
              className="group relative px-8 py-4 rounded-xl bg-primary text-primary-foreground font-bold text-lg overflow-hidden transition-all hover:scale-105 hover:shadow-[0_0_40px_hsl(var(--primary)/0.5)]"
              style={tiltStyle(0.01)}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/80 to-primary animate-shimmer" />
              <span className="relative flex items-center gap-2">
                Get Started Free
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
            
            <Link
              to="/auth"
              className="px-8 py-4 rounded-xl border-2 border-border bg-background/50 backdrop-blur-sm font-semibold text-lg hover:bg-[hsl(var(--surface-1))] hover:border-primary/50 transition-all hover:scale-105"
              style={tiltStyle(0.01)}
            >
              Sign In
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto pt-12 animate-in fade-in duration-700 delay-500">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary">10K+</div>
              <div className="text-sm text-muted-foreground mt-1">Students</div>
            </div>
            <div className="text-center border-x border-border">
              <div className="text-3xl md:text-4xl font-bold text-primary">100+</div>
              <div className="text-sm text-muted-foreground mt-1">Colleges</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary">50K+</div>
              <div className="text-sm text-muted-foreground mt-1">Connections</div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-primary/30 flex items-start justify-center p-2">
            <div className="w-1 h-2 bg-primary rounded-full animate-pulse" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-20 px-6">
        <div className="max-w-6xl mx-auto">
          
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl md:text-5xl font-bold">
              Everything You Need to Succeed
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From networking to learning, we've got you covered
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<MessageSquare className="h-6 w-6" />}
              title="Real-time Chat"
              description="Channels, DMs, and servers for your college and interests"
              color="from-blue-500/20 to-cyan-500/20"
              delay={0}
            />
            <FeatureCard
              icon={<Users className="h-6 w-6" />}
              title="Network"
              description="Connect with students across colleges and build your network"
              color="from-purple-500/20 to-pink-500/20"
              delay={100}
            />
            <FeatureCard
              icon={<Trophy className="h-6 w-6" />}
              title="Gamification"
              description="Earn XP, badges, and climb leaderboards as you learn"
              color="from-yellow-500/20 to-orange-500/20"
              delay={200}
            />
            <FeatureCard
              icon={<Code className="h-6 w-6" />}
              title="Coding Challenges"
              description="Daily problems, contests, and a built-in code compiler"
              color="from-green-500/20 to-emerald-500/20"
              delay={300}
            />
            <FeatureCard
              icon={<BookOpen className="h-6 w-6" />}
              title="LMS"
              description="Courses, assignments, and learning materials in one place"
              color="from-indigo-500/20 to-blue-500/20"
              delay={400}
            />
            <FeatureCard
              icon={<Rocket className="h-6 w-6" />}
              title="Opportunities"
              description="Events, hackathons, internships, and freelancing gigs"
              color="from-red-500/20 to-pink-500/20"
              delay={500}
            />
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="relative py-20 px-6 bg-[hsl(var(--surface-1))]">
        <div className="max-w-6xl mx-auto">
          
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl md:text-5xl font-bold">
              Built for Ambitious Students
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Join thousands of students building their future
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <BenefitCard
              icon={<Zap className="h-8 w-8" />}
              title="Lightning Fast"
              description="Real-time updates, instant messaging, and blazing-fast performance"
            />
            <BenefitCard
              icon={<Shield className="h-8 w-8" />}
              title="Secure & Private"
              description="Your data is encrypted and protected with enterprise-grade security"
            />
            <BenefitCard
              icon={<Heart className="h-8 w-8" />}
              title="Always Free"
              description="Core features are free forever. No hidden costs, no surprises"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-32 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          
          <div 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm"
          >
            <Star className="h-4 w-4 text-primary animate-pulse" />
            <span className="text-sm font-medium text-primary">Join 10,000+ Students Today</span>
          </div>

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
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground grid place-items-center font-bold">
                N
              </div>
              <span className="font-semibold">NXT Campus</span>
            </div>
            
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link to="/auth" className="hover:text-foreground transition-colors">Sign In</Link>
              <Link to="/auth" className="hover:text-foreground transition-colors">Sign Up</Link>
              <a href="#" className="hover:text-foreground transition-colors">About</a>
              <a href="#" className="hover:text-foreground transition-colors">Contact</a>
            </div>
            
            <div className="text-sm text-muted-foreground">
              © 2026 NXT Campus. All rights reserved.
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-30px); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float-delayed 8s ease-in-out infinite;
        }
        .animate-float-slow {
          animation: float-slow 10s ease-in-out infinite;
        }
        .animate-shimmer::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          animation: shimmer 3s infinite;
        }
      `}</style>
    </div>
  );
}

function FeatureCard({ 
  icon, 
  title, 
  description, 
  color, 
  delay 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string; 
  color: string;
  delay: number;
}) {
  return (
    <div 
      className="group relative p-6 rounded-2xl border border-border bg-background/50 backdrop-blur-sm hover:border-primary/50 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_hsl(var(--primary)/0.2)] animate-in fade-in slide-in-from-bottom-4"
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

function BenefitCard({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string; 
}) {
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
