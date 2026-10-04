import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  ShieldCheck,
  Crown,
  ChefHat,
  User,
  Star,
  CheckCircle2,
  RefreshCw,
  Mail,
  Phone,
} from 'lucide-react';
import { UserProfile, UserRole } from '../../types/auth';
import { crmService } from '../../services/crmService';

export const UsersDirectory: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [loading, setLoading] = useState(true);
  const [updatingUid, setUpdatingUid] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsub = crmService.subscribeToUsers((remoteUsers) => {
      setUsers(remoteUsers);
      setLoading(false);
    });

    return () => {
      if (unsub) unsub();
    };
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchRole = roleFilter === 'all' || u.role === roleFilter;
      const matchSearch =
        (u.displayName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.phoneNumber || '').includes(searchQuery);
      return matchRole && matchSearch;
    });
  }, [users, roleFilter, searchQuery]);

  const handleRoleChange = async (uid: string, nextRole: UserRole) => {
    setUpdatingUid(uid);
    try {
      await crmService.updateUserRole(uid, nextRole);
      setUsers((prev) =>
        prev.map((u) => (u.uid === uid ? { ...u, role: nextRole } : u))
      );
    } catch (err) {
      console.error('Error updating user role:', err);
    } finally {
      setUpdatingUid(null);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 p-4 sm:p-6 overflow-hidden">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black text-white">Users & Staff Directory</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-slate-950 font-mono">
              {filteredUsers.length} Users
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time directory of customer accounts, managers, and kitchen staff from Firestore.
          </p>
        </div>

        {/* Role Filters */}
        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl text-xs font-bold border border-slate-800 self-start sm:self-auto">
          {(['all', 'admin', 'staff', 'customer'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-lg capitalize transition-colors cursor-pointer ${
                roleFilter === r
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {r === 'all' ? 'All Roles' : r === 'admin' ? '👑 Admins' : r === 'staff' ? '👨‍🍳 Staff' : 'Customers'}
            </button>
          ))}
        </div>
      </div>

      {/* Search Input */}
      <div className="py-3 max-w-md shrink-0">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or mobile number..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="flex-1 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900/60">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/90 border-b border-slate-800 text-slate-400 font-bold sticky top-0 z-10">
            <tr>
              <th className="py-3 px-4">User</th>
              <th className="py-3 px-4">Contact Info</th>
              <th className="py-3 px-4">Current Role</th>
              <th className="py-3 px-4">Loyalty Points</th>
              <th className="py-3 px-4">Registered Date</th>
              <th className="py-3 px-4 text-right">Assign Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500">
                  No users found matching query.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => (
                <tr key={u.uid} className="hover:bg-slate-850/60 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 ${
                        u.role === 'admin'
                          ? 'bg-amber-600'
                          : u.role === 'staff'
                          ? 'bg-blue-600'
                          : 'bg-slate-700'
                      }`}>
                        {u.displayName?.[0] || 'U'}
                      </div>
                      <div>
                        <p className="font-bold text-white text-xs sm:text-sm">
                          {u.displayName || 'Hashtag User'}
                        </p>
                        <span className="font-mono text-[10px] text-slate-500">
                          UID: {u.uid.slice(0, 10)}...
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <div className="space-y-0.5 text-[11px]">
                      {u.email && (
                        <p className="text-slate-300 flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-500" />
                          <span>{u.email}</span>
                        </p>
                      )}
                      {u.phoneNumber && (
                        <p className="text-slate-400 flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3 text-slate-500" />
                          <span>{u.phoneNumber}</span>
                        </p>
                      )}
                      {!u.email && !u.phoneNumber && (
                        <span className="text-slate-500 italic">Guest Session</span>
                      )}
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    {u.role === 'admin' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        <Crown className="w-3 h-3 text-amber-400" />
                        <span>Admin</span>
                      </span>
                    ) : u.role === 'staff' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-500/20 text-blue-300 border border-blue-500/40">
                        <ChefHat className="w-3 h-3 text-blue-400" />
                        <span>Kitchen Staff</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        <User className="w-3 h-3 text-slate-400" />
                        <span>Customer</span>
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-4 font-mono font-bold text-amber-400">
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      <span>{u.loyaltyPoints ?? 100} pts</span>
                    </div>
                  </td>

                  <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Active'}
                  </td>

                  <td className="py-3 px-4 text-right">
                    <select
                      value={u.role}
                      disabled={updatingUid === u.uid}
                      onChange={(e) => handleRoleChange(u.uid, e.target.value as UserRole)}
                      className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer disabled:opacity-50"
                    >
                      <option value="customer">Customer</option>
                      <option value="staff">Kitchen Staff</option>
                      <option value="admin">Admin / Owner</option>
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
