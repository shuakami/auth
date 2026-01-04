/**
 * 安全设置页面 - /dashboard/security
 */

'use client';

import React from 'react';
import { SecurityTab } from '../components/tabs/SecurityTab';
import { useAuth } from '@/context/AuthContext';

export default function SecurityPage() {
  const { user } = useAuth();

  if (!user) return null;

  return <SecurityTab />;
}
