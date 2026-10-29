export interface User {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  verifiedPhone?: string;
  role: 'user' | 'reseller' | 'admin' | string;
  balance: number;
  coins?: number;
  avatar?: string;
  status?: string;
  savedPhones?: string[];
  createdAt?: string;
}

export interface ApiResponse<T = any> {
  status: boolean;
  success?: boolean;
  message?: string;
  data?: T;
  user?: User;
  token?: string;
  [key: string]: any;
}

export interface CartItem {
  id: string;
  packageId?: string;
  packageName?: string;
  name?: string;
  title?: string;
  serviceType?: string;
  price: number;
  totalPrice?: number;
  duration?: string;
  imei?: string;
  target?: string;
  targetPhone?: string;
  quantity?: number;
  speed?: string;
  speedPrice?: number;
}

export interface Package {
  id: string;
  provider: string;
  name: string;
  category?: string;
  description?: string;
  price: number;
  resellerPrice?: number;
  active: boolean;
}

export interface Transaction {
  id: string;
  code?: string;
  userId: string;
  service: string;
  target?: string;
  amount: number;
  status: 'pending' | 'success' | 'failed' | 'processing';
  note?: string;
  createdAt: string;
}
