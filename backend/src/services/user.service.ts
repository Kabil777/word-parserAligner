import UserModel, { type User } from '../models/user.model.js';

class UserService {
  async createUser(userData: any): Promise<Omit<User, 'password'>> {
    const existingUser = await UserModel.findByEmail(userData.email);
    if (existingUser) {
      throw new Error('User already exists');
    }
    
    // Normally hash password here
    const newUser = await UserModel.create(userData);
    const { password, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  }

  async login(userData: any): Promise<Omit<User, 'password'>> {
    const user = await UserModel.findByEmail(userData.email);
    if (!user || user.password !== userData.password) {
      throw new Error('Invalid email or password');
    }
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async getUserById(userId: string): Promise<Omit<User, 'password'>> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async getAllUsers(): Promise<Omit<User, 'password'>[]> {
    return await UserModel.findAll();
  }

  async updateUser(userId: string, data: any): Promise<Omit<User, 'password'>> {
    const user = await UserModel.update(userId, data);
    if (!user) {
      throw new Error('User not found');
    }
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async deleteUser(userId: string): Promise<void> {
    const success = await UserModel.delete(userId);
    if (!success) {
      throw new Error('User not found');
    }
  }
}

export default UserService;
