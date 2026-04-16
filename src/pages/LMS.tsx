import { useState } from "react";
import { BookOpen, Clock, FileText, CheckCircle, Video } from "lucide-react";

export default function LMS() {
  const [activeTab, setActiveTab] = useState<"courses" | "assignments">("courses");

  return (
    <div className="flex-1 flex flex-col min-w-0 p-6 overflow-auto animate-in fade-in duration-500">
      <div className="max-w-4xl mx-auto w-full space-y-8">
        <header>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-primary/20 text-primary grid place-items-center glow-accent">
              <BookOpen className="h-5 w-5" />
            </div>
            <h1 className="text-3xl font-display font-bold glow-accent">Learning Management</h1>
          </div>
          <p className="text-muted-foreground">Access your courses, upcoming assignments, and lectures.</p>
        </header>

        <div className="flex gap-4 border-b border-border/50">
          <button
            onClick={() => setActiveTab("courses")}
            className={`pb-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === "courses" ? "border-primary text-primary glow-accent" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            My Courses
          </button>
          <button
            onClick={() => setActiveTab("assignments")}
            className={`pb-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === "assignments" ? "border-primary text-primary glow-accent" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Assignments
          </button>
        </div>

        {activeTab === "courses" ? (
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { id: "CSET244", name: "Design & Analysis of Algorithms", prof: "Dr. Vijayant Pawar", time: "Mon, Wed 10:00 AM", progress: 65, color: "bg-blue-500" },
              { id: "CSET210", name: "Design Thinking and Innovation", prof: "Dr. Urvashi Sugandh", time: "Tue, Thu 2:00 PM", progress: 72, color: "bg-purple-500" },
              { id: "CSET203", name: "Microprocessors and Computer Networks", prof: "Mr. Kishan Yumnam", time: "Mon, Fri 4:00 PM", progress: 55, color: "bg-green-500" },
              { id: "CSET209", name: "Operating System", prof: "Dr. Akhil Kumar", time: "Wed, Fri 9:00 AM", progress: 48, color: "bg-orange-500" }
            ].map(course => (
              <div key={course.id} className="panel p-5 group hover:border-primary/50 transition-all cursor-pointer">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-12 w-12 rounded-xl grid place-items-center text-white shadow-lg ${course.color}`}>
                      <span className="font-bold">{course.id.substring(0,2)}</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">{course.name}</h3>
                      <p className="text-xs text-muted-foreground">{course.id} • {course.prof}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground bg-surface-2 p-2 rounded-md">
                   <Clock className="h-3.5 w-3.5" />
                   {course.time}
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-xs mb-1 text-muted-foreground">
                    <span>Progress</span>
                    <span>{course.progress}%</span>
                  </div>
                  <div className="h-2 w-full bg-surface-3 rounded-full overflow-hidden">
                    <div className={`h-full ${course.color} transition-all duration-1000`} style={{ width: `${course.progress}%` }} />
                  </div>
                </div>
                <div className="mt-5 flex gap-2">
                   <button className="flex-1 h-8 rounded-md bg-surface-2 hover:bg-surface-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors">
                     <FileText className="h-3 w-3" /> Materials
                   </button>
                   <button className="flex-1 h-8 rounded-md bg-surface-2 hover:bg-surface-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors">
                     <Video className="h-3 w-3" /> Lecture
                   </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {[
              { title: "Project 1: Algorithm Analysis Report", course: "CSET244", due: "Tomorrow, 11:59 PM", status: "pending", type: "Project" },
              { title: "Design Thinking Case Study", course: "CSET210", due: "Apr 20, 11:59 PM", status: "pending", type: "Assignment" },
              { title: "MCN Lab Assignment 3", course: "CSET203", due: "Apr 22, 11:59 PM", status: "submitted", type: "Homework" },
              { title: "OS Concepts Quiz", course: "CSET209", due: "Apr 18, 9:00 AM", status: "graded", type: "Quiz", grade: "9.5/10" }
            ].map((task, i) => (
               <div key={i} className="panel-2 p-4 flex items-center justify-between hover:border-border transition-colors">
                 <div className="flex items-center gap-4">
                   <div className={`h-10 w-10 rounded-full grid place-items-center ${
                     task.status === "pending" ? "bg-orange-500/20 text-orange-500" :
                     task.status === "submitted" ? "bg-blue-500/20 text-blue-500" :
                     "bg-success/20 text-success"
                   }`}>
                     {task.status === "pending" ? <Clock className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
                   </div>
                   <div>
                     <h4 className="font-semibold text-sm">{task.title}</h4>
                     <p className="text-xs text-muted-foreground mt-0.5">{task.course} • {task.type}</p>
                   </div>
                 </div>
                 <div className="text-right">
                   {task.status === "graded" ? (
                     <div className="text-success font-bold text-lg">{task.grade}</div>
                   ) : (
                     <div className="text-xs font-medium bg-surface-3 px-2.5 py-1 rounded-md text-foreground">
                       Due: {task.due}
                     </div>
                   )}
                   {task.status === "pending" && (
                      <button className="mt-2 text-xs font-bold text-primary hover:underline">Submit Now &rarr;</button>
                   )}
                 </div>
               </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
