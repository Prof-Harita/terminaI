import { useAuth } from '../hooks/useAuth';
import { useEffect } from 'react';

interface Props {
  onAuthenticated: () => void;
}

export function AuthScreen({ onAuthenticated }: Props) {
  const { isAuthenticated, isLoading, error, signIn } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      onAuthenticated();
    }
  }, [isAuthenticated, onAuthenticated]);

  return (
    <div className="flex flex-col items-center justify-center h-full bg-[var(--bg-primary)]">
      <h1 className="text-4xl font-bold mb-2 text-white">⚡ TermAI</h1>
      <p className="text-gray-400 mb-8">Your AI-powered terminal assistant</p>

      <button
        className="flex items-center gap-3 bg-white text-gray-800 px-6 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors disabled:opacity-50"
        onClick={signIn}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <span className="animate-spin">⏳</span>
            Signing in...
          </>
        ) : (
          <>
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign in with Google
          </>
        )}
      </button>

      {error && (
        <p className="mt-4 text-red-400 text-sm">{error}</p>
      )}

      <div className="mt-8 text-gray-500 text-sm flex gap-4">
        <button className="hover:text-gray-300 transition-colors">
          Use API Key instead
        </button>
        <span>•</span>
        <button className="hover:text-gray-300 transition-colors">
          Use Ollama (Local)
        </button>
      </div>
    </div>
  );
}
