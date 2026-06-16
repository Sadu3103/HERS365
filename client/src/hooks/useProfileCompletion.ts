import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';
import { useAuth } from '../context/AuthContext';

type ProfileData = {
  name?: string;
  position?: string;
  gradYear?: number;
  school?: string;
  state?: string;
  gpa?: string;
  achievements?: string;
};

type CompletionStep = {
  key: string;
  label: string;
  done: boolean;
  path: string;
};

export function useProfileCompletion() {
  const { user } = useAuth();

  const { data } = useQuery<{ success: boolean; data: ProfileData }>({
    queryKey: ['profile'],
    queryFn: () => apiFetch('/api/users/profile'),
    enabled: !!user,
    staleTime: 60_000,
  });

  const profile = data?.data ?? {};

  const steps = useMemo((): CompletionStep[] => [
    { key: 'position', label: 'Add your position', done: !!profile.position, path: '/onboarding' },
    { key: 'school', label: 'Add your school', done: !!profile.school, path: '/onboarding' },
    { key: 'gradYear', label: 'Add graduation year', done: !!profile.gradYear, path: '/onboarding' },
    { key: 'gpa', label: 'Add your GPA', done: !!profile.gpa, path: '/settings' },
    { key: 'achievements', label: 'Add achievements', done: !!profile.achievements, path: '/settings' },
  ], [profile]);

  const doneCount = steps.filter((s) => s.done).length;
  const pct = Math.round((doneCount / steps.length) * 100);
  const isComplete = doneCount === steps.length;
  const nextStep = steps.find((s) => !s.done) ?? null;

  return { steps, doneCount, total: steps.length, pct, isComplete, nextStep };
}
