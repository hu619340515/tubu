import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Users,
  ListOrdered,
  Radio,
  Download,
  Upload,
  KeyRound,
  UserPlus,
  Check,
  AlertTriangle,
  FileSpreadsheet,
  Database,
  Crown,
  RefreshCw,
} from 'lucide-react';
import { User, HikingList, SiteAnnouncement } from '../types';
import { storageService } from '../services/storageService';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onUserListsChanged?: () => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserListsChanged,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'lists' | 'announcement'>('overview');

  // Data states
  const [users, setUsers] = useState<(User & { passwordHash: string })[]>([]);
  const [systemLists, setSystemLists] = useState<{ list: HikingList; ownerName: string; ownerEmail: string }[]>([]);
  const [storageUsage, setStorageUsage] = useState<{ usedKb: number; count: number }>({ usedKb: 0, count: 0 });
  const [announcement, setAnnouncement] = useState<SiteAnnouncement>(storageService.getSiteAnnouncement());

  // Message banner states
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sub-modal states
  const [resetPwdUser, setResetPwdUser] = useState<(User & { passwordHash: string }) | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPwd, setNewUserPwd] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'user'>('user');

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 3000);
  };

  const reloadData = () => {
    setUsers(storageService.getAllUsersWithPasswords());
    setSystemLists(storageService.getAllSystemLists());
    setStorageUsage(storageService.getStorageUsage());
    setAnnouncement(storageService.getSiteAnnouncement());
  };

  useEffect(() => {
    if (isOpen) {
      reloadData();
    }
  }, [isOpen]);

  if (!isOpen || !currentUser || !currentUser.isAdmin) return null;

  // Handle password reset
  const handleConfirmResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPwdUser || !newPassword.trim()) return;
    const res = storageService.updateUserPassword(resetPwdUser.id, newPassword.trim());
    if (res.success) {
      showFeedback(`已成功将用户【${resetPwdUser.username}】的密码重置为：${newPassword.trim()}`);
      setResetPwdUser(null);
      setNewPassword('');
      reloadData();
    } else {
      showFeedback(res.error || '修改密码失败', 'error');
    }
  };

  // Handle delete user
  const handleDeleteUser = (u: User) => {
    if (u.email === '619340515@qq.com') {
      showFeedback('超级管理员账号不可删除', 'error');
      return;
    }
    if (confirm(`确定要删除用户【${u.username} (${u.email})】及其专属清单数据吗？该操作不可撤销！`)) {
      const res = storageService.deleteUser(u.id);
      if (res.success) {
        showFeedback(`已删除用户【${u.username}】`);
        reloadData();
        onUserListsChanged?.();
      } else {
        showFeedback(res.error || '删除失败', 'error');
      }
    }
  };

  // Handle toggle admin role
  const handleToggleAdmin = (u: User) => {
    if (u.email === '619340515@qq.com') {
      showFeedback('主管理员权限不可撤销', 'error');
      return;
    }
    const res = storageService.toggleAdminRole(u.id);
    if (res.success) {
      showFeedback(`已切换用户【${u.username}】的权限状态`);
      reloadData();
    } else {
      showFeedback(res.error || '操作失败', 'error');
    }
  };

  // Handle create user
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newUserEmail.trim() || !newUserPwd.trim()) {
      showFeedback('请完整填写新用户资料', 'error');
      return;
    }
    const res = storageService.adminCreateUser(
      newUsername.trim(),
      newUserEmail.trim(),
      newUserPwd.trim(),
      newUserRole === 'admin' ? '👑' : '🎒',
      newUserRole
    );
    if (res.success) {
      showFeedback(`已成功创建新用户【${newUsername.trim()}】`);
      setIsAddUserOpen(false);
      setNewUsername('');
      setNewUserEmail('');
      setNewUserPwd('');
      reloadData();
    } else {
      showFeedback(res.error || '创建失败', 'error');
    }
  };

  // Handle delete list
  const handleDeleteSystemList = (listId: string, title: string, userId: string) => {
    if (confirm(`确定要删除清单【${title}】吗？`)) {
      const ok = storageService.deleteSystemList(listId, userId);
      if (ok) {
        showFeedback(`已删除清单【${title}】`);
        reloadData();
        onUserListsChanged?.();
      } else {
        showFeedback('删除清单失败', 'error');
      }
    }
  };

  // Handle save announcement
  const handleSaveAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    storageService.saveSiteAnnouncement(announcement);
    showFeedback('已发布更新全站公告！所有用户顶部即刻可见。');
  };

  // Handle export data
  const handleExportData = () => {
    const dataStr = storageService.exportAllSystemData();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tubu-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    showFeedback('已导出全站数据备份 JSON 文件');
  };

  // Handle import data
  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      const res = storageService.importAllSystemData(content);
      if (res.success) {
        showFeedback('全站数据已成功从备份恢复！');
        reloadData();
        onUserListsChanged?.();
      } else {
        showFeedback(res.error || '导入失败', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const totalItemsCount = systemLists.reduce((sum, item) => sum + (item.list.items?.length || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-[#D9D4C7] overflow-hidden my-4 flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#2C2C2C] text-white shrink-0 border-b border-black/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#D27D59] flex items-center justify-center text-white shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-serif font-bold tracking-tight">网站核心管理控制台</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#D27D59] text-white font-bold">
                  管理员专属
                </span>
              </div>
              <p className="text-xs text-[#A8A29E]">
                当前登录：{currentUser.username}（{currentUser.email}）
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert Bar */}
        {feedback && (
          <div
            className={`px-6 py-2.5 text-xs font-bold flex items-center gap-2 transition ${
              feedback.type === 'success'
                ? 'bg-[#EBF3E8] text-[#3D6B35] border-b border-[#C8DEC0]'
                : 'bg-[#FDF2F0] text-[#D27D59] border-b border-[#F5C6BA]'
            }`}
          >
            {feedback.type === 'success' ? (
              <Check className="w-4 h-4" />
            ) : (
              <AlertTriangle className="w-4 h-4" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-[#E5E1D8] bg-[#FAF8F5] px-6 text-xs font-bold text-[#7A7465] shrink-0 gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-[#D27D59] text-[#D27D59]'
                : 'border-transparent hover:text-[#2C2C2C]'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>运行总览与备份</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`py-3 px-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'users'
                ? 'border-[#D27D59] text-[#D27D59]'
                : 'border-transparent hover:text-[#2C2C2C]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>用户与密码管理 ({users.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('lists')}
            className={`py-3 px-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'lists'
                ? 'border-[#D27D59] text-[#D27D59]'
                : 'border-transparent hover:text-[#2C2C2C]'
            }`}
          >
            <ListOrdered className="w-4 h-4" />
            <span>全站清单与模版 ({systemLists.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('announcement')}
            className={`py-3 px-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'announcement'
                ? 'border-[#D27D59] text-[#D27D59]'
                : 'border-transparent hover:text-[#2C2C2C]'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>全站风控广播公告</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-[#FAF9F5] space-y-6">
          {/* 1. OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-white rounded-2xl border border-[#E5E1D8] shadow-2xs">
                  <div className="flex items-center gap-2 text-[#7A7465] text-xs font-bold mb-1">
                    <Users className="w-4 h-4 text-[#5A5A40]" />
                    <span>注册用户数</span>
                  </div>
                  <div className="text-2xl font-bold text-[#2C2C2C]">{users.length}</div>
                  <div className="text-[11px] text-[#7A7465] mt-1">
                    管理员 {users.filter((u) => u.isAdmin).length} 人
                  </div>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-[#E5E1D8] shadow-2xs">
                  <div className="flex items-center gap-2 text-[#7A7465] text-xs font-bold mb-1">
                    <ListOrdered className="w-4 h-4 text-[#D27D59]" />
                    <span>全站行程清单</span>
                  </div>
                  <div className="text-2xl font-bold text-[#2C2C2C]">{systemLists.length}</div>
                  <div className="text-[11px] text-[#7A7465] mt-1">包含格聂、武功山等</div>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-[#E5E1D8] shadow-2xs">
                  <div className="flex items-center gap-2 text-[#7A7465] text-xs font-bold mb-1">
                    <FileSpreadsheet className="w-4 h-4 text-[#2E6B8E]" />
                    <span>全站装备条目</span>
                  </div>
                  <div className="text-2xl font-bold text-[#2C2C2C]">{totalItemsCount}</div>
                  <div className="text-[11px] text-[#7A7465] mt-1">含重量与分类数据</div>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-[#E5E1D8] shadow-2xs">
                  <div className="flex items-center gap-2 text-[#7A7465] text-xs font-bold mb-1">
                    <Database className="w-4 h-4 text-[#7A5A40]" />
                    <span>存储空间占用</span>
                  </div>
                  <div className="text-2xl font-bold text-[#2C2C2C]">{storageUsage.usedKb} KB</div>
                  <div className="text-[11px] text-[#7A7465] mt-1">共 {storageUsage.count} 项键值</div>
                </div>
              </div>

              {/* Data Backup & Restore Action Card */}
              <div className="p-5 bg-white rounded-2xl border border-[#E5E1D8] shadow-2xs space-y-3">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-[#5A5A40]" />
                  <h3 className="text-sm font-bold text-[#2C2C2C]">全站数据一键备份与灾备恢复</h3>
                </div>
                <p className="text-xs text-[#7A7465]">
                  随时导出全站用户清单、分类、装备库及思维导图的完整 JSON 快照；在换机或部署时可一键导入完全复原。
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleExportData}
                    className="px-4 py-2 bg-[#5A5A40] hover:bg-[#484833] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>导出全站数据备份 (JSON)</span>
                  </button>

                  <label className="px-4 py-2 bg-white border border-[#5A5A40] text-[#5A5A40] hover:bg-[#FAF8F5] font-bold text-xs rounded-xl shadow-2xs transition flex items-center gap-2 cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>从 JSON 恢复全站数据</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportData}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={reloadData}
                    className="px-3 py-2 text-xs text-[#7A7465] hover:text-[#2C2C2C] flex items-center gap-1.5 ml-auto"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>刷新统计数据</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 2. USERS TAB */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#2C2C2C]">全站注册用户与权限</h3>
                  <p className="text-xs text-[#7A7465]">管理驴友账户、重置遗忘密码、新增同行队员或分配管理员权限</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(true)}
                  className="px-3.5 py-1.5 bg-[#D27D59] hover:bg-[#be6e4c] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>添加新用户</span>
                </button>
              </div>

              {/* Users Table */}
              <div className="bg-white rounded-2xl border border-[#E5E1D8] shadow-2xs overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF8F5] border-b border-[#E5E1D8] text-[#7A7465] font-bold">
                    <tr>
                      <th className="px-4 py-3">用户昵称</th>
                      <th className="px-4 py-3">登录邮箱 (账号)</th>
                      <th className="px-4 py-3">当前密码</th>
                      <th className="px-4 py-3">角色权限</th>
                      <th className="px-4 py-3 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E1D8]/60">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-[#FAF8F5]/80 transition">
                        <td className="px-4 py-3 font-bold text-[#2C2C2C] flex items-center gap-2">
                          <span className="text-lg">{u.avatar}</span>
                          <span>{u.username}</span>
                          {u.email === '619340515@qq.com' && (
                            <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-bold">
                              主管理员
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[#5A5A40] font-mono">{u.email}</td>
                        <td className="px-4 py-3 text-[#7A7465] font-mono">
                          {u.passwordHash ? '••••••' : '无'}
                        </td>
                        <td className="px-4 py-3">
                          {u.isAdmin ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#D27D59] bg-[#FDF2F0] px-2 py-0.5 rounded-full border border-[#D27D59]/20">
                              <Crown className="w-3 h-3" />
                              <span>管理员</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-[#7A7465] bg-[#F0EEE8] px-2 py-0.5 rounded-full">
                              <span>普通驴友</span>
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => {
                              setResetPwdUser(u);
                              setNewPassword('');
                            }}
                            className="px-2 py-1 text-xs font-bold text-[#5A5A40] hover:bg-[#EAE7DF] rounded-lg transition"
                          >
                            改密
                          </button>

                          {u.email !== '619340515@qq.com' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleToggleAdmin(u)}
                                className="px-2 py-1 text-xs text-[#7A7465] hover:text-[#2C2C2C] hover:bg-[#EAE7DF] rounded-lg transition"
                              >
                                {u.isAdmin ? '降为普通' : '设为管理'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(u)}
                                className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg transition"
                              >
                                删除
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. LISTS TAB */}
          {activeTab === 'lists' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[#2C2C2C]">全站行程与模版清单监控</h3>
                <p className="text-xs text-[#7A7465]">随时查看全站所有用户创建的徒步计划，清理违规或废弃清单</p>
              </div>

              <div className="bg-white rounded-2xl border border-[#E5E1D8] shadow-2xs overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF8F5] border-b border-[#E5E1D8] text-[#7A7465] font-bold">
                    <tr>
                      <th className="px-4 py-3">清单标题与目的地</th>
                      <th className="px-4 py-3">所属用户</th>
                      <th className="px-4 py-3">行程天数</th>
                      <th className="px-4 py-3">装备数量 / 打包进度</th>
                      <th className="px-4 py-3 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E1D8]/60">
                    {systemLists.map(({ list, ownerName, ownerEmail }) => {
                      const packedCount = list.items?.filter((i) => i.packed).length || 0;
                      const total = list.items?.length || 0;
                      return (
                        <tr key={list.id} className="hover:bg-[#FAF8F5]/80 transition">
                          <td className="px-4 py-3">
                            <div className="font-bold text-[#2C2C2C]">{list.title}</div>
                            <div className="text-[11px] text-[#7A7465]">{list.destination}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-[#5A5A40]">{ownerName}</div>
                            <div className="text-[10px] text-[#A8A29E] font-mono">{ownerEmail}</div>
                          </td>
                          <td className="px-4 py-3 text-[#2C2C2C] font-bold">
                            {list.durationDays} 天
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[#2C2C2C]">
                                {packedCount} / {total} 件
                              </span>
                              <div className="w-16 h-1.5 bg-[#E5E1D8] rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-[#5A5A40] rounded-full"
                                  style={{ width: `${total ? (packedCount / total) * 100 : 0}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteSystemList(list.id, list.title, list.userId)}
                              className="px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg transition"
                            >
                              删除清单
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 4. ANNOUNCEMENT TAB */}
          {activeTab === 'announcement' && (
            <form onSubmit={handleSaveAnnouncement} className="p-5 bg-white rounded-2xl border border-[#E5E1D8] shadow-2xs space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[#2C2C2C]">全站顶部风控与出行通知广播</h3>
                <p className="text-xs text-[#7A7465]">
                  开启后将在网页顶部展示常驻广播条，用于发布降温风控、交通变动或领队通知，所有访客实时可见。
                </p>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#2C2C2C]">
                  <input
                    type="checkbox"
                    checked={announcement.enabled}
                    onChange={(e) => setAnnouncement({ ...announcement, enabled: e.target.checked })}
                    className="w-4 h-4 rounded text-[#D27D59] focus:ring-[#D27D59]"
                  />
                  <span>开启全站横幅广播展示</span>
                </label>
              </div>

              <div>
                <label className="text-xs font-bold text-[#5A5A40] block mb-1">公告标题</label>
                <input
                  type="text"
                  required
                  value={announcement.title}
                  onChange={(e) => setAnnouncement({ ...announcement, title: e.target.value })}
                  placeholder="例如：格聂高海拔徒步风控通知"
                  className="w-full px-3 py-2 bg-white border border-[#D9D4C7] rounded-xl text-xs sm:text-sm text-[#2C2C2C] focus:ring-2 focus:ring-[#5A5A40] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#5A5A40] block mb-1">公告正文内容</label>
                <textarea
                  required
                  rows={3}
                  value={announcement.content}
                  onChange={(e) => setAnnouncement({ ...announcement, content: e.target.value })}
                  placeholder="详细说明风险提示、装备调整建议或集结时间点..."
                  className="w-full px-3 py-2 bg-white border border-[#D9D4C7] rounded-xl text-xs sm:text-sm text-[#2C2C2C] focus:ring-2 focus:ring-[#5A5A40] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                {(['info', 'warning', 'alert'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setAnnouncement({ ...announcement, type: t })}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      announcement.type === t
                        ? 'border-[#D27D59] bg-[#FDF2F0] text-[#D27D59]'
                        : 'border-[#E5E1D8] text-[#7A7465] hover:border-[#D9D4C7]'
                    }`}
                  >
                    <span>
                      {t === 'info' ? 'ℹ️ 普通提醒' : t === 'warning' ? '⚠️ 风控预警' : '🚨 紧急注意'}
                    </span>
                  </button>
                ))}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#D27D59] hover:bg-[#be6e4c] text-white font-bold text-xs rounded-xl shadow-xs transition"
                >
                  保存并即刻发布全站广播
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Sub-modal: Reset Password */}
      {resetPwdUser && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-[#D9D4C7] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#2C2C2C] font-bold text-sm">
                <KeyRound className="w-4 h-4 text-[#D27D59]" />
                <span>重置用户登录密码</span>
              </div>
              <button
                type="button"
                onClick={() => setResetPwdUser(null)}
                className="text-[#7A7465] hover:text-[#2C2C2C]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#7A7465]">
              正在为用户【<strong>{resetPwdUser.username}</strong> ({resetPwdUser.email})】设定新密码：
            </p>

            <form onSubmit={handleConfirmResetPassword} className="space-y-3">
              <input
                type="text"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="请输入新密码（如：619340515）"
                className="w-full px-3 py-2 bg-white border border-[#D9D4C7] rounded-xl text-xs text-[#2C2C2C] focus:ring-2 focus:ring-[#5A5A40] focus:outline-none font-mono"
              />
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setResetPwdUser(null)}
                  className="px-3 py-1.5 text-xs text-[#7A7465] hover:text-[#2C2C2C]"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#5A5A40] hover:bg-[#484833] text-white font-bold text-xs rounded-xl shadow-xs transition"
                >
                  确认保存新密码
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sub-modal: Add New User */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-[#D9D4C7] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#2C2C2C] font-bold text-sm">
                <UserPlus className="w-4 h-4 text-[#D27D59]" />
                <span>新建队员账户</span>
              </div>
              <button
                type="button"
                onClick={() => setIsAddUserOpen(false)}
                className="text-[#7A7465] hover:text-[#2C2C2C]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[#5A5A40] block mb-1">驴友昵称</label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="例如：阿杰"
                  className="w-full px-3 py-1.5 border border-[#D9D4C7] rounded-xl text-xs text-[#2C2C2C]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#5A5A40] block mb-1">登录邮箱 / 账号</label>
                <input
                  type="text"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="例如：ajie@trailpack.cn"
                  className="w-full px-3 py-1.5 border border-[#D9D4C7] rounded-xl text-xs text-[#2C2C2C]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#5A5A40] block mb-1">初始密码</label>
                <input
                  type="text"
                  required
                  value={newUserPwd}
                  onChange={(e) => setNewUserPwd(e.target.value)}
                  placeholder="例如：123456"
                  className="w-full px-3 py-1.5 border border-[#D9D4C7] rounded-xl text-xs text-[#2C2C2C]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#5A5A40] block mb-1">权限类型</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNewUserRole('user')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-xl border ${
                      newUserRole === 'user' ? 'bg-[#5A5A40] text-white border-[#5A5A40]' : 'border-[#D9D4C7] text-[#7A7465]'
                    }`}
                  >
                    普通驴友
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewUserRole('admin')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-xl border ${
                      newUserRole === 'admin' ? 'bg-[#D27D59] text-white border-[#D27D59]' : 'border-[#D9D4C7] text-[#7A7465]'
                    }`}
                  >
                    👑 管理员
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-3 py-1.5 text-xs text-[#7A7465]"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#5A5A40] hover:bg-[#484833] text-white font-bold text-xs rounded-xl shadow-xs transition"
                >
                  确认添加
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
