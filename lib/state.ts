/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { create } from 'zustand';
import { customerSupportTools } from './tools/customer-support';
import { personalAssistantTools } from './tools/personal-assistant';
import { navigationSystemTools } from './tools/navigation-system';

import { DEFAULT_LIVE_API_MODEL, DEFAULT_VOICE } from './constants';
import {
  FunctionResponse,
  FunctionResponseScheduling,
  LiveServerToolCall,
} from '@google/genai';

export const businessAssistantTools: FunctionCall[] = [
  {
    name: 'send_email',
    description: 'Sends an email to a specified recipient.',
    parameters: {
      type: 'OBJECT',
      properties: {
        recipient: {
          type: 'STRING',
          description: 'The email address of the recipient.',
        },
        subject: {
          type: 'STRING',
          description: 'The subject line of the email.',
        },
        body: {
          type: 'STRING',
          description: 'The body content of the email.',
        },
      },
      required: ['recipient', 'subject', 'body'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
  },
  {
    name: 'read_emails',
    description:
      "Reads the user's latest emails. Can be filtered by sender, subject, or read status.",
    parameters: {
      type: 'OBJECT',
      properties: {
        count: {
          type: 'NUMBER',
          description: 'The number of emails to read. Defaults to 5.',
        },
        from: {
          type: 'STRING',
          description: 'Filter emails from a specific sender.',
        },
        subject: {
          type: 'STRING',
          description: 'Filter emails with a specific subject line.',
        },
        unreadOnly: {
          type: 'BOOLEAN',
          description: 'Only read unread emails. Defaults to true.',
        },
      },
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
  },
];

export type Template =
  | 'customer-support'
  | 'personal-assistant'
  | 'navigation-system'
  | 'business-assistant';

const toolsets: Record<Template, FunctionCall[]> = {
  'customer-support': customerSupportTools,
  'personal-assistant': personalAssistantTools,
  'navigation-system': navigationSystemTools,
  'business-assistant': businessAssistantTools,
};

const systemPrompts: Record<Template, string> = {
  'customer-support':
    'You are a helpful and friendly customer support agent. Be conversational and concise.',
  'personal-assistant':
    'You are a helpful and friendly personal assistant. Be proactive and efficient.',
  'navigation-system':
    'You are a helpful and friendly navigation assistant. Provide clear and accurate directions.',
  'business-assistant':
    'You are a professional business assistant. You can manage emails and schedules. Be formal and efficient.',
};

/**
 * Settings
 */
export const useSettings = create<{
  model: string;
  setModel: (model: string) => void;
}>(set => ({
  model: DEFAULT_LIVE_API_MODEL,
  setModel: model => set({ model }),
}));

/**
 * UI
 */
export const useUI = create<{
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}>(set => ({
  isSidebarOpen: true,
  toggleSidebar: () => set(state => ({ isSidebarOpen: !state.isSidebarOpen })),
}));

/**
 * User Settings
 */
export const useUserSettings = create<{
  isGmailConnected: boolean;
  userEmail: string | null;
  personaName: string;
  rolesAndDescription: string;
  voice: string;
  connectGmail: () => void;
  disconnectGmail: () => void;
  setPersonaName: (name: string) => void;
  setRolesAndDescription: (description: string) => void;
  setVoice: (voice: string) => void;
}>(set => ({
  isGmailConnected: false,
  userEmail: null,
  personaName: 'Emilio AI',
  rolesAndDescription:
    'You are Emilio AI, a friendly and highly intelligent assistant. Your role is to be helpful, provide accurate information, and assist users with their tasks efficiently. You maintain a positive and professional demeanor at all times.',
  voice: DEFAULT_VOICE,
  connectGmail: () => {
    // In a real app, this would trigger the OAuth flow.
    // For this sandbox, we'll simulate a successful connection.
    set({ isGmailConnected: true, userEmail: 'user@example.com' });
  },
  disconnectGmail: () => set({ isGmailConnected: false, userEmail: null }),
  setPersonaName: name => set({ personaName: name }),
  setRolesAndDescription: description =>
    set({ rolesAndDescription: description }),
  setVoice: voice => set({ voice }),
}));

/**
 * Google Integration Admin Settings
 */
interface GoogleIntegrationState {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  isConfigured: boolean;
  isValidated: boolean;
  errors: {
    clientId?: string;
    clientSecret?: string;
    redirectUri?: string;
  };
  setClientId: (id: string) => void;
  setClientSecret: (secret: string) => void;
  setRedirectUri: (uri: string) => void;
  validateCredentials: () => boolean;
  saveCredentials: () => void;
}

export const useGoogleIntegrationStore = create<GoogleIntegrationState>(
  (set, get) => ({
    clientId: '',
    clientSecret: '',
    redirectUri: '',
    isConfigured: false,
    isValidated: false,
    errors: {},
    setClientId: id => set({ clientId: id, isValidated: false, errors: {} }),
    setClientSecret: secret =>
      set({ clientSecret: secret, isValidated: false, errors: {} }),
    setRedirectUri: uri =>
      set({ redirectUri: uri, isValidated: false, errors: {} }),
    validateCredentials: () => {
      const { clientId, clientSecret, redirectUri } = get();
      const newErrors: GoogleIntegrationState['errors'] = {};
      let isValid = true;

      if (!clientId) {
        newErrors.clientId = 'Client ID is required.';
        isValid = false;
      } else if (!clientId.endsWith('.apps.googleusercontent.com')) {
        newErrors.clientId =
          'Client ID must end with .apps.googleusercontent.com';
        isValid = false;
      }

      if (!clientSecret) {
        newErrors.clientSecret = 'Client Secret cannot be empty.';
        isValid = false;
      }

      if (!redirectUri) {
        newErrors.redirectUri = 'Redirect URI is required.';
        isValid = false;
      } else {
        try {
          new URL(redirectUri);
        } catch (_) {
          newErrors.redirectUri = 'Redirect URI must be a valid URL.';
          isValid = false;
        }
      }

      set({ errors: newErrors, isValidated: isValid });
      return isValid;
    },
    saveCredentials: () => {
      const isValid = get().validateCredentials();
      if (isValid) {
        // In a real app, this would be an API call to a secure backend.
        console.log('Saving credentials (simulated)...');
        set({ isConfigured: true });
      }
    },
  }),
);

/**
 * Supabase Integration Admin Settings
 */
interface SupabaseIntegrationState {
  supabaseUrl: string;
  supabaseAnonKey: string;
  isConfigured: boolean;
  isValidated: boolean;
  errors: {
    supabaseUrl?: string;
    supabaseAnonKey?: string;
  };
  setSupabaseUrl: (url: string) => void;
  setSupabaseAnonKey: (key: string) => void;
  validateCredentials: () => boolean;
  saveCredentials: () => void;
}

export const useSupabaseIntegrationStore = create<SupabaseIntegrationState>(
  (set, get) => ({
    supabaseUrl: '',
    supabaseAnonKey: '',
    isConfigured: false,
    isValidated: false,
    errors: {},
    setSupabaseUrl: url =>
      set({ supabaseUrl: url, isValidated: false, errors: {} }),
    setSupabaseAnonKey: key =>
      set({ supabaseAnonKey: key, isValidated: false, errors: {} }),
    validateCredentials: () => {
      const { supabaseUrl, supabaseAnonKey } = get();
      const newErrors: SupabaseIntegrationState['errors'] = {};
      let isValid = true;

      if (!supabaseUrl) {
        newErrors.supabaseUrl = 'Supabase URL is required.';
        isValid = false;
      } else if (
        !supabaseUrl.startsWith('https://') ||
        !supabaseUrl.endsWith('.supabase.co')
      ) {
        newErrors.supabaseUrl = 'URL must start with https:// and end with .supabase.co';
        isValid = false;
      }

      if (!supabaseAnonKey) {
        newErrors.supabaseAnonKey = 'Supabase Anon Key is required.';
        isValid = false;
      } else if ((supabaseAnonKey.match(/\./g) || []).length !== 2) {
        newErrors.supabaseAnonKey = 'Anon Key must be a valid JWT.';
        isValid = false;
      }


      set({ errors: newErrors, isValidated: isValid });
      return isValid;
    },
    saveCredentials: () => {
      const isValid = get().validateCredentials();
      if (isValid) {
        console.log('Saving Supabase credentials (simulated)...');
        set({ isConfigured: true });
      }
    },
  }),
);


/**
 * Tools
 */
export interface FunctionCall {
  name: string;
  description?: string;
  parameters?: any;
  isEnabled: boolean;
  scheduling?: FunctionResponseScheduling;
}

export const useTools = create<{
  tools: FunctionCall[];
  template: Template;
  setTemplate: (template: Template) => void;
  toggleTool: (toolName: string) => void;
  addTool: () => void;
  removeTool: (toolName: string) => void;
  updateTool: (oldName: string, updatedTool: FunctionCall) => void;
}>(set => ({
  tools: customerSupportTools,
  template: 'customer-support',
  setTemplate: (template: Template) => {
    set({ tools: toolsets[template], template });
    useUserSettings.getState().setRolesAndDescription(systemPrompts[template]);
  },
  toggleTool: (toolName: string) =>
    set(state => ({
      tools: state.tools.map(tool =>
        tool.name === toolName ? { ...tool, isEnabled: !tool.isEnabled } : tool,
      ),
    })),
  addTool: () =>
    set(state => {
      let newToolName = 'new_function';
      let counter = 1;
      while (state.tools.some(tool => tool.name === newToolName)) {
        newToolName = `new_function_${counter++}`;
      }
      return {
        tools: [
          ...state.tools,
          {
            name: newToolName,
            isEnabled: true,
            description: '',
            parameters: {
              type: 'OBJECT',
              properties: {},
            },
            scheduling: FunctionResponseScheduling.INTERRUPT,
          },
        ],
      };
    }),
  removeTool: (toolName: string) =>
    set(state => ({
      tools: state.tools.filter(tool => tool.name !== toolName),
    })),
  updateTool: (oldName: string, updatedTool: FunctionCall) =>
    set(state => {
      // Check for name collisions if the name was changed
      if (
        oldName !== updatedTool.name &&
        state.tools.some(tool => tool.name === updatedTool.name)
      ) {
        console.warn(`Tool with name "${updatedTool.name}" already exists.`);
        // Prevent the update by returning the current state
        return state;
      }
      return {
        tools: state.tools.map(tool =>
          tool.name === oldName ? updatedTool : tool,
        ),
      };
    }),
}));

/**
 * Logs
 */
export interface LiveClientToolResponse {
  functionResponses?: FunctionResponse[];
}
export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

export interface ConversationTurn {
  timestamp: Date;
  role: 'user' | 'agent' | 'system';
  text: string;
  isFinal: boolean;
  toolUseRequest?: LiveServerToolCall;
  toolUseResponse?: LiveClientToolResponse;
  groundingChunks?: GroundingChunk[];
}

export const useLogStore = create<{
  turns: ConversationTurn[];
  addTurn: (turn: Omit<ConversationTurn, 'timestamp'>) => void;
  updateLastTurn: (update: Partial<ConversationTurn>) => void;
  clearTurns: () => void;
}>((set, get) => ({
  turns: [],
  addTurn: (turn: Omit<ConversationTurn, 'timestamp'>) =>
    set(state => ({
      turns: [...state.turns, { ...turn, timestamp: new Date() }],
    })),
  updateLastTurn: (update: Partial<Omit<ConversationTurn, 'timestamp'>>) => {
    set(state => {
      if (state.turns.length === 0) {
        return state;
      }
      const newTurns = [...state.turns];
      const lastTurn = { ...newTurns[newTurns.length - 1], ...update };
      newTurns[newTurns.length - 1] = lastTurn;
      return { turns: newTurns };
    });
  },
  clearTurns: () => set({ turns: [] }),
}));