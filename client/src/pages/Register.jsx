import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import { Flame, Mail, Lock, User, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

const Register = () => {
  const { user, register } = useAuthContext();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(name, email, password);
      toast.success('Account created!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
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
        <h2 className="text-xl font-bold text-center mb-6">Create Account</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-black/60 dark:text-white/60" />
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Full name" className="input-field pl-11" required id="register-name" />
          </div>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-black/60 dark:text-white/60" />
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" className="input-field pl-11" required id="register-email" />
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-black/60 dark:text-white/60" />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password (min 6 chars)" className="input-field pl-11" required minLength={6} id="register-password" />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 cursor-pointer" id="register-btn">
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-none animate-spin" /> : <>Create Account <ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>
        <p className="text-center mt-6 text-sm text-black/60 dark:text-white/60">
          Already have an account? <Link to="/login" className="text-black dark:text-white hover:underline font-bold">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
