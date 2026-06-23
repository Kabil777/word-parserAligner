"use client"

import { useEffect, useState } from 'react';
import { userService } from '../../services/api/userService';
import { Button } from '../ui/Button';
import { User, Trash2 } from 'lucide-react';

export function UserList({ refreshTrigger }: { refreshTrigger: number }) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await userService.getAllUsers();
      setUsers(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [refreshTrigger]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await userService.deleteUser(id);
      setUsers(users.filter(u => u.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete');
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading users...</div>;
  if (error) return <div className="p-8 text-center text-destructive">{error}</div>;

  return (
    <div className="bg-card border border-border rounded-2xl shadow-xl shadow-primary/5 overflow-hidden">
      <div className="p-6 border-b border-border bg-muted/20">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          Registered Users
        </h2>
      </div>
      <div className="p-0">
        {users.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No users found. Create one!</div>
        ) : (
          <ul className="divide-y divide-border">
            {users.map(user => (
              <li key={user.id} className="p-6 hover:bg-muted/10 transition-colors flex items-center justify-between group">
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">{user.name}</span>
                  <span className="text-sm text-muted-foreground">{user.email}</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => handleDelete(user.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
