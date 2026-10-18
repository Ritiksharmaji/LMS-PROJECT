import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { Alert, Share, View } from 'react-native';

import {
  Avatar,
  Badge,
  Button,
  Card,
  Chips,
  EmptyState,
  ErrorState,
  FadeIn,
  Field,
  Loading,
  Screen,
  Segmented,
  T,
} from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { date, money, relative, role as roleLabel } from '../../lib/format';
import type {
  CreatedInvite,
  MemberCounts,
  MemberView,
  OrderView,
  Page,
  RevenueSummary,
  Role,
} from '../../lib/types';
import { usePalette } from '../../theme/ThemeProvider';
import { ORDER_TONE } from '../account/AccountScreens';

const ROLE_TONE = {
  ADMIN: 'dark',
  INSTRUCTOR: 'orbit',
  STUDENT: 'accent',
} as const;

export function PeopleScreen() {
  const p = usePalette();
  const qc = useQueryClient();
  const [role, setRole] = useState<'ALL' | Role>('ALL');
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [inviting, setInviting] = useState(false);
  const counts = useQuery({
    queryKey: ['member-counts'],
    queryFn: () => api.get<MemberCounts>('/admin/members/counts'),
  });
  const members = useQuery({
    queryKey: ['members', role, query],
    queryFn: () =>
      api.get<Page<MemberView>>(
        `/admin/members?size=100${
          role === 'ALL' ? '' : `&role=${role}`
        }&q=${encodeURIComponent(query)}`,
      ),
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['members'] });
    qc.invalidateQueries({ queryKey: ['member-counts'] });
  };
  const update = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: Partial<Pick<MemberView, 'role' | 'status'>>;
    }) => api.patch<MemberView>(`/admin/members/${id}`, body),
    onSuccess: refresh,
    onError: e => Alert.alert("Couldn't update", errorMessage(e)),
  });
  const manage = (m: MemberView) =>
    Alert.alert(m.fullName, m.email, [
      ...(['STUDENT', 'INSTRUCTOR', 'ADMIN'] as Role[])
        .filter(r => r !== m.role)
        .map(r => ({
          text: `Make ${roleLabel(r).toLowerCase()}`,
          onPress: () => update.mutate({ id: m.id, body: { role: r } }),
        })),
      m.status === 'ACTIVE'
        ? {
            text: 'Suspend',
            style: 'destructive' as const,
            onPress: () =>
              update.mutate({ id: m.id, body: { status: 'SUSPENDED' } }),
          }
        : {
            text: 'Reactivate',
            onPress: () =>
              update.mutate({ id: m.id, body: { status: 'ACTIVE' } }),
          },
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  const c = counts.data;
  return (
    <Screen
      refreshing={members.isRefetching}
      onRefresh={() => {
        members.refetch();
        counts.refetch();
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <T v="h1">People</T>
        <Button
          title="Invite"
          small
          icon="user-plus"
          onPress={() => setInviting(v => !v)}
        />
      </View>
      {inviting && (
        <InviteForm
          onDone={() => {
            setInviting(false);
            refresh();
          }}
        />
      )}
      <Field
        icon="search"
        placeholder="Search by name or email"
        value={q}
        onChangeText={setQ}
        onSubmitEditing={() => setQuery(q.trim())}
        returnKeyType="search"
        autoCapitalize="none"
      />
      <Chips
        value={role}
        onChange={setRole}
        items={[
          { value: 'ALL', label: `Everyone${c ? ` · ${c.everyone}` : ''}` },
          { value: 'STUDENT', label: `Students${c ? ` · ${c.students}` : ''}` },
          {
            value: 'INSTRUCTOR',
            label: `Instructors${c ? ` · ${c.instructors}` : ''}`,
          },
          { value: 'ADMIN', label: `Admins${c ? ` · ${c.admins}` : ''}` },
        ]}
      />
      {members.error ? (
        <ErrorState
          message={errorMessage(members.error)}
          onRetry={members.refetch}
        />
      ) : !members.data ? (
        <Loading />
      ) : members.data.items.length === 0 ? (
        <EmptyState icon="users" title="No one matches" />
      ) : (
        <Card padding={4}>
          {members.data.items.map((m, i, a) => (
            <FadeIn key={m.id} delay={Math.min(i, 8) * 30}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  padding: 12,
                  borderBottomWidth: i === a.length - 1 ? 0 : 0.5,
                  borderBottomColor: p.border,
                  opacity: m.status === 'SUSPENDED' ? 0.55 : 1,
                }}
              >
                <Avatar name={m.fullName} uri={m.avatarUrl} />
                <View style={{ flex: 1, gap: 2 }}>
                  <T v="label" numberOfLines={1}>
                    {m.fullName}
                  </T>
                  <T v="small" color={p.muted} numberOfLines={1}>
                    {m.email}
                  </T>
                  <T v="small" color={p.subtle}>
                    {m.status === 'SUSPENDED'
                      ? 'Suspended'
                      : m.lastActiveAt
                      ? `Active ${relative(m.lastActiveAt)}`
                      : `Joined ${date(m.joinedAt)}`}
                  </T>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <Badge label={roleLabel(m.role)} tone={ROLE_TONE[m.role]} />
                  <Button
                    title="Manage"
                    small
                    variant="ghost"
                    onPress={() => manage(m)}
                  />
                </View>
              </View>
            </FadeIn>
          ))}
        </Card>
      )}
    </Screen>
  );
}

function InviteForm({ onDone }: { onDone: () => void }) {
  const p = usePalette();
  const [emails, setEmails] = useState('');
  const [role, setRole] = useState<Role>('STUDENT');
  const invite = useMutation({
    mutationFn: () =>
      api.post<CreatedInvite[]>('/admin/invites', {
        emails: emails.split(/[\s,;]+/).filter(Boolean),
        role,
      }),
    onSuccess: list => {
      Alert.alert(
        `${list.length} invite${list.length === 1 ? '' : 's'} sent`,
        'They will get an email with a link to join.',
        [
          {
            text: 'Share link',
            onPress: () => list[0] && Share.share({ message: list[0].link }),
          },
          { text: 'Done', onPress: onDone },
        ],
      );
      setEmails('');
    },
    onError: e => Alert.alert("Couldn't invite", errorMessage(e)),
  });
  return (
    <FadeIn>
      <Card style={{ gap: 12 }}>
        <T v="h3">Invite people</T>
        <Field
          label="Emails"
          multiline
          value={emails}
          onChangeText={setEmails}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="one@school.edu, two@school.edu"
        />
        <Segmented
          value={role}
          onChange={setRole}
          items={[
            { value: 'STUDENT', label: 'Student' },
            { value: 'INSTRUCTOR', label: 'Instructor' },
            { value: 'ADMIN', label: 'Admin' },
          ]}
        />
        <T v="small" color={p.muted}>
          Invites expire after 7 days and count toward your seat limit.
        </T>
        <Button
          title="Send invites"
          icon="send"
          loading={invite.isPending}
          disabled={!emails.trim()}
          onPress={() => invite.mutate()}
        />
      </Card>
    </FadeIn>
  );
}

export function AdminOrdersScreen() {
  const p = usePalette();
  const orders = useQuery({
    queryKey: ['admin-orders'],
    queryFn: () => api.get<Page<OrderView>>('/admin/orders?size=100'),
  });
  const revenue = useQuery({
    queryKey: ['revenue'],
    queryFn: () => api.get<RevenueSummary>('/admin/revenue?days=30'),
  });
  const refund = useMutation({
    mutationFn: (id: string) =>
      api.post<OrderView>(`/admin/orders/${id}/refund`),
    onSuccess: () => {
      orders.refetch();
      revenue.refetch();
    },
    onError: e => Alert.alert("Couldn't refund", errorMessage(e)),
  });
  const paid = revenue.data?.paid[0];
  const refunded = revenue.data?.refunded[0];
  return (
    <Screen
      refreshing={orders.isRefetching}
      onRefresh={() => {
        orders.refetch();
        revenue.refetch();
      }}
    >
      <T v="h1">Orders</T>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Card style={{ flex: 1, gap: 4 }}>
          <T v="small" color={p.muted}>
            Revenue · 30 days
          </T>
          <T v="h2">
            {paid ? money(paid.amountCents, paid.currency) : '$0.00'}
          </T>
          <T v="small" color={p.muted}>
            {paid?.orders ?? 0} orders
          </T>
        </Card>
        <Card style={{ flex: 1, gap: 4 }}>
          <T v="small" color={p.muted}>
            Refunded
          </T>
          <T v="h2">
            {refunded
              ? money(refunded.amountCents, refunded.currency)
              : '$0.00'}
          </T>
          <T v="small" color={p.muted}>
            {refunded?.orders ?? 0} orders
          </T>
        </Card>
      </View>
      {orders.error ? (
        <ErrorState
          message={errorMessage(orders.error)}
          onRetry={orders.refetch}
        />
      ) : !orders.data ? (
        <Loading />
      ) : orders.data.items.length === 0 ? (
        <EmptyState icon="receipt" title="No orders yet" />
      ) : (
        orders.data.items.map(o => (
          <Card key={o.id} style={{ gap: 6 }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <T v="h3" style={{ flex: 1 }} numberOfLines={1}>
                {o.courseTitle}
              </T>
              <T v="h3">{money(o.amountCents, o.currency)}</T>
            </View>
            <T v="small" color={p.muted}>
              {o.buyerName} · {o.buyerEmail}
            </T>
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              <Badge
                label={o.status.charAt(0) + o.status.slice(1).toLowerCase()}
                tone={ORDER_TONE[o.status]}
              />
              <T v="small" color={p.muted} style={{ flex: 1 }}>
                {date(o.paidAt ?? o.createdAt)}
              </T>
              {o.status === 'PAID' && (
                <Button
                  title="Refund"
                  small
                  variant="ghost"
                  onPress={() =>
                    Alert.alert(
                      'Refund this order?',
                      `${money(o.amountCents, o.currency)} to ${o.buyerName}`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Refund',
                          style: 'destructive',
                          onPress: () => refund.mutate(o.id),
                        },
                      ],
                    )
                  }
                />
              )}
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}
