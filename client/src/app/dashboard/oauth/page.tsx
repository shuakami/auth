/**
 * OAuth 应用管理页面 - /dashboard/oauth
 */

'use client';

import { OAuthTab } from '../components/tabs/OAuthTab';
import { useAuth } from '@/context/AuthContext';

export default function OAuthPage() {
  const { user } = useAuth();

  if (!user) return null;

  return <OAuthTab />;
}
