import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { 
  MessageCircle, 
  Send, 
  HelpCircle, 
  Book, 
  Mail,
  Bot,
  ChevronDown,
  ChevronUp,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";

type TicketCategory = 'technical' | 'account' | 'course' | 'payment' | 'other';
type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export default function Help() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("faq");
  
  // Support ticket form
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<TicketCategory>("technical");
  const [priority, setPriority] = useState<TicketPriority>("medium");

  // AI Chatbot state
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    { role: 'assistant', content: 'Hi! I\'m your AI assistant. How can I help you today?' }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // Fetch FAQ items
  const { data: faqItems } = useQuery({
    queryKey: ["faq"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("faq_items")
        .select("*")
        .order("category", { ascending: true })
        .order("position", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch user's tickets
  const { data: tickets } = useQuery({
    queryKey: ["support-tickets", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Create ticket mutation
  const createTicket = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("support_tickets").insert({
        user_id: user.id,
        subject,
        description,
        category,
        priority,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Support ticket created!");
      setSubject("");
      setDescription("");
      setCategory("technical");
      setPriority("medium");
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
    },
    onError: () => {
      toast.error("Failed to create ticket");
    },
  });

  // Group FAQ by category
  const faqByCategory = faqItems?.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof faqItems>);

  // Simple AI chatbot (mock - in production, connect to OpenAI/Claude API)
  const handleChatSubmit = async () => {
    if (!chatInput.trim()) return;
    
    const userMessage = chatInput.trim();
    setChatInput("");
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatLoading(true);

    // Simulate AI response (replace with actual API call)
    setTimeout(() => {
      const responses = [
        "I understand your question. Let me help you with that.",
        "Based on what you're asking, I'd recommend checking out the FAQ section for detailed information.",
        "That's a great question! You can find courses in the LMS section, and freelancing opportunities in the Opportunities page.",
        "For technical issues, I recommend creating a support ticket so our team can assist you directly.",
        "You can update your profile settings by clicking on your avatar in the top right corner.",
      ];
      const response = responses[Math.floor(Math.random() * responses.length)];
      setChatMessages(prev => [...prev, { role: 'assistant', content: response }]);
      setChatLoading(false);
    }, 1000);
  };

  return (
    <div className="container max-w-6xl py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Help & Support</h1>
        <p className="text-muted-foreground">
          Get answers to your questions or reach out to our support team
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="faq" className="gap-2">
            <Book className="h-4 w-4" />
            <span className="hidden sm:inline">FAQ</span>
          </TabsTrigger>
          <TabsTrigger value="ai-chat" className="gap-2">
            <Bot className="h-4 w-4" />
            <span className="hidden sm:inline">AI Assistant</span>
          </TabsTrigger>
          <TabsTrigger value="support" className="gap-2">
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">Support Ticket</span>
          </TabsTrigger>
        </TabsList>

        {/* FAQ Tab */}
        <TabsContent value="faq" className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <HelpCircle className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Frequently Asked Questions</h2>
            </div>
            
            {faqByCategory && Object.entries(faqByCategory).map(([cat, items]) => (
              <div key={cat} className="mb-6">
                <h3 className="text-lg font-medium mb-3 capitalize">
                  {cat.replace('-', ' ')}
                </h3>
                <Accordion type="single" collapsible className="space-y-2">
                  {items.map((item) => (
                    <AccordionItem key={item.id} value={item.id} className="border rounded-lg px-4">
                      <AccordionTrigger className="text-left hover:no-underline">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}
          </Card>
        </TabsContent>

        {/* AI Chat Tab */}
        <TabsContent value="ai-chat" className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">AI Assistant</h2>
              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">Beta</span>
            </div>
            
            <div className="space-y-4">
              {/* Chat messages */}
              <div className="h-[400px] overflow-y-auto space-y-4 p-4 bg-muted/30 rounded-lg">
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background border'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary animate-pulse" />
                    </div>
                    <div className="bg-background border rounded-lg px-4 py-2">
                      <div className="flex gap-1">
                        <div className="h-2 w-2 bg-muted-foreground/50 rounded-full animate-bounce" />
                        <div className="h-2 w-2 bg-muted-foreground/50 rounded-full animate-bounce delay-100" />
                        <div className="h-2 w-2 bg-muted-foreground/50 rounded-full animate-bounce delay-200" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat input */}
              <div className="flex gap-2">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleChatSubmit()}
                  placeholder="Ask me anything..."
                  className="flex-1"
                />
                <Button onClick={handleChatSubmit} disabled={chatLoading || !chatInput.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              
              <p className="text-xs text-muted-foreground">
                💡 Try asking about courses, freelancing, or how to use features
              </p>
            </div>
          </Card>
        </TabsContent>

        {/* Support Ticket Tab */}
        <TabsContent value="support" className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <MessageCircle className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Create Support Ticket</h2>
            </div>
            
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createTicket.mutate();
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-sm font-medium mb-2 block">Subject</label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief description of your issue"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Category</label>
                  <Select value={category} onValueChange={(v) => setCategory(v as TicketCategory)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technical">Technical</SelectItem>
                      <SelectItem value="account">Account</SelectItem>
                      <SelectItem value="course">Course</SelectItem>
                      <SelectItem value="payment">Payment</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Priority</label>
                  <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Description</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide detailed information about your issue..."
                  rows={6}
                  required
                />
              </div>

              <Button type="submit" disabled={createTicket.isPending} className="w-full sm:w-auto">
                {createTicket.isPending ? "Creating..." : "Submit Ticket"}
              </Button>
            </form>
          </Card>

          {/* User's tickets */}
          {tickets && tickets.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Your Tickets</h3>
              <div className="space-y-3">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{ticket.subject}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {new Date(ticket.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded-full shrink-0 ${
                          ticket.status === 'open'
                            ? 'bg-blue-500/10 text-blue-500'
                            : ticket.status === 'in_progress'
                            ? 'bg-yellow-500/10 text-yellow-500'
                            : ticket.status === 'resolved'
                            ? 'bg-green-500/10 text-green-500'
                            : 'bg-gray-500/10 text-gray-500'
                        }`}
                      >
                        {ticket.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
