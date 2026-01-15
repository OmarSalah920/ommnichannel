import { useState, useEffect } from 'react';
import { Header } from '../components/layout/Header';
import { supabase } from '../lib/supabase';
import { getWebhookUrl, testChannelConnection } from '../lib/channelService';
import type { Channel } from '../types/database';
import {
  Radio,
  Phone,
  MessageCircle,
  Instagram,
  Settings,
  Check,
  X,
  RefreshCw,
  ExternalLink,
  Copy,
  CheckCircle,
  AlertCircle,
  Link,
  Zap,
} from 'lucide-react';

type ChannelType = 'whatsapp' | 'messenger' | 'instagram';

interface AvailableChannel {
  type: ChannelType;
  name: string;
  description: string;
}

const AVAILABLE_CHANNELS: AvailableChannel[] = [
  { type: 'whatsapp', name: 'WhatsApp Business', description: 'Connect with customers via WhatsApp Business API' },
  { type: 'messenger', name: 'Facebook Messenger', description: 'Receive messages from your Facebook Page' },
  { type: 'instagram', name: 'Instagram Direct', description: 'Handle Instagram Direct messages' },
];

export function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; error?: string }>>({});
  const [copiedWebhook, setCopiedWebhook] = useState<string | null>(null);
  const [addingChannel, setAddingChannel] = useState<ChannelType | null>(null);

  useEffect(() => {
    fetchChannels();
  }, []);

  const fetchChannels = async () => {
    const { data, error } = await supabase.from('channels').select('*').order('name');

    if (error) {
      console.error('Error fetching channels:', error);
    } else {
      setChannels(data || []);
    }
    setLoading(false);
  };

  const handleToggleChannel = async (channel: Channel) => {
    const { error } = await supabase
      .from('channels')
      .update({ is_active: !channel.is_active })
      .eq('id', channel.id);

    if (!error) {
      fetchChannels();
    }
  };

  const handleSaveConfiguration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChannel) return;

    setSaving(true);
    const formData = new FormData(e.target as HTMLFormElement);
    const config: Record<string, string> = {};
    formData.forEach((value, key) => {
      config[key] = value.toString();
    });

    const { error } = await supabase
      .from('channels')
      .update({ config })
      .eq('id', selectedChannel.id);

    if (!error) {
      setSelectedChannel(null);
      fetchChannels();
    }
    setSaving(false);
  };

  const handleTestConnection = async (channel: Channel) => {
    setTesting(channel.id);
    const result = await testChannelConnection(channel.id);
    setTestResults((prev) => ({ ...prev, [channel.id]: result }));
    setTesting(null);
  };

  const copyWebhookUrl = (channelType: string) => {
    const url = getWebhookUrl(channelType);
    navigator.clipboard.writeText(url);
    setCopiedWebhook(channelType);
    setTimeout(() => setCopiedWebhook(null), 2000);
  };

  const handleAddChannel = async (type: ChannelType) => {
    setAddingChannel(type);
    const channelData = AVAILABLE_CHANNELS.find((c) => c.type === type);
    if (!channelData) return;

    const { data, error } = await supabase
      .from('channels')
      .insert({
        type,
        name: channelData.name,
        config: {},
        is_active: false,
      })
      .select()
      .single();

    setAddingChannel(null);

    if (error) {
      console.error('Error creating channel:', error);
      return;
    }

    await fetchChannels();
    setSelectedChannel(data);
  };

  const isChannelConfigured = (channel: Channel): boolean => {
    const config = channel.config as Record<string, string>;
    switch (channel.type) {
      case 'whatsapp':
        return !!(config?.gupshup_api_key && config?.gupshup_app_name && config?.gupshup_app_id && config?.source_phone);
      case 'messenger':
        return !!(config?.page_id && config?.page_access_token);
      case 'instagram':
        return !!(config?.instagram_account_id && config?.page_access_token);
      default:
        return false;
    }
  };

  const channelIcons: Record<string, React.ReactNode> = {
    whatsapp: <Phone className="w-6 h-6" />,
    messenger: <MessageCircle className="w-6 h-6" />,
    instagram: <Instagram className="w-6 h-6" />,
  };

  const channelColors: Record<string, string> = {
    whatsapp: 'bg-emerald-500',
    messenger: 'bg-blue-500',
    instagram: 'bg-gradient-to-br from-pink-500 to-orange-500',
  };

  const channelDescriptions: Record<string, string> = {
    whatsapp: 'Connect with customers via WhatsApp Business API',
    messenger: 'Receive messages from your Facebook Page',
    instagram: 'Handle Instagram Direct messages',
  };

  const getConfigFields = (type: string) => {
    switch (type) {
      case 'whatsapp':
        return [
          { key: 'gupshup_api_key', label: 'Gupshup API Key', type: 'password', help: 'API Key from Gupshup Dashboard' },
          { key: 'gupshup_app_name', label: 'App Name', type: 'text', help: 'Your Gupshup App Name' },
          { key: 'gupshup_app_id', label: 'App ID', type: 'text', help: 'Your Gupshup App ID (found in your Gupshup Dashboard)' },
          { key: 'source_phone', label: 'Source Phone Number', type: 'text', help: 'WhatsApp phone number (with country code, e.g., 919876543210)' },
        ];
      case 'messenger':
        return [
          { key: 'page_id', label: 'Page ID', type: 'text', help: 'Your Facebook Page ID' },
          { key: 'page_access_token', label: 'Page Access Token', type: 'password', help: 'Page access token with messaging permissions' },
          { key: 'app_secret', label: 'App Secret', type: 'password', help: 'Your Facebook App secret for signature verification' },
        ];
      case 'instagram':
        return [
          { key: 'instagram_account_id', label: 'Instagram Account ID', type: 'text', help: 'Instagram Professional Account ID' },
          { key: 'page_access_token', label: 'Page Access Token', type: 'password', help: 'Page access token linked to Instagram account' },
          { key: 'app_secret', label: 'App Secret', type: 'password', help: 'Your Facebook App secret for signature verification' },
        ];
      default:
        return [];
    }
  };

  return (
    <>
      <Header title="Channels" subtitle="Configure your messaging channel integrations" />

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-4 md:space-y-6">
            <div className="bg-white dark:bg-surface-dark-secondary rounded-xl border border-slate-200 dark:border-gray-700 p-4 md:p-6">
              <div className="flex items-center gap-2 mb-4 md:mb-6">
                <Radio className="w-5 h-5 text-slate-500 dark:text-text-dark-secondary" />
                <h3 className="font-semibold text-slate-900 dark:text-text-dark-primary">Available Channels</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {AVAILABLE_CHANNELS.map((availableChannel) => {
                  const existingChannel = channels.find((c) => c.type === availableChannel.type);
                  const configured = existingChannel ? isChannelConfigured(existingChannel) : false;
                  const testResult = existingChannel ? testResults[existingChannel.id] : null;

                  return (
                    <div
                      key={availableChannel.type}
                      className={`relative p-6 rounded-xl border-2 transition-all ${
                        existingChannel?.is_active
                          ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800'
                          : 'border-slate-200 dark:border-gray-700 hover:border-slate-300 dark:hover:border-gray-600 bg-white dark:bg-surface-dark-tertiary'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div
                          className={`w-14 h-14 rounded-xl flex items-center justify-center text-white ${
                            channelColors[availableChannel.type]
                          }`}
                        >
                          {channelIcons[availableChannel.type]}
                        </div>
                        {existingChannel && (
                          <button
                            onClick={() => handleToggleChannel(existingChannel)}
                            disabled={!configured}
                            title={!configured ? 'Configure the channel before activating' : ''}
                            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                              existingChannel.is_active ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-gray-600'
                            } ${!configured ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                            <span
                              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform ${
                                existingChannel.is_active ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        )}
                      </div>

                      <h4 className="font-semibold text-slate-900 dark:text-text-dark-primary mb-1">
                        {availableChannel.name}
                      </h4>
                      <p className="text-sm text-slate-500 dark:text-text-dark-secondary mb-4">
                        {availableChannel.description}
                      </p>

                      <div className="space-y-2">
                        {existingChannel ? (
                          <>
                            <div className="flex items-center gap-2">
                              {configured ? (
                                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-sm">
                                  <CheckCircle className="w-4 h-4" />
                                  Configured
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 text-sm">
                                  <AlertCircle className="w-4 h-4" />
                                  Not configured
                                </span>
                              )}
                            </div>

                            {existingChannel.is_active && (
                              <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-sm">
                                <Zap className="w-4 h-4" />
                                Active
                              </div>
                            )}

                            {testResult && (
                              <div
                                className={`flex items-center gap-1 text-sm ${
                                  testResult.success
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-red-600 dark:text-red-400'
                                }`}
                              >
                                {testResult.success ? (
                                  <>
                                    <Check className="w-4 h-4" />
                                    Connection verified
                                  </>
                                ) : (
                                  <>
                                    <X className="w-4 h-4" />
                                    {testResult.error || 'Connection failed'}
                                  </>
                                )}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="flex items-center gap-1 text-slate-500 dark:text-text-dark-secondary text-sm">
                            <AlertCircle className="w-4 h-4" />
                            Not added
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-gray-700">
                        {existingChannel ? (
                          <>
                            <button
                              onClick={() => setSelectedChannel(existingChannel)}
                              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-slate-600 dark:text-text-dark-secondary hover:text-slate-900 dark:hover:text-text-dark-primary hover:bg-slate-100 dark:hover:bg-surface-dark-primary rounded-lg transition-colors"
                            >
                              <Settings className="w-4 h-4" />
                              Configure
                            </button>
                            {configured && (
                              <button
                                onClick={() => handleTestConnection(existingChannel)}
                                disabled={testing === existingChannel.id}
                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors disabled:opacity-50"
                              >
                                {testing === existingChannel.id ? (
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Zap className="w-4 h-4" />
                                )}
                                Test
                              </button>
                            )}
                          </>
                        ) : (
                          <button
                            onClick={() => handleAddChannel(availableChannel.type)}
                            disabled={addingChannel === availableChannel.type}
                            className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium text-white bg-maqsam-coral hover:bg-maqsam-coral-dark rounded-lg transition-colors disabled:opacity-50"
                          >
                            {addingChannel === availableChannel.type ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Adding...
                              </>
                            ) : (
                              <>
                                <Settings className="w-4 h-4" />
                                Add Channel
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white dark:bg-surface-dark-secondary rounded-xl border border-slate-200 dark:border-gray-700 p-4 md:p-6">
              <div className="flex items-center gap-2 mb-4">
                <Link className="w-5 h-5 text-slate-500 dark:text-text-dark-secondary" />
                <h3 className="font-semibold text-slate-900 dark:text-text-dark-primary">Webhook URLs</h3>
              </div>
              <p className="text-sm text-slate-500 dark:text-text-dark-secondary mb-4">
                Configure these webhook URLs in your Meta Developer Portal to receive incoming messages.
              </p>

              <div className="space-y-3">
                {AVAILABLE_CHANNELS.map((availableChannel) => (
                  <div
                    key={availableChannel.type}
                    className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-surface-dark-tertiary rounded-lg"
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${
                        channelColors[availableChannel.type]
                      }`}
                    >
                      {channelIcons[availableChannel.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-text-dark-primary">
                        {availableChannel.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-text-dark-secondary font-mono truncate">
                        {getWebhookUrl(availableChannel.type)}
                      </p>
                    </div>
                    <button
                      onClick={() => copyWebhookUrl(availableChannel.type)}
                      className="p-2 text-slate-500 dark:text-text-dark-secondary hover:text-slate-700 dark:hover:text-text-dark-primary hover:bg-slate-200 dark:hover:bg-surface-dark-primary rounded-lg transition-colors"
                      title="Copy webhook URL"
                    >
                      {copiedWebhook === availableChannel.type ? (
                        <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-surface-dark-secondary rounded-xl border border-slate-200 dark:border-gray-700 p-4 md:p-6">
              <h3 className="font-semibold text-slate-900 dark:text-text-dark-primary mb-4">Integration Guide</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-surface-dark-tertiary rounded-lg">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-lg flex items-center justify-center font-semibold">
                    1
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 dark:text-text-dark-primary mb-1">
                      Set up Messaging Accounts
                    </h4>
                    <p className="text-sm text-slate-500 dark:text-text-dark-secondary">
                      <strong>WhatsApp:</strong> Create a Gupshup account and set up your WhatsApp Business integration.<br />
                      <strong>Messenger/Instagram:</strong> Create a Meta Business account and set up your integration in the Meta Developer Portal.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-surface-dark-tertiary rounded-lg">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-lg flex items-center justify-center font-semibold">
                    2
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 dark:text-text-dark-primary mb-1">Configure Webhook</h4>
                    <p className="text-sm text-slate-500 dark:text-text-dark-secondary">
                      Copy the webhook URL from above and paste it in your Gupshup Dashboard (for WhatsApp) or Meta App's webhook settings (for Messenger/Instagram).
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-surface-dark-tertiary rounded-lg">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-lg flex items-center justify-center font-semibold">
                    3
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 dark:text-text-dark-primary mb-1">Enter API Credentials</h4>
                    <p className="text-sm text-slate-500 dark:text-text-dark-secondary">
                      Click "Add Channel" to add a channel, then click "Configure" and enter your credentials:<br />
                      <strong>WhatsApp:</strong> Gupshup API Key, App Name, and Source Phone Number<br />
                      <strong>Messenger/Instagram:</strong> Access tokens and IDs from Meta Developer Portal
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-surface-dark-tertiary rounded-lg">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-lg flex items-center justify-center font-semibold">
                    4
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 dark:text-text-dark-primary mb-1">Activate the Channel</h4>
                    <p className="text-sm text-slate-500 dark:text-text-dark-secondary">
                      Once configured and tested, toggle the channel to active. You'll start receiving
                      messages in your inbox immediately.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 mt-4">
                <a
                  href="https://docs.gupshup.io/docs/whatsapp-api-documentation"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
                >
                  Gupshup WhatsApp Docs
                  <ExternalLink className="w-4 h-4" />
                </a>
                <a
                  href="https://developers.facebook.com/docs/messenger-platform/getting-started"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
                >
                  Messenger Docs
                  <ExternalLink className="w-4 h-4" />
                </a>
                <a
                  href="https://developers.facebook.com/docs/instagram-api/guides/messaging"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
                >
                  Instagram Docs
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedChannel && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-surface-dark-secondary rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-slate-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-surface-dark-secondary">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-white ${
                    channelColors[selectedChannel.type]
                  }`}
                >
                  {channelIcons[selectedChannel.type]}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-text-dark-primary">
                    {selectedChannel.name}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-text-dark-secondary">
                    Configure integration settings
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedChannel(null)}
                className="p-1.5 text-slate-400 dark:text-text-dark-secondary hover:text-slate-600 dark:hover:text-text-dark-primary hover:bg-slate-100 dark:hover:bg-surface-dark-tertiary rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveConfiguration} className="p-4 space-y-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">Webhook URL</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs text-blue-700 dark:text-blue-400 break-all">
                    {getWebhookUrl(selectedChannel.type)}
                  </code>
                  <button
                    type="button"
                    onClick={() => copyWebhookUrl(selectedChannel.type)}
                    className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
                  >
                    {copiedWebhook === selectedChannel.type ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {getConfigFields(selectedChannel.type).map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-slate-700 dark:text-text-dark-primary mb-1.5">
                    {field.label}
                  </label>
                  <input
                    type={field.type}
                    name={field.key}
                    defaultValue={
                      (selectedChannel.config as Record<string, string>)?.[field.key] || ''
                    }
                    className="w-full px-3 py-2 border border-slate-200 dark:border-gray-600 bg-white dark:bg-surface-dark-tertiary text-slate-900 dark:text-text-dark-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400"
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                  />
                  <p className="text-xs text-slate-500 dark:text-text-dark-secondary mt-1">{field.help}</p>
                </div>
              ))}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedChannel(null)}
                  className="flex-1 px-4 py-2 border border-slate-200 dark:border-gray-600 text-slate-700 dark:text-text-dark-primary rounded-lg hover:bg-slate-50 dark:hover:bg-surface-dark-tertiary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
