import { apiClient } from './client';
import type { IUser, IAuthResponse } from '../types';

export const login = async (
  email: string,
  password: string
): Promise<IAuthResponse> => {
  const { data } = await apiClient.post<IAuthResponse>('/auth/login', {
    email,
    password,
  });
  return data;
};

export const getMe = async (): Promise<IUser> => {
  const { data } = await apiClient.get<IUser>('/auth/me');
  return data;
};
