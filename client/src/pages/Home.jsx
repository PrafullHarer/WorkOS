import { Link } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import { Flame, Calendar, CheckSquare, Zap, Shield, ArrowRight, LogIn } from 'lucide-react';

const Home = () => {
  const { user } = useAuthContext();

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-black text-black dark:text-white transition-colors duration-150">
      {/* Navigation Header */}
      <header className="border-b-2 border-black dark:border-white p-5 sticky top-0 bg-white/90 dark:bg-black/90 backdrop-blur-sm z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-black dark:bg-white flex items-center justify-center border-2 border-black dark:border-white">
              <Flame className="w-6 h-6 text-white dark:text-black" />
            </div>
            <span className="text-xl font-black uppercase tracking-wider">
              TaskMaste
            </span>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <Link to="/dashboard" className="btn-primary py-2.5 px-5 text-sm flex items-center gap-2">
                Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn-secondary py-2.5 px-5 text-sm flex items-center gap-1.5">
                  <LogIn className="w-4 h-4" /> Login
                </Link>
                <Link to="/register" className="btn-primary py-2.5 px-5 text-sm hidden sm:flex items-center gap-1.5">
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 lg:p-10 flex flex-col justify-center space-y-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-8">
          <div className="lg:col-span-8 space-y-6">
            <div className="inline-flex items-center gap-2 border-2 border-black dark:border-white px-3 py-1 bg-yellow-100 dark:bg-yellow-950 font-black uppercase text-xs tracking-wider">
              <Zap className="w-3.5 h-3.5 text-black dark:text-white" /> Zero Fluff. Max Productivity.
            </div>
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black uppercase leading-tight tracking-tighter">
              Master Your Tasks.<br />
              <span className="bg-yellow-100 dark:bg-yellow-950 border-2 border-black dark:border-white px-2 py-0.5 inline-block my-1.5 rotate-[-1deg]">
                Crush Your Streaks.
              </span>
            </h1>
            <p className="text-xl lg:text-2xl text-black/70 dark:text-white/70 max-w-2xl font-bold leading-relaxed">
              TaskMaste is a raw, high-performance task management ecosystem built to give you absolute control over your daily workflows, habit loops, and calendars.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Link to={user ? "/dashboard" : "/register"} className="btn-primary text-center flex items-center justify-center gap-2 text-lg py-4 px-8">
                {user ? "Go to Dashboard" : "Get Started Free"} <ArrowRight className="w-5 h-5" />
              </Link>
              {!user && (
                <Link to="/login" className="btn-secondary text-center flex items-center justify-center gap-2 text-lg py-4 px-8">
                  Sign In to Account
                </Link>
              )}
            </div>
          </div>

          {/* Interactive Feature Mockup */}
          <div className="lg:col-span-4 card-elevated p-8 space-y-5 bg-yellow-50 dark:bg-neutral-900 border-2 border-black dark:border-white rotate-[1.5deg]">
            <div className="flex items-center justify-between border-b-2 border-black dark:border-white pb-3">
              <span className="font-mono font-black text-sm uppercase tracking-widest text-black/60 dark:text-white/60">⚡ Activity Summary</span>
              <Flame className="w-5 h-5 text-black dark:text-white animate-pulse" />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border-2 border-black dark:border-white bg-white dark:bg-black">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-black dark:text-white" />
                  <span className="text-sm font-black truncate">Hydrate (8 times)</span>
                </div>
                <span className="streak-badge flex-shrink-0"><Flame className="w-3 h-3" /> 14</span>
              </div>
              <div className="flex items-center justify-between p-3 border-2 border-black dark:border-white bg-white dark:bg-black opacity-80">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-black dark:text-white" />
                  <span className="text-sm font-black truncate">Weight Training</span>
                </div>
                <span className="text-xs font-mono font-black border border-black dark:border-white px-2 py-0.5 bg-neutral-200 dark:bg-neutral-800">DONE</span>
              </div>
            </div>
            <div className="pt-2">
              <div className="w-full bg-neutral-200 dark:bg-neutral-800 border-2 border-black dark:border-white h-5">
                <div className="bg-black dark:bg-white h-full w-[75%]" />
              </div>
              <div className="flex justify-between text-xs font-mono font-black text-black/60 dark:text-white/60 mt-1.5 uppercase">
                <span>Daily Progress</span>
                <span>75% Complete</span>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="pt-8">
          <h2 className="text-2xl lg:text-4xl font-black uppercase tracking-tight mb-8">
            Engineered for High-Performance Habits
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card-elevated p-6 space-y-4">
              <div className="w-12 h-12 bg-black dark:bg-white flex items-center justify-center border-2 border-black dark:border-white">
                <CheckSquare className="w-6 h-6 text-white dark:text-black" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight">One-time & Repeating Tasks</h3>
              <p className="text-sm text-black/70 dark:text-white/70 leading-relaxed font-bold">
                Create standard checklists or complex recurring behaviors with daily virtual occurrence trackers.
              </p>
            </div>

            <div className="card-elevated p-6 space-y-4">
              <div className="w-12 h-12 bg-black dark:bg-white flex items-center justify-center border-2 border-black dark:border-white">
                <Flame className="w-6 h-6 text-white dark:text-black" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight">Flame Streaks</h3>
              <p className="text-sm text-black/70 dark:text-white/70 leading-relaxed font-bold">
                Keep the pressure on. Gamify consistency by tracking streak points and avoiding broken chains.
              </p>
            </div>

            <div className="card-elevated p-6 space-y-4">
              <div className="w-12 h-12 bg-black dark:bg-white flex items-center justify-center border-2 border-black dark:border-white">
                <Calendar className="w-6 h-6 text-white dark:text-black" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight">Interactive Calendar</h3>
              <p className="text-sm text-black/70 dark:text-white/70 leading-relaxed font-bold">
                Map schedules easily with responsive grid calendars supporting one-click task scheduling.
              </p>
            </div>

            <div className="card-elevated p-6 space-y-4">
              <div className="w-12 h-12 bg-black dark:bg-white flex items-center justify-center border-2 border-black dark:border-white">
                <Shield className="w-6 h-6 text-white dark:text-black" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight">Data Sovereignty</h3>
              <p className="text-sm text-black/70 dark:text-white/70 leading-relaxed font-bold">
                Complete data autonomy. Back up, clear, or export all task schedules to JSON/CSV in seconds.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-black dark:border-white p-6 bg-white dark:bg-black">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm font-mono text-black/60 dark:text-white/60">
            TaskMaste &copy; {new Date().getFullYear()}. Built for builders.
          </p>
          <div className="flex gap-4">
            <a href="https://github.com" target="_blank" rel="noreferrer" className="text-sm hover:underline font-bold">GitHub</a>
            <a href="/login" className="text-sm hover:underline font-bold">Sign In</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
