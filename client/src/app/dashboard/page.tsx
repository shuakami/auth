'use client';

import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import { useRedirectHandler } from '@/hooks/useRedirectHandler';
import LoadingIndicator from '@/components/ui/LoadingIndicator';
import DashboardContent from './DashboardContent';

export default function DashboardPage() {
  const { isRedirecting } = useRedirectHandler();

  if (isRedirecting) {
    return <LoadingIndicator />;
  }

  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
