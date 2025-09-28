export interface RegisterRequest {
  phone: string;
  name: string;
  subject: string;
  grade: string;
  password: string;
}

export interface RegisterResponse {
  id: string;
  phone: string;
  name: string;
  subject: string;
  grade: string;
  isEnabled: boolean;
  createTime: number;
}

export interface LoginRequest {
  phone: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    phone: string;
    name: string;
    subject: string;
    grade: string;
    isEnabled: boolean;
    createTime: number;
  };
}

export type ProfileResponse = LoginResponse['user'];