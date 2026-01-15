import { useState, useEffect, useRef } from 'react';
import {
  UserPlus,
  Flag,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  ChevronDown,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Conversation } from '../../types/database';

interface Agent {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
}

interface ConversationActionsProps {
  conversation: Conversation;
  onUpdate: () => void;
}

export function ConversationActions({ conversation, onUpdate }: ConversationActionsProps) {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [showAssignMenu, setShowAssignMenu] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const statusRef = useRef<HTMLDivElement>(null);
  const priorityRef = useRef<HTMLDivElement>(null);
  const assignRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAgents();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (statusRef.current && !statusRef.current.contains(event.target as Node)) {
        setShowStatusMenu(false);
      }
      if (priorityRef.current && !priorityRef.current.contains(event.target as Node)) {
        setShowPriorityMenu(false);
      }
      if (assignRef.current && !assignRef.current.contains(event.target as Node)) {
        setShowAssignMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchAgents = async () => {
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .in('role', ['agent', 'supervisor', 'admin'])
      .order('full_name');

    if (data) setAgents(data);
  };

  const handleUpdateStatus = async (status: string) => {
    await supabase.from('conversations').update({ status }).eq('id', conversation.id);
    setShowStatusMenu(false);
    onUpdate();
  };

  const handleUpdatePriority = async (priority: string) => {
    await supabase.from('conversations').update({ priority }).eq('id', conversation.id);
    setShowPriorityMenu(false);
    onUpdate();
  };

  const handleAssign = async (agentId: string | null) => {
    await supabase.from('conversations').update({ assigned_agent_id: agentId }).eq('id', conversation.id);
    setShowAssignMenu(false);
    onUpdate();
  };

  const statusOptions = [
    { value: 'new', label: 'New', icon: Clock, color: 'text-gray-600' },
    { value: 'open', label: 'Open', icon: Clock, color: 'text-emerald-600' },
    { value: 'pending', label: 'Pending', icon: Clock, color: 'text-amber-600' },
    { value: 'resolved', label: 'Resolved', icon: CheckCircle, color: 'text-blue-600' },
    { value: 'closed', label: 'Closed', icon: XCircle, color: 'text-gray-500' },
  ];

  const priorityOptions = [
    { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
    { value: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    { value: 'high', label: 'High', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  ];

  const currentStatus = statusOptions.find((s) => s.value === conversation.status);
  const currentPriority = priorityOptions.find((p) => p.value === conversation.priority);
  const CurrentStatusIcon = currentStatus?.icon || Clock;

  return (
    <div className="flex items-center gap-2">
      <div className="relative" ref={assignRef}>
        <button
          onClick={() => setShowAssignMenu(!showAssignMenu)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-secondary dark:text-text-dark-secondary hover:text-text-primary dark:hover:text-text-dark-primary hover:bg-surface-tertiary dark:hover:bg-surface-dark-tertiary rounded-lg transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          <span className="hidden sm:inline">{conversation.assigned_agent_id ? 'Reassign' : 'Assign'}</span>
          <ChevronDown className="w-3.5 h-3.5" />
        </button>

        {showAssignMenu && (
          <div className="absolute top-full right-0 mt-1 w-64 bg-white dark:bg-surface-dark-secondary rounded-xl border border-gray-100 dark:border-gray-700 shadow-strong z-50 overflow-hidden animate-slide-up">
            <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
              <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Assign to</p>
            </div>
            <div className="max-h-48 overflow-y-auto scrollbar-thin py-1">
              <button
                onClick={() => handleAssign(null)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-surface-tertiary dark:hover:bg-surface-dark-tertiary flex items-center gap-2 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <Users className="w-4 h-4 text-text-tertiary" />
                </div>
                <span className="text-text-secondary dark:text-text-dark-secondary">Unassigned</span>
              </button>
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => handleAssign(agent.id)}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-surface-tertiary dark:hover:bg-surface-dark-tertiary flex items-center gap-2 transition-colors ${
                    conversation.assigned_agent_id === agent.id ? 'bg-maqsam-coral/5' : ''
                  }`}
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-maqsam-dark to-gray-600 flex items-center justify-center text-white text-xs font-medium">
                    {agent.full_name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="font-medium text-text-primary dark:text-text-dark-primary">{agent.full_name || 'Unnamed'}</p>
                    <p className="text-xs text-text-tertiary">{agent.email}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="relative" ref={statusRef}>
        <button
          onClick={() => setShowStatusMenu(!showStatusMenu)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors hover:bg-surface-tertiary dark:hover:bg-surface-dark-tertiary ${
            currentStatus?.color || 'text-text-secondary'
          }`}
        >
          <CurrentStatusIcon className="w-4 h-4" />
          <span className="hidden sm:inline capitalize">{conversation.status}</span>
          <ChevronDown className="w-3.5 h-3.5" />
        </button>

        {showStatusMenu && (
          <div className="absolute top-full right-0 mt-1 w-40 bg-white dark:bg-surface-dark-secondary rounded-xl border border-gray-100 dark:border-gray-700 shadow-strong z-50 overflow-hidden animate-slide-up py-1">
            {statusOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  onClick={() => handleUpdateStatus(option.value)}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-surface-tertiary dark:hover:bg-surface-dark-tertiary flex items-center gap-2 transition-colors ${
                    conversation.status === option.value ? 'bg-maqsam-coral/5' : ''
                  } ${option.color}`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="relative" ref={priorityRef}>
        <button
          onClick={() => setShowPriorityMenu(!showPriorityMenu)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${currentPriority?.color}`}
        >
          <Flag className="w-4 h-4" />
          <span className="hidden sm:inline capitalize">{conversation.priority}</span>
          <ChevronDown className="w-3.5 h-3.5" />
        </button>

        {showPriorityMenu && (
          <div className="absolute top-full right-0 mt-1 w-36 bg-white dark:bg-surface-dark-secondary rounded-xl border border-gray-100 dark:border-gray-700 shadow-strong z-50 overflow-hidden animate-slide-up py-1">
            {priorityOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleUpdatePriority(option.value)}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-surface-tertiary dark:hover:bg-surface-dark-tertiary flex items-center gap-2 transition-colors ${
                  conversation.priority === option.value ? 'bg-maqsam-coral/5' : ''
                }`}
              >
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${option.color}`}>
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
