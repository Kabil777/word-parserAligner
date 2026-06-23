"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RegisterForm } from '../components/feature/RegisterForm';
import { LoginForm } from '../components/feature/LoginForm';

export function Dashboard() {
  const [view, setView] = useState<'login' | 'register'>('login');
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto mt-12">
      <div className="flex space-x-4 mb-8 bg-muted p-1 rounded-lg">
        <button 
          onClick={() => setView('login')}
          className={`px-6 py-2 rounded-md font-medium text-sm transition-colors ${view === 'login' ? 'bg-background text-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Login
        </button>
        <button 
          onClick={() => setView('register')}
          className={`px-6 py-2 rounded-md font-medium text-sm transition-colors ${view === 'register' ? 'bg-background text-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Register
        </button>
      </div>

      <div className="w-full">
        {view === 'login' ? (
          <LoginForm onSuccess={() => router.push('/workspace')} />
        ) : (
          <RegisterForm onSuccess={() => router.push('/workspace')} />
        )}
      </div>
    </div>
  );
}
