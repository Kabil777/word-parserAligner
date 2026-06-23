import { v4 as uuidv4 } from 'uuid';

export interface User {
  id: string;
  email: string;
  password?: string; // Storing password for demo purposes (should be hashed)
  name: string;
  bio?: string;
  createdAt: Date;
  updatedAt: Date;
}

// In-memory array acting as our database table
let users: User[] = [
  {
    id: uuidv4(),
    email: 'admin@aligner.app',
    name: 'Admin User',
    bio: 'System Administrator',
    createdAt: new Date(),
    updatedAt: new Date(),
  }
];

class UserModel {
  async findByEmail(email: string): Promise<User | undefined> {
    return users.find((user) => user.email === email);
  }

  async findById(id: string): Promise<User | undefined> {
    return users.find((user) => user.id === id);
  }

  async findAll(): Promise<Omit<User, 'password'>[]> {
    return users.map(({ password, ...user }) => user);
  }

  async create(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const newUser: User = {
      ...data,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    users.push(newUser);
    return newUser;
  }

  async update(id: string, data: Partial<User>): Promise<User | undefined> {
    const index = users.findIndex((user) => user.id === id);
    if (index === -1) return undefined;
    
    Object.assign(users[index]!, data, { updatedAt: new Date() });
    return users[index];
  }

  async delete(id: string): Promise<boolean> {
    const initialLength = users.length;
    users = users.filter((user) => user.id !== id);
    return users.length !== initialLength;
  }
}

export default new UserModel();
