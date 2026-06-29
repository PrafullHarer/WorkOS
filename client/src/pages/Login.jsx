import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import { Flame, Mail, Lock, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

const Login = () => {
  const { user, login } = useAuthContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-transparent">
      <div className="card p-8 w-full max-w-md relative animate-scale-in">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 bg-black dark:bg-white flex items-center justify-center border-2 border-black dark:border-white">
            <Flame className="w-7 h-7 text-white dark:text-black" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-black dark:text-white">TaskMaste</h1>
            <p className="text-xs text-black/50 dark:text-white/50">Smart Task Management</p>
          </div>
        </div>
        <h2 className="text-xl font-bold text-center mb-6">Welcome Back</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-black/60 dark:text-white/60" />
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" className="input-field pl-11" required id="login-email" />
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-black/60 dark:text-white/60" />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="input-field pl-11" required id="login-password" />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 cursor-pointer" id="login-btn">
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-none animate-spin" /> : <>Sign In <ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>
        <p className="text-center mt-6 text-sm text-black/60 dark:text-white/60">
          Don't have an account? <Link to="/register" className="text-black dark:text-white hover:underline font-bold">Sign up</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
