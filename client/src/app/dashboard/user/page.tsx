/**
 * 用户管理页面 - /dashboard/user
 */

'use client';

import { UserTab } from '../components/tabs/UserTab';
import { useAuth } from '@/context/AuthContext';

export default function UserPage() {
  const { user } = useAuth();

  if (!user) return null;

  return <UserTab />;
}
