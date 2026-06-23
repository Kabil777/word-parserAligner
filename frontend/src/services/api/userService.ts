import axiosInstance from '../../lib/axiosInstance';

export const userService = {
  createUser: async (userData: any) => {
    const response = await axiosInstance.post('/users', userData);
    return response.data;
  },
  loginUser: async (credentials: any) => {
    const response = await axiosInstance.post('/users/login', credentials);
    return response.data;
  },
  getUser: async (id: string) => {
    const response = await axiosInstance.get(`/users/${id}`);
    return response.data;
  },
  getAllUsers: async () => {
    const response = await axiosInstance.get('/users');
    return response.data;
  },
  updateUser: async (id: string, userData: any) => {
    const response = await axiosInstance.put(`/users/${id}`, userData);
    return response.data;
  },
  deleteUser: async (id: string) => {
    const response = await axiosInstance.delete(`/users/${id}`);
    return response.data;
  }
};
