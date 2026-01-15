import { useState, useEffect } from 'react';
import { Header } from '../components/layout/Header';
import { supabase } from '../lib/supabase';
import {
  Bot,
  Plus,
  Settings,
  Trash2,
  ToggleLeft,
  ToggleRight,
  MessageSquare,
  Clock,
  Zap,
  Save,
  X,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';

interface BotConfig {
  id: string;
  name: string;
  channel_id: string | null;
  is_active: boolean;
  welcome_message: string;
  fallback_message: string;
  response_delay_ms: number;
  auto_responses: AutoResponse[];
  created_at: string;
}

interface AutoResponse {
  id: string;
  trigger: string;
  response: string;
  match_type: 'exact' | 'contains' | 'regex';
}

interface Channel {
  id: string;
  name: string;
  type: string;
}

export function BotConfigPage() {
  const [bots, setBots] = useState<BotConfig[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBot, setSelectedBot] = useState<BotConfig | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<Partial<BotConfig>>({
    name: '',
    channel_id: null,
    is_active: false,
    welcome_message: '',
    fallback_message: '',
    response_delay_ms: 1000,
    auto_responses: [],
  });
  const [newResponse, setNewResponse] = useState<Partial<AutoResponse>>({
    trigger: '',
    response: '',
    match_type: 'contains',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [botsResult, channelsResult] = await Promise.all([
      supabase.from('bot_configs').select('*').order('created_at', { ascending: false }),
      supabase.from('channels').select('id, name, type'),
    ]);

    setBots(botsResult.data || []);
    setChannels(channelsResult.data || []);
    setLoading(false);
  };

  const handleSelectBot = (bot: BotConfig) => {
    setSelectedBot(bot);
    setFormData({
      ...bot,
      auto_responses: bot.auto_responses || [],
    });
    setIsCreating(false);
  };

  const handleCreateNew = () => {
    setSelectedBot(null);
    setIsCreating(true);
    setFormData({
      name: '',
      channel_id: null,
      is_active: false,
      welcome_message: 'Hello! How can I help you today?',
      fallback_message: "I'm sorry, I didn't understand that. Let me connect you with a human agent.",
      response_delay_ms: 1000,
      auto_responses: [],
    });
  };

  const handleAddAutoResponse = () => {
    if (!newResponse.trigger || !newResponse.response) return;

    const response: AutoResponse = {
      id: crypto.randomUUID(),
      trigger: newResponse.trigger || '',
      response: newResponse.response || '',
      match_type: newResponse.match_type || 'contains',
    };

    setFormData({
      ...formData,
      auto_responses: [...(formData.auto_responses || []), response],
    });
    setNewResponse({ trigger: '', response: '', match_type: 'contains' });
  };

  const handleRemoveAutoResponse = (id: string) => {
    setFormData({
      ...formData,
      auto_responses: (formData.auto_responses || []).filter((r) => r.id !== id),
    });
  };

  const handleSave = async () => {
    setSaving(true);

    if (isCreating) {
      const { data, error } = await supabase
        .from('bot_configs')
        .insert([formData])
        .select()
        .single();

      if (!error && data) {
        setBots([data, ...bots]);
        setSelectedBot(data);
        setIsCreating(false);
      }
    } else if (selectedBot) {
      const { error } = await supabase
        .from('bot_configs')
        .update(formData)
        .eq('id', selectedBot.id);

      if (!error) {
        setBots(bots.map((b) => (b.id === selectedBot.id ? { ...b, ...formData } as BotConfig : b)));
        setSelectedBot({ ...selectedBot, ...formData } as BotConfig);
      }
    }

    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('bot_configs').delete().eq('id', id);

    if (!error) {
      setBots(bots.filter((b) => b.id !== id));
      if (selectedBot?.id === id) {
        setSelectedBot(null);
        setIsCreating(false);
      }
    }
  };

  const handleToggleActive = async (bot: BotConfig) => {
    const { error } = await supabase
      .from('bot_configs')
      .update({ is_active: !bot.is_active })
      .eq('id', bot.id);

    if (!error) {
      setBots(bots.map((b) => (b.id === bot.id ? { ...b, is_active: !bot.is_active } : b)));
      if (selectedBot?.id === bot.id) {
        setSelectedBot({ ...selectedBot, is_active: !bot.is_active });
        setFormData({ ...formData, is_active: !bot.is_active });
      }
    }
  };

  const getChannelName = (channelId: string | null) => {
    if (!channelId) return 'All Channels';
    const channel = channels.find((c) => c.id === channelId);
    return channel ? channel.name : 'Unknown';
  };

  return (
    <>
      <Header title="Bot Configuration" subtitle="Configure automated responses and chatbot behavior" />

      <div className="flex-1 overflow-hidden flex">
        <div className="w-80 border-r border-slate-200 bg-white flex flex-col">
          <div className="p-4 border-b border-slate-200">
            <button
              onClick={handleCreateNew}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create New Bot
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-6 h-6 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
              </div>
            ) : bots.length === 0 ? (
              <div className="p-6 text-center">
                <Bot className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No bots configured</p>
                <p className="text-sm text-slate-400 mt-1">Create your first bot to get started</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {bots.map((bot) => (
                  <div
                    key={bot.id}
                    onClick={() => handleSelectBot(bot)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedBot?.id === bot.id
                        ? 'bg-blue-50 border border-blue-200'
                        : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            bot.is_active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          <Bot className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{bot.name}</p>
                          <p className="text-xs text-slate-500">{getChannelName(bot.channel_id)}</p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleActive(bot);
                        }}
                        className={`p-1 rounded ${bot.is_active ? 'text-emerald-600' : 'text-slate-400'}`}
                      >
                        {bot.is_active ? (
                          <ToggleRight className="w-6 h-6" />
                        ) : (
                          <ToggleLeft className="w-6 h-6" />
                        )}
                      </button>
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {bot.auto_responses?.length || 0} responses
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {bot.response_delay_ms}ms delay
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50">
          {!selectedBot && !isCreating ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Settings className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 text-lg">Select a bot to configure</p>
                <p className="text-slate-400 mt-1">Or create a new one to get started</p>
              </div>
            </div>
          ) : (
            <div className="p-6 max-w-3xl mx-auto space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-slate-900">
                    {isCreating ? 'Create New Bot' : 'Bot Settings'}
                  </h3>
                  {!isCreating && selectedBot && (
                    <button
                      onClick={() => handleDelete(selectedBot.id)}
                      className="flex items-center gap-2 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Bot
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Bot Name</label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Support Bot"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Channel</label>
                    <select
                      value={formData.channel_id || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, channel_id: e.target.value || null })
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">All Channels</option>
                      {channels.map((channel) => (
                        <option key={channel.id} value={channel.id}>
                          {channel.name} ({channel.type})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900">Bot Active</p>
                      <p className="text-sm text-slate-500">Enable or disable this bot</p>
                    </div>
                    <button
                      onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                      className={`p-1 rounded ${formData.is_active ? 'text-emerald-600' : 'text-slate-400'}`}
                    >
                      {formData.is_active ? (
                        <ToggleRight className="w-8 h-8" />
                      ) : (
                        <ToggleLeft className="w-8 h-8" />
                      )}
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Response Delay (ms)
                    </label>
                    <input
                      type="number"
                      value={formData.response_delay_ms || 1000}
                      onChange={(e) =>
                        setFormData({ ...formData, response_delay_ms: parseInt(e.target.value) || 1000 })
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min={0}
                      max={5000}
                      step={100}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Add a delay to make responses feel more natural
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Messages</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Welcome Message
                    </label>
                    <textarea
                      value={formData.welcome_message || ''}
                      onChange={(e) => setFormData({ ...formData, welcome_message: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows={3}
                      placeholder="Hello! How can I help you today?"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Sent when a customer starts a new conversation
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Fallback Message
                    </label>
                    <textarea
                      value={formData.fallback_message || ''}
                      onChange={(e) => setFormData({ ...formData, fallback_message: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows={3}
                      placeholder="I'm sorry, I didn't understand that. Let me connect you with a human agent."
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Sent when no auto-response matches the customer's message
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Auto Responses</h3>
                    <p className="text-sm text-slate-500">
                      Define automatic responses based on customer messages
                    </p>
                  </div>
                  <Zap className="w-5 h-5 text-amber-500" />
                </div>

                <div className="space-y-3 mb-4">
                  {(formData.auto_responses || []).map((response) => (
                    <div
                      key={response.id}
                      className="p-3 bg-slate-50 rounded-lg border border-slate-200"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                              {response.match_type}
                            </span>
                            <span className="text-sm font-medium text-slate-700">
                              "{response.trigger}"
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                            <span>{response.response}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveAutoResponse(response.id)}
                          className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {(formData.auto_responses || []).length === 0 && (
                    <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-lg">
                      <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-500">No auto responses configured</p>
                      <p className="text-sm text-slate-400">Add triggers and responses below</p>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-sm font-medium text-slate-700 mb-3">Add New Response</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Match Type</label>
                      <select
                        value={newResponse.match_type}
                        onChange={(e) =>
                          setNewResponse({
                            ...newResponse,
                            match_type: e.target.value as AutoResponse['match_type'],
                          })
                        }
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="contains">Contains</option>
                        <option value="exact">Exact Match</option>
                        <option value="regex">Regex</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Trigger</label>
                      <input
                        type="text"
                        value={newResponse.trigger}
                        onChange={(e) => setNewResponse({ ...newResponse, trigger: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="pricing"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Response</label>
                      <input
                        type="text"
                        value={newResponse.response}
                        onChange={(e) => setNewResponse({ ...newResponse, response: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Our pricing starts at..."
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleAddAutoResponse}
                    disabled={!newResponse.trigger || !newResponse.response}
                    className="mt-3 flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add Response
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setSelectedBot(null);
                    setIsCreating(false);
                  }}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !formData.name}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {isCreating ? 'Create Bot' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
