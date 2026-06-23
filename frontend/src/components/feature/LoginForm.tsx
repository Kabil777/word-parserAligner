"use client"

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '../../schemas/user.schema';
import { userService } from '../../services/api/userService';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useState } from 'react';

const formSchema = loginSchema.shape.body;

export function LoginForm({ onSuccess }: { onSuccess?: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(formSchema)
  });

  const onSubmit = async (data: any) => {
    setLoading(true);
    setError(null);
    try {
      await userService.loginUser(data);
      reset();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-card border border-border p-8 rounded-2xl shadow-xl shadow-primary/5">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-foreground tracking-tight">Welcome Back</h2>
        <p className="text-muted-foreground text-sm mt-1">Enter your credentials to login.</p>
      </div>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Email</label>
          <Input 
            type="email" 
            {...register('email')} 
            placeholder="m@example.com" 
            className={errors.email ? 'border-destructive focus-visible:ring-destructive' : ''} 
          />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message as string}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Password</label>
          <Input 
            type="password" 
            {...register('password')} 
            placeholder="••••••••" 
            className={errors.password ? 'border-destructive focus-visible:ring-destructive' : ''} 
          />
          {errors.password && <p className="text-xs text-destructive">{errors.password.message as string}</p>}
        </div>

        <Button type="submit" className="w-full mt-6" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </Button>
      </form>
    </div>
  );
}
