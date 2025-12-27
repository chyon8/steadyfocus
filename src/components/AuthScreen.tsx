import { useState } from 'react';
import { motion } from 'motion/react';
import { Circle, Loader2 } from 'lucide-react';

interface AuthScreenProps {
  onAuth: (email: string, password: string, name?: string, isSignup?: boolean) => Promise<void>;
  darkMode: boolean;
}

export function AuthScreen({ onAuth, darkMode }: AuthScreenProps) {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await onAuth(email, password, name, isSignup);
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center transition-colors duration-700 ${
      darkMode ? 'bg-black' : 'bg-white'
    }`}>
      {/* Grain Texture */}
      <div className="fixed inset-0 opacity-[0.02] pointer-events-none mix-blend-overlay" 
        style={{ 
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'4\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")',
        }} 
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md px-8"
      >
        {/* Logo */}
        <div className="flex justify-center mb-12">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            darkMode ? 'bg-white' : 'bg-black'
          }`}>
            <Circle className={`w-5 h-5 ${
              darkMode ? 'text-black' : 'text-white'
            } fill-current`} />
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-12">
          <h1 className={`text-3xl mb-3 ${
            darkMode ? 'text-white' : 'text-black'
          }`}>
            {isSignup ? 'Create Account' : 'Welcome Back'}
          </h1>
          <p className={`text-sm ${
            darkMode ? 'text-white/40' : 'text-black/40'
          }`}>
            {isSignup ? 'Start your focused journey' : 'Continue your focused journey'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {isSignup && (
            <div>
              <label className={`block text-xs uppercase tracking-[0.15em] mb-3 ${
                darkMode ? 'text-white/40' : 'text-black/40'
              }`}>
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={isSignup}
                className={`w-full px-6 py-4 rounded-xl border transition-colors ${
                  darkMode
                    ? 'bg-white/[0.03] border-white/[0.06] text-white placeholder-white/20 focus:border-white/20'
                    : 'bg-black/[0.02] border-black/[0.06] text-black placeholder-black/20 focus:border-black/20'
                } outline-none`}
                placeholder="Your name"
              />
            </div>
          )}

          <div>
            <label className={`block text-xs uppercase tracking-[0.15em] mb-3 ${
              darkMode ? 'text-white/40' : 'text-black/40'
            }`}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={`w-full px-6 py-4 rounded-xl border transition-colors ${
                darkMode
                  ? 'bg-white/[0.03] border-white/[0.06] text-white placeholder-white/20 focus:border-white/20'
                  : 'bg-black/[0.02] border-black/[0.06] text-black placeholder-black/20 focus:border-black/20'
              } outline-none`}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className={`block text-xs uppercase tracking-[0.15em] mb-3 ${
              darkMode ? 'text-white/40' : 'text-black/40'
            }`}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className={`w-full px-6 py-4 rounded-xl border transition-colors ${
                darkMode
                  ? 'bg-white/[0.03] border-white/[0.06] text-white placeholder-white/20 focus:border-white/20'
                  : 'bg-black/[0.02] border-black/[0.06] text-black placeholder-black/20 focus:border-black/20'
              } outline-none`}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-xl text-sm ${
                darkMode
                  ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                  : 'bg-red-500/10 text-red-600 border border-red-500/20'
              }`}
            >
              {error}
            </motion.div>
          )}

          <motion.button
            type="submit"
            disabled={loading}
            className={`w-full py-4 rounded-xl transition-all ${
              darkMode
                ? 'bg-white text-black hover:bg-white/90'
                : 'bg-black text-white hover:bg-black/90'
            } disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
            whileHover={!loading ? { scale: 1.02 } : {}}
            whileTap={!loading ? { scale: 0.98 } : {}}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm uppercase tracking-[0.15em]">
                  {isSignup ? 'Creating Account...' : 'Signing In...'}
                </span>
              </>
            ) : (
              <span className="text-sm uppercase tracking-[0.15em]">
                {isSignup ? 'Create Account' : 'Sign In'}
              </span>
            )}
          </motion.button>
        </form>

        {/* Toggle */}
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignup(!isSignup);
              setError('');
            }}
            className={`text-sm ${
              darkMode ? 'text-white/40 hover:text-white/60' : 'text-black/40 hover:text-black/60'
            } transition-colors`}
          >
            {isSignup ? 'Already have an account? ' : "Don't have an account? "}
            <span className={darkMode ? 'text-white' : 'text-black'}>
              {isSignup ? 'Sign In' : 'Sign Up'}
            </span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
