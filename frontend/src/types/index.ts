export interface User {
  id: string;
  email: string;
  createdAt: string;
}

export interface WritingSession {
  _id: string;
  userId: string;
  title: string;
  content: string;
  wordCount: number;
  lastSavedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token: string;
  user: User;
}

export interface ApiError {
  success: false;
  message: string;
}
