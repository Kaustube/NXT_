import { useState, useEffect } from "react";
import { 
  Dumbbell, Droplets, Apple, Moon, Brain, 
  Plus, Check, Trash2, Heart, Zap
} from "lucide-react";
import { toast } from "sonner";

type Habit = {
  id: string;
  type: 'gym' | 'water' | 'diet' | 'sleep' | 'meditation' | 'custom';
  label: string;
  goal: string;
  completed: boolean;
};

const HABIT_CONFIG = {
  gym: { icon: Dumbbell, color: "text-blue-400 bg-blue-400/10", label: "Gym Session" },
  water: { icon: Droplets, color: "text-cyan-400 bg-cyan-400/10", label: "8 Glasses Water" },
  diet: { icon: Apple, color: "text-emerald-400 bg-emerald-400/10", label: "Clean Eating" },
  sleep: { icon: Moon, color: "text-purple-400 bg-purple-400/10", label: "7+ Hours Sleep" },
  meditation: { icon: Brain, color: "text-pink-400 bg-pink-400/10", label: "10m Meditation" },
  custom: { icon: Zap, color: "text-yellow-400 bg-yellow-400/10", label: "Custom Goal" }
};

export default function WellnessTracker() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isAdding, setIsAdding] = useState(false);

  // Load from local storage for instant persistence
  useEffect(() => {
    const saved = localStorage.getItem("nxt-wellness-habits");
    if (saved) {
      try {
        setHabits(JSON.parse(saved));
      } catch (e) {
        setHabits([]);
      }
    } else {
      // Default set
      setHabits([
        { id: '1', type: 'gym', label: 'Gym Session', goal: '1h', completed: false },
        { id: '2', type: 'water', label: 'Water Intake', goal: '8 Glasses', completed: true },
      ]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("nxt-wellness-habits", JSON.stringify(habits));
  }, [habits]);

  const addHabit = (type: keyof typeof HABIT_CONFIG) => {
    const newHabit: Habit = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      label: HABIT_CONFIG[type].label,
      goal: "",
      completed: false
    };
    setHabits([...habits, newHabit]);
    setIsAdding(false);
    toast.success(`${HABIT_CONFIG[type].label} added to tracker!`);
  };

  const toggleHabit = (id: string) => {
    setHabits(habits.map(h => h.id === id ? { ...h, completed: !h.completed } : h));
  };

  const deleteHabit = (id: string) => {
    setHabits(habits.filter(h => h.id !== id));
  };

  const completedCount = habits.filter(h => h.completed).length;
  const progress = habits.length > 0 ? (completedCount / habits.length) * 100 : 0;

  return (
    <div className="panel p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="h-4 w-4 text-pink-500 fill-pink-500/20" />
          <h2 className="text-sm font-black uppercase tracking-widest">Wellness Tracker</h2>
        </div>
        <div className="text-[10px] font-bold text-muted-foreground bg-[hsl(var(--surface-3))] px-2 py-1 rounded-full">
          {completedCount}/{habits.length} DONE
        </div>
      </div>

      {/* Progress Ring / Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px] font-black uppercase text-muted-foreground">
          <span>Daily Health Score</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 w-full bg-[hsl(var(--surface-3))] rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-pink-500 to-primary transition-all duration-700" 
            style={{ width: `${progress}%` }} 
          />
        </div>
      </div>

      <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
        {habits.map((habit) => {
          const Config = HABIT_CONFIG[habit.type];
          return (
            <div 
              key={habit.id} 
              className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                habit.completed 
                ? "bg-primary/5 border-primary/20 opacity-80" 
                : "bg-[hsl(var(--surface-2))] border-transparent hover:border-border"
              }`}
            >
              <div className={`h-8 w-8 rounded-lg ${Config.color} grid place-items-center shrink-0`}>
                <Config.icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-xs font-bold truncate ${habit.completed ? "line-through text-muted-foreground" : ""}`}>
                  {habit.label}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => toggleHabit(habit.id)}
                  className={`h-7 w-7 rounded-lg grid place-items-center transition-all ${
                    habit.completed 
                    ? "bg-primary text-white" 
                    : "bg-[hsl(var(--surface-3))] text-muted-foreground hover:text-primary"
                  }`}
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button 
                  onClick={() => deleteHabit(habit.id)}
                  className="h-7 w-7 rounded-lg grid place-items-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}

        {habits.length === 0 && (
          <div className="text-center py-6">
            <p className="text-xs text-muted-foreground">No wellness goals set.</p>
          </div>
        )}
      </div>

      {isAdding ? (
        <div className="grid grid-cols-3 gap-2 animate-in slide-in-from-bottom-2 duration-200">
          {(Object.keys(HABIT_CONFIG) as Array<keyof typeof HABIT_CONFIG>).map((type) => {
            const C = HABIT_CONFIG[type];
            return (
              <button 
                key={type}
                onClick={() => addHabit(type)}
                className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-[hsl(var(--surface-2))] border border-border hover:border-primary/50 transition-all"
              >
                <C.icon className="h-3.5 w-3.5" />
                <span className="text-[9px] font-bold uppercase truncate w-full text-center">{type}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <button 
          onClick={() => setIsAdding(true)}
          className="w-full h-9 rounded-xl border border-dashed border-border text-muted-foreground hover:text-primary hover:border-primary/50 hover:bg-primary/5 text-xs font-bold transition-all flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Habit
        </button>
      )}
    </div>
  );
}
