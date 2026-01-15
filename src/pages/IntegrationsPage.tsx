import { useState, useEffect } from 'react';
import { Header } from '../components/layout/Header';
import { supabase } from '../lib/supabase';
import {
  Plug,
  Plus,
  Settings,
  Trash2,
  ExternalLink,
  Check,
  X,
  AlertCircle,
  Webhook,
  Key,
  Globe,
  RefreshCw,
  Copy,
  Eye,
  EyeOff,
  Zap,
} from 'lucide-react';

interface Integration {
  id: string;
  name: string;
  type: 'webhook' | 'api' | 'crm' | 'helpdesk';
  is_active: boolean;
  config: IntegrationConfig;
  last_sync: string | null;
  created_at: string;
}

interface IntegrationConfig {
  url?: string;
  api_key?: string;
  events?: string[];
  headers?: Record<string, string>;
}

const INTEGRATION_TYPES = [
  { id: 'webhook', name: 'Webhook', icon: Webhook, description: 'Send events to external URLs' },
  { id: 'api', name: 'API', icon: Globe, description: 'Connect to external APIs' },
  { id: 'crm', name: 'CRM', icon: Zap, description: 'Sync with CRM systems' },
  { id: 'helpdesk', name: 'Helpdesk', icon: Plug, description: 'Connect helpdesk tools' },
];

const AVAILABLE_EVENTS = [
  { id: 'conversation.created', label: 'Conversation Created' },
  { id: 'conversation.resolved', label: 'Conversation Resolved' },
  { id: 'message.received', label: 'Message Received' },
  { id: 'message.sent', label: 'Message Sent' },
  { id: 'agent.assigned', label: 'Agent Assigned' },
  { id: 'customer.created', label: 'Customer Created' },
];

export function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [formData, setFormData] = useState<Partial<Integration>>({
    name: '',
    type: 'webhook',
    is_active: false,
    config: {
      url: '',
      api_key: '',
      events: [],
    },
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    const { data } = await supabase
      .from('integrations')
      .select('*')
      .order('created_at', { ascending: false });

    setIntegrations(data || []);
    setLoading(false);
  };

  const handleSelectIntegration = (integration: Integration) => {
    setSelectedIntegration(integration);
    setFormData(integration);
    setIsCreating(false);
    setTestResult(null);
    setShowApiKey(false);
  };

  const handleCreateNew = () => {
    setSelectedIntegration(null);
    setIsCreating(true);
    setFormData({
      name: '',
      type: 'webhook',
      is_active: false,
      config: {
        url: '',
        api_key: '',
        events: [],
      },
    });
    setTestResult(null);
    setShowApiKey(false);
  };

  const handleSave = async () => {
    setSaving(true);

    if (isCreating) {
      const { data, error } = await supabase
        .from('integrations')
        .insert([formData])
        .select()
        .single();

      if (!error && data) {
        setIntegrations([data, ...integrations]);
        setSelectedIntegration(data);
        setIsCreating(false);
      }
    } else if (selectedIntegration) {
      const { error } = await supabase
        .from('integrations')
        .update(formData)
        .eq('id', selectedIntegration.id);

      if (!error) {
        setIntegrations(
          integrations.map((i) =>
            i.id === selectedIntegration.id ? { ...i, ...formData } as Integration : i
          )
        );
        setSelectedIntegration({ ...selectedIntegration, ...formData } as Integration);
      }
    }

    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('integrations').delete().eq('id', id);

    if (!error) {
      setIntegrations(integrations.filter((i) => i.id !== id));
      if (selectedIntegration?.id === id) {
        setSelectedIntegration(null);
        setIsCreating(false);
      }
    }
  };

  const handleTestWebhook = async () => {
    if (!formData.config?.url) return;

    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch(formData.config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(formData.config.headers || {}),
        },
        body: JSON.stringify({
          event: 'test',
          timestamp: new Date().toISOString(),
          data: { message: 'Test webhook from ChatPortal' },
        }),
      });

      setTestResult({
        success: response.ok,
        message: response.ok
          ? `Success! Status: ${response.status}`
          : `Failed with status: ${response.status}`,
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    setTesting(false);
  };

  const handleToggleEvent = (eventId: string) => {
    const currentEvents = formData.config?.events || [];
    const newEvents = currentEvents.includes(eventId)
      ? currentEvents.filter((e) => e !== eventId)
      : [...currentEvents, eventId];

    setFormData({
      ...formData,
      config: { ...formData.config, events: newEvents },
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getTypeIcon = (type: string) => {
    const typeConfig = INTEGRATION_TYPES.find((t) => t.id === type);
    if (!typeConfig) return Plug;
    return typeConfig.icon;
  };

  return (
    <>
      <Header title="Integrations" subtitle="Connect ChatPortal with external services" />

      <div className="flex-1 overflow-hidden flex">
        <div className="w-80 border-r border-slate-200 bg-white flex flex-col">
          <div className="p-4 border-b border-slate-200">
            <button
              onClick={handleCreateNew}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Integration
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-6 h-6 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
              </div>
            ) : integrations.length === 0 ? (
              <div className="p-6 text-center">
                <Plug className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No integrations configured</p>
                <p className="text-sm text-slate-400 mt-1">Add your first integration</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {integrations.map((integration) => {
                  const TypeIcon = getTypeIcon(integration.type);
                  return (
                    <div
                      key={integration.id}
                      onClick={() => handleSelectIntegration(integration)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedIntegration?.id === integration.id
                          ? 'bg-blue-50 border border-blue-200'
                          : 'hover:bg-slate-50 border border-transparent'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              integration.is_active
                                ? 'bg-emerald-100 text-emerald-600'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            <TypeIcon className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{integration.name}</p>
                            <p className="text-xs text-slate-500 capitalize">{integration.type}</p>
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            integration.is_active
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {integration.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      {integration.last_sync && (
                        <p className="mt-2 text-xs text-slate-500">
                          Last sync: {new Date(integration.last_sync).toLocaleString()}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50">
          {!selectedIntegration && !isCreating ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Settings className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 text-lg">Select an integration to configure</p>
                <p className="text-slate-400 mt-1">Or add a new one to get started</p>
              </div>
            </div>
          ) : (
            <div className="p-6 max-w-3xl mx-auto space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-slate-900">
                    {isCreating ? 'Add New Integration' : 'Integration Settings'}
                  </h3>
                  {!isCreating && selectedIntegration && (
                    <button
                      onClick={() => handleDelete(selectedIntegration.id)}
                      className="flex items-center gap-2 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Integration Name
                    </label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="My Webhook"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Integration Type
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {INTEGRATION_TYPES.map((type) => {
                        const TypeIcon = type.icon;
                        return (
                          <button
                            key={type.id}
                            onClick={() =>
                              setFormData({ ...formData, type: type.id as Integration['type'] })
                            }
                            className={`p-3 rounded-lg border text-left transition-colors ${
                              formData.type === type.id
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <TypeIcon
                                className={`w-5 h-5 ${
                                  formData.type === type.id ? 'text-blue-600' : 'text-slate-500'
                                }`}
                              />
                              <span
                                className={`font-medium ${
                                  formData.type === type.id ? 'text-blue-900' : 'text-slate-900'
                                }`}
                              >
                                {type.name}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">{type.description}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900">Active</p>
                      <p className="text-sm text-slate-500">Enable this integration</p>
                    </div>
                    <button
                      onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        formData.is_active ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          formData.is_active ? 'translate-x-7' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {(formData.type === 'webhook' || formData.type === 'api') && (
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Connection Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        {formData.type === 'webhook' ? 'Webhook URL' : 'API Endpoint'}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={formData.config?.url || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              config: { ...formData.config, url: e.target.value },
                            })
                          }
                          className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="https://api.example.com/webhook"
                        />
                        <button
                          onClick={() => copyToClipboard(formData.config?.url || '')}
                          className="px-3 py-2 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        API Key (Optional)
                      </label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type={showApiKey ? 'text' : 'password'}
                            value={formData.config?.api_key || ''}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                config: { ...formData.config, api_key: e.target.value },
                              })
                            }
                            className="w-full px-3 py-2 pr-10 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="sk-..."
                          />
                          <button
                            type="button"
                            onClick={() => setShowApiKey(!showApiKey)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                          >
                            {showApiKey ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        <button
                          onClick={() =>
                            setFormData({
                              ...formData,
                              config: { ...formData.config, api_key: crypto.randomUUID() },
                            })
                          }
                          className="px-3 py-2 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
                        >
                          <Key className="w-4 h-4" />
                          Generate
                        </button>
                      </div>
                    </div>

                    {formData.type === 'webhook' && (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={handleTestWebhook}
                          disabled={testing || !formData.config?.url}
                          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
                        >
                          {testing ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <ExternalLink className="w-4 h-4" />
                          )}
                          Test Connection
                        </button>
                        {testResult && (
                          <div
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                              testResult.success
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-red-50 text-red-700'
                            }`}
                          >
                            {testResult.success ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <X className="w-4 h-4" />
                            )}
                            {testResult.message}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {formData.type === 'webhook' && (
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Events</h3>
                  <p className="text-sm text-slate-500 mb-4">
                    Select which events should trigger this webhook
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {AVAILABLE_EVENTS.map((event) => {
                      const isSelected = formData.config?.events?.includes(event.id);
                      return (
                        <button
                          key={event.id}
                          onClick={() => handleToggleEvent(event.id)}
                          className={`p-3 rounded-lg border text-left transition-colors ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`font-medium ${isSelected ? 'text-blue-900' : 'text-slate-700'}`}
                            >
                              {event.label}
                            </span>
                            {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                          </div>
                          <p className="text-xs text-slate-500 mt-1 font-mono">{event.id}</p>
                        </button>
                      );
                    })}
                  </div>
                  {(formData.config?.events?.length || 0) === 0 && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                      <p className="text-sm text-amber-800">
                        No events selected. The webhook won't receive any notifications.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setSelectedIntegration(null);
                    setIsCreating(false);
                  }}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !formData.name}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  {isCreating ? 'Add Integration' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
