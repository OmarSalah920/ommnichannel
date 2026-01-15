import { useState, useEffect } from 'react';
import { Header } from '../components/layout/Header';
import { supabase } from '../lib/supabase';
import {
  MessageSquare,
  Users,
  Clock,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Phone,
  MessageCircle,
  Instagram,
} from 'lucide-react';

interface Stats {
  totalConversations: number;
  openConversations: number;
  resolvedToday: number;
  avgResponseTime: string;
  channelBreakdown: { type: string; count: number }[];
}

export function AnalyticsPage() {
  const [stats, setStats] = useState<Stats>({
    totalConversations: 0,
    openConversations: 0,
    resolvedToday: 0,
    avgResponseTime: '0m',
    channelBreakdown: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const [conversationsResult, channelsResult] = await Promise.all([
      supabase.from('conversations').select('id, status, created_at'),
      supabase.from('conversations').select('channel_id, channels(type)'),
    ]);

    const conversations = conversationsResult.data || [];
    const today = new Date().toDateString();

    const channelCounts: Record<string, number> = {};
    (channelsResult.data || []).forEach((conv: any) => {
      const type = conv.channels?.type || 'unknown';
      channelCounts[type] = (channelCounts[type] || 0) + 1;
    });

    setStats({
      totalConversations: conversations.length,
      openConversations: conversations.filter((c) => c.status === 'open' || c.status === 'pending').length,
      resolvedToday: conversations.filter(
        (c) => c.status === 'resolved' && new Date(c.created_at).toDateString() === today
      ).length,
      avgResponseTime: '5m',
      channelBreakdown: Object.entries(channelCounts).map(([type, count]) => ({ type, count })),
    });
    setLoading(false);
  };

  const channelIcons: Record<string, React.ReactNode> = {
    whatsapp: <Phone className="w-5 h-5" />,
    messenger: <MessageCircle className="w-5 h-5" />,
    instagram: <Instagram className="w-5 h-5" />,
  };

  const channelColors: Record<string, string> = {
    whatsapp: 'bg-emerald-500',
    messenger: 'bg-blue-500',
    instagram: 'bg-pink-500',
  };

  return (
    <>
      <Header title="Analytics" subtitle="Track your team's performance and metrics" />

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Total Conversations</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{stats.totalConversations}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-1 text-sm">
                  <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                  <span className="text-emerald-600 font-medium">12%</span>
                  <span className="text-slate-500">vs last week</span>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Open Conversations</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{stats.openConversations}</p>
                  </div>
                  <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-amber-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-1 text-sm">
                  <ArrowDownRight className="w-4 h-4 text-emerald-500" />
                  <span className="text-emerald-600 font-medium">8%</span>
                  <span className="text-slate-500">vs last week</span>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Resolved Today</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{stats.resolvedToday}</p>
                  </div>
                  <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-emerald-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-1 text-sm">
                  <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                  <span className="text-emerald-600 font-medium">24%</span>
                  <span className="text-slate-500">vs yesterday</span>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Avg. Response Time</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{stats.avgResponseTime}</p>
                  </div>
                  <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center">
                    <Clock className="w-6 h-6 text-cyan-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-1 text-sm">
                  <ArrowDownRight className="w-4 h-4 text-emerald-500" />
                  <span className="text-emerald-600 font-medium">15%</span>
                  <span className="text-slate-500">improvement</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Channel Distribution</h3>
                <div className="space-y-4">
                  {stats.channelBreakdown.length > 0 ? (
                    stats.channelBreakdown.map((channel) => {
                      const total = stats.channelBreakdown.reduce((sum, c) => sum + c.count, 0);
                      const percentage = total > 0 ? Math.round((channel.count / total) * 100) : 0;
                      return (
                        <div key={channel.type} className="flex items-center gap-4">
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center text-white ${
                              channelColors[channel.type] || 'bg-slate-500'
                            }`}
                          >
                            {channelIcons[channel.type] || <MessageSquare className="w-5 h-5" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-slate-900 capitalize">{channel.type}</span>
                              <span className="text-sm text-slate-500">{channel.count} conversations</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${channelColors[channel.type] || 'bg-slate-500'}`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                          <span className="text-sm font-medium text-slate-600 w-12 text-right">
                            {percentage}%
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-slate-500 text-center py-8">No channel data available</p>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Conversation Volume</h3>
                <div className="h-64 flex items-end justify-between gap-2">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
                    const heights = [45, 65, 80, 55, 90, 40, 30];
                    return (
                      <div key={day} className="flex-1 flex flex-col items-center gap-2">
                        <div
                          className="w-full bg-blue-500 rounded-t-lg transition-all hover:bg-blue-600"
                          style={{ height: `${heights[index]}%` }}
                        />
                        <span className="text-xs text-slate-500">{day}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Activity</h3>
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((item) => (
                  <div key={item} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-white font-medium">
                      A{item}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">Agent {item} resolved a conversation</p>
                      <p className="text-xs text-slate-500">
                        Customer inquiry about product pricing - {item}h ago
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
