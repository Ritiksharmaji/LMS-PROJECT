import { useQuery } from '@tanstack/react-query';

import { api, qs } from './api';
import { useSession } from './session';
import type { CategoryView, CourseCard, EnrollmentView, Page } from './types';

/** Public catalog of the signed-in organization. */
export function useCatalog(params: {
  category?: string;
  q?: string;
  sort?: string;
  size?: number;
}) {
  const { orgSlug } = useSession();
  const query = qs({
    sort: params.sort ?? 'POPULAR',
    size: params.size ?? 30,
    category: params.category,
    q: params.q,
  });
  return useQuery({
    queryKey: ['catalog', orgSlug, params],
    queryFn: () =>
      api.get<Page<CourseCard>>(
        `/public/organizations/${orgSlug}/courses${query}`,
      ),
  });
}

export function useCategories() {
  const { orgSlug } = useSession();
  return useQuery({
    queryKey: ['categories', orgSlug],
    queryFn: () =>
      api.get<CategoryView[]>(`/public/organizations/${orgSlug}/categories`),
  });
}

export function useEnrollments() {
  return useQuery({
    queryKey: ['enrollments'],
    queryFn: () => api.get<EnrollmentView[]>('/me/enrollments'),
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () =>
      api.get<{ unread: number }>('/me/notifications/unread-count'),
    refetchInterval: 60_000,
  });
}
