import { apiClient } from './client';

export interface IUserDetail {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: string;
  roleValue: number;
  isActive: boolean;
  phoneNumber?: string;
  department?: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface CreateUserPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: string;
}

export const getAllUsers = async (): Promise<IUserDetail[]> => {
  const { data } = await apiClient.get<IUserDetail[]>('/users');
  return data;
};

export const createUser = async (payload: CreateUserPayload): Promise<IUserDetail> => {
  const { data } = await apiClient.post<IUserDetail>('/users', payload);
  return data;
};

export const deactivateUser = async (id: string): Promise<void> => {
  await apiClient.put(`/users/${id}/deactivate`);
};

export const activateUser = async (id: string): Promise<void> => {
  await apiClient.put(`/users/${id}/activate`);
};
