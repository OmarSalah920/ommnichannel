import { useState, useEffect } from 'react';
import { Header } from '../components/layout/Header';
import { supabase } from '../lib/supabase';
import type { UserProfile, Team } from '../types/database';
import {
  Users,
  Plus,
  Search,
  MoreVertical,
  Mail,
  Shield,
  Clock,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function TeamPage() {
  const { isAdmin } = useAuth();
  const [agents, setAgents] = useState<UserProfile[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDescription, setNewTeamDescription] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [agentsResult, teamsResult] = await Promise.all([
      supabase.from('user_profiles').select('*').order('full_name'),
      supabase.from('teams').select('*').order('name'),
    ]);

    if (agentsResult.data) setAgents(agentsResult.data);
    if (teamsResult.data) setTeams(teamsResult.data);
    setLoading(false);
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;

    const { error } = await supabase.from('teams').insert({
      name: newTeamName.trim(),
      description: newTeamDescription.trim(),
    });

    if (!error) {
      setNewTeamName('');
      setNewTeamDescription('');
      setShowCreateTeam(false);
      fetchData();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-emerald-500';
      case 'busy':
        return 'bg-red-500';
      case 'away':
        return 'bg-amber-500';
      default:
        return 'bg-slate-400';
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-700';
      case 'supervisor':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <>
      <Header title="Team" subtitle="Manage your team members and groups" />

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="bg-white rounded-xl border border-slate-200">
                  <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-slate-500" />
                      <h3 className="font-semibold text-slate-900">Team Members</h3>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-sm">
                        {agents.length}
                      </span>
                    </div>
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search members..."
                        className="pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {agents.map((agent) => (
                      <div
                        key={agent.id}
                        className="p-4 hover:bg-slate-50 transition-colors flex items-center gap-4"
                      >
                        <div className="relative">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-white font-medium">
                            {agent.full_name?.charAt(0)?.toUpperCase() || agent.email.charAt(0).toUpperCase()}
                          </div>
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white ${getStatusColor(
                              agent.status
                            )}`}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h4 className="font-medium text-slate-900 truncate">
                              {agent.full_name || 'Unnamed User'}
                            </h4>
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${getRoleBadgeColor(
                                agent.role
                              )}`}
                            >
                              {agent.role}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-slate-500">
                            <span className="flex items-center gap-1">
                              <Mail className="w-3.5 h-3.5" />
                              {agent.email}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium capitalize ${
                              agent.status === 'online'
                                ? 'bg-emerald-100 text-emerald-700'
                                : agent.status === 'busy'
                                ? 'bg-red-100 text-red-700'
                                : agent.status === 'away'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {agent.status}
                          </span>
                          <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-slate-200">
                  <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-slate-500" />
                      <h3 className="font-semibold text-slate-900">Teams</h3>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => setShowCreateTeam(true)}
                        className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="p-4 space-y-3">
                    {teams.length === 0 ? (
                      <p className="text-sm text-slate-500 text-center py-4">No teams created yet</p>
                    ) : (
                      teams.map((team) => (
                        <div
                          key={team.id}
                          className="p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-medium text-slate-900">{team.name}</h4>
                            <button className="p-1 text-slate-400 hover:text-slate-600">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-sm text-slate-500">{team.description || 'No description'}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-5 h-5 text-slate-500" />
                    <h3 className="font-semibold text-slate-900">Activity Summary</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Online</span>
                      <span className="text-sm font-medium text-slate-900">
                        {agents.filter((a) => a.status === 'online').length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Away</span>
                      <span className="text-sm font-medium text-slate-900">
                        {agents.filter((a) => a.status === 'away').length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Busy</span>
                      <span className="text-sm font-medium text-slate-900">
                        {agents.filter((a) => a.status === 'busy').length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Offline</span>
                      <span className="text-sm font-medium text-slate-900">
                        {agents.filter((a) => a.status === 'offline').length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showCreateTeam && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md m-4">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Create New Team</h3>
              <button
                onClick={() => setShowCreateTeam(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateTeam} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Team Name</label>
                <input
                  type="text"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="e.g., Support Team"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
                <textarea
                  value={newTeamDescription}
                  onChange={(e) => setNewTeamDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                  rows={3}
                  placeholder="Describe the team's purpose..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateTeam(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
