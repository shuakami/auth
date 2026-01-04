/**
 * 用户管理页面组件
 */

'use client';

import React from 'react';
import { User, Shield, Crown, Github, Chrome, MailCheck, Fingerprint, ArrowUpRight } from 'lucide-react';
import { PageHeader, DataCard } from '../shared';
import { Tooltip } from '@/components/ui/Tooltip';
import { useI18n } from '../../i18n';
import type { SystemUser } from '../../types';

interface UserTabProps {
  users: SystemUser[];
  onAddUser: () => void;
  onUserClick: (user: SystemUser) => void;
}

export function UserTab({ users, onAddUser, onUserClick }: UserTabProps) {
  const { t } = useI18n();

  // 获取角色显示名称
  const getRoleName = (role: string) => {
    const roleKey = role as keyof typeof t.users.roles;
    return t.users.roles[roleKey] || role.replace('_', ' ');
  };

  return (
    <>
      <PageHeader title={t.users.title} description={t.users.description} />

      <div className="p-4 md:py-6 lg:px-0">
        <DataCard
          title={t.users.systemUsers}
          description={t.users.systemUsersDesc}
          searchPlaceholder={t.users.searchUsers}
          action={
            <button
              onClick={onAddUser}
              className="cursor-pointer inline-flex items-center justify-center gap-x-2 whitespace-nowrap font-medium transition-colors border-input text-primary hover:border-primary/15 border shadow-sm hover:bg-overlay-hover h-7 px-3 text-xs rounded-full"
            >
              {t.users.addUser}
            </button>
          }
        >
          <div className="w-full [&_tbody_tr:hover]:bg-transparent">
            <div className="flow-root">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                  <tr className="border-b transition-colors">
                    <th className="text-muted-foreground h-10 px-2 text-left align-middle font-medium sm:px-5 w-[30%]">
                      <div className="flex w-full items-center justify-between gap-2">
                        <div className="grow">{t.users.email}</div>
                      </div>
                    </th>
                    <th className="text-muted-foreground h-10 px-2 text-left align-middle font-medium sm:px-5 w-[20%]">
                      <div className="flex w-full items-center justify-between gap-2">
                        <div className="grow">{t.users.name}</div>
                      </div>
                    </th>
                    <th className="text-muted-foreground h-10 px-2 text-left align-middle font-medium sm:px-5 w-[20%]">
                      <div className="flex w-full items-center justify-between gap-2">
                        <div className="grow">{t.users.role}</div>
                      </div>
                    </th>
                    <th className="text-muted-foreground h-10 px-2 text-left align-middle font-medium sm:px-5 w-[25%]">
                      <div className="flex w-full items-center justify-between gap-2">
                        <div className="grow">{t.users.status}</div>
                      </div>
                    </th>
                    <th className="text-muted-foreground h-10 px-2 text-left align-middle font-medium sm:px-5 w-[5%]">
                      <div className="flex w-full items-center justify-between gap-2">
                        <div className="grow" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b transition-colors hover:bg-overlay-hover group cursor-pointer"
                      onClick={() => onUserClick(user)}
                    >
                      <td className="px-2 py-2 align-middle sm:px-5">
                        <div className="truncate">{user.email}</div>
                      </td>
                      <td className="px-2 py-2 align-middle sm:px-5">
                        <div className="flex items-center gap-2">
                          {user.providers.includes('github') && <Github className="h-3.5 w-3.5 text-subtle flex-shrink-0" />}
                          {user.providers.includes('google') && <Chrome className="h-3.5 w-3.5 text-subtle flex-shrink-0" />}
                          <p className="text-sm text-muted truncate">{user.username}</p>
                        </div>
                      </td>
                      <td className="px-2 py-2 align-middle sm:px-5">
                        <div className="flex items-center gap-2">
                          {user.role === 'super_admin' && <Crown className="h-3.5 w-3.5 text-subtle flex-shrink-0" />}
                          {user.role === 'admin' && <Shield className="h-3.5 w-3.5 text-subtle flex-shrink-0" />}
                          {user.role === 'user' && <User className="h-3.5 w-3.5 text-subtle flex-shrink-0" />}
                          <span className="text-sm truncate">{getRoleName(user.role)}</span>
                        </div>
                      </td>
                      <td className="px-2 py-2 align-middle sm:px-5">
                        <div className="flex items-center gap-2">
                          {user.emailVerified && (
                            <Tooltip content={t.users.emailVerified}>
                              <div className="border-b-2 py-1 border-b-primary">
                                <MailCheck className="h-4 w-4" />
                              </div>
                            </Tooltip>
                          )}
                          {user.twoFactorEnabled && (
                            <Tooltip content={t.users.twoFactorEnabled}>
                              <div className="border-b-2 py-1 border-b-primary">
                                <Shield className="h-4 w-4" />
                              </div>
                            </Tooltip>
                          )}
                          {user.biometricEnabled && (
                            <Tooltip content={t.users.biometricEnabled}>
                              <div className="border-b-2 py-1 border-b-primary">
                                <Fingerprint className="h-4 w-4" />
                              </div>
                            </Tooltip>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-2 align-middle sm:px-5">
                        <button className="cursor-pointer opacity-0 group-hover:opacity-100 text-subtle hover:text-primary transition-all">
                          <ArrowUpRight className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </DataCard>
      </div>
    </>
  );
}
