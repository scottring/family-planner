import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import api from '../services/api';
import io from 'socket.io-client';

// WebSocket connection for real-time collaboration
let socket = null;

export const usePlanningStore = create(
  subscribeWithSelector((set, get) => ({
    // Session state
    currentSession: null,
    isSessionActive: false,
    sessionProgress: {},
    connectedPartners: [],
    lastSaved: null,
    autoSaveEnabled: true,
    
    // Real-time collaboration
    socket: null,
    isConnected: false,
    
    // Session operations
    startSession: async (sessionData) => {
      try {
        const response = await api.post('/planning-session/start', sessionData);
        const session = response.data;
        
        set({ 
          currentSession: session,
          isSessionActive: true,
          sessionProgress: session.progress || {},
          lastSaved: new Date().toISOString()
        });
        
        // Initialize WebSocket for real-time collaboration
        get().initializeWebSocket(session.id);
        
        // If this was a resumed session, indicate that to the user
        if (session.resumed) {
          console.log('Resumed existing planning session:', session.id);
        }
        
        return session;
      } catch (error) {
        console.error('Failed to start planning session:', error);
        throw error;
      }
    },
    
    pauseSession: async () => {
      try {
        const { currentSession } = get();
        if (!currentSession) return;
        
        await api.post(`/planning-session/${currentSession.id}/pause`);
        
        set({ 
          isSessionActive: false 
        });
        
        // Save current progress
        await get().saveProgress();
      } catch (error) {
        console.error('Failed to pause session:', error);
        throw error;
      }
    },
    
    resumeSession: async () => {
      try {
        const { currentSession } = get();
        if (!currentSession) return;
        
        await api.post(`/planning-session/${currentSession.id}/resume`);
        
        set({ 
          isSessionActive: true 
        });
        
        // Re-initialize WebSocket
        get().initializeWebSocket(currentSession.id);
      } catch (error) {
        console.error('Failed to resume session:', error);
        throw error;
      }
    },
    
    completeSession: async () => {
      try {
        const { currentSession } = get();
        if (!currentSession) return;
        
        // Save final progress
        await get().saveProgress();
        
        // Mark session as complete
        const response = await api.post(`/planning-session/${currentSession.id}/complete`);
        
        set({ 
          currentSession: null,
          isSessionActive: false,
          sessionProgress: {},
          connectedPartners: []
        });
        
        // Disconnect WebSocket
        get().disconnectWebSocket();
        
        return response.data;
      } catch (error) {
        console.error('Failed to complete session:', error);
        throw error;
      }
    },
    
    cancelSession: async () => {
      try {
        const { currentSession } = get();
        if (!currentSession) return;
        
        // Cancel session on server
        const response = await api.post(`/planning-session/${currentSession.id}/cancel`);
        
        set({ 
          currentSession: null,
          isSessionActive: false,
          sessionProgress: {},
          connectedPartners: []
        });
        
        // Disconnect WebSocket
        get().disconnectWebSocket();
        
        return response.data;
      } catch (error) {
        console.error('Failed to cancel session:', error);
        throw error;
      }
    },
    
    saveProgress: async () => {
      try {
        const { currentSession, sessionProgress } = get();
        if (!currentSession) return;
        
        const response = await api.post(`/planning-session/${currentSession.id}/save`, {
          progress: sessionProgress,
          timestamp: new Date().toISOString()
        });
        
        set({ 
          lastSaved: new Date().toISOString() 
        });
        
        // Broadcast progress to connected partners
        if (get().socket) {
          get().socket.emit('progress-update', {
            sessionId: currentSession.id,
            progress: sessionProgress,
            timestamp: new Date().toISOString()
          });
        }
        
        return response.data;
      } catch (error) {
        console.error('Failed to save progress:', error);
        throw error;
      }
    },
    
    loadSession: async (sessionId) => {
      try {
        // If no sessionId provided, try to load the most recent session
        const endpoint = sessionId 
          ? `/planning-session/${sessionId}`
          : '/planning-session/latest';
          
        const response = await api.get(endpoint);
        
        if (response.data) {
          set({ 
            currentSession: response.data,
            isSessionActive: response.data.status === 'active',
            sessionProgress: response.data.progress || {}
          });
          
          // Initialize WebSocket if session is active
          if (response.data.status === 'active') {
            get().initializeWebSocket(response.data.id);
          }
        }
        
        return response.data;
      } catch (error) {
        console.error('Failed to load session:', error);
        // Don't throw - it's okay if there's no session to load
        return null;
      }
    },
    
    // Progress tracking
    updateQuadrantProgress: (quadrantId, progress) => {
      set(state => ({
        sessionProgress: {
          ...state.sessionProgress,
          [quadrantId]: {
            ...state.sessionProgress[quadrantId],
            progress: progress,
            lastUpdated: new Date().toISOString()
          }
        }
      }));
      
      // Auto-save if enabled
      if (get().autoSaveEnabled) {
        setTimeout(() => get().saveProgress(), 2000);
      }
    },
    
    setQuadrantData: (quadrantId, data) => {
      set(state => ({
        sessionProgress: {
          ...state.sessionProgress,
          [quadrantId]: {
            ...state.sessionProgress[quadrantId],
            ...data,
            lastUpdated: new Date().toISOString()
          }
        }
      }));
    },
    
    // Analytics and insights
    getWeeklyAnalytics: async (startDate, endDate, memberId = null) => {
      try {
        const params = new URLSearchParams({
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString()
        });
        
        if (memberId && memberId !== 'all') {
          params.append('member_id', memberId);
        }
        
        const response = await api.get(`/planning-session/analytics?${params.toString()}`);
        return response.data;
      } catch (error) {
        console.error('Failed to fetch weekly analytics:', error);
        throw error;
      }
    },
    
    // Real-time WebSocket functions
    initializeWebSocket: (sessionId) => {
      try {
        if (socket) {
          socket.disconnect();
        }
        
        socket = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:11001', {
          withCredentials: true,
          transports: ['websocket', 'polling']
        });
        
        socket.on('connect', () => {
          console.log('Connected to planning session WebSocket');
          set({ 
            socket,
            isConnected: true 
          });
          
          // Join the session room
          socket.emit('join-planning-session', sessionId);
        });
        
        socket.on('disconnect', () => {
          console.log('Disconnected from planning session WebSocket');
          set({ 
            isConnected: false 
          });
        });
        
        // Handle partner connections
        socket.on('partner-joined', (partnerData) => {
          set(state => ({
            connectedPartners: [
              ...state.connectedPartners.filter(p => p.id !== partnerData.id),
              partnerData
            ]
          }));
        });
        
        socket.on('partner-left', (partnerId) => {
          set(state => ({
            connectedPartners: state.connectedPartners.filter(p => p.id !== partnerId)
          }));
        });
        
        // Handle real-time progress updates
        socket.on('progress-updated', (data) => {
          if (data.sessionId === sessionId) {
            set(state => ({
              sessionProgress: {
                ...state.sessionProgress,
                ...data.progress
              }
            }));
          }
        });
        
        // Handle quadrant changes from partners
        socket.on('quadrant-changed', (data) => {
          if (data.sessionId === sessionId) {
            set(state => ({
              sessionProgress: {
                ...state.sessionProgress,
                [data.quadrantId]: {
                  ...state.sessionProgress[data.quadrantId],
                  ...data.updates,
                  updatedBy: data.userId,
                  lastUpdated: data.timestamp
                }
              }
            }));
          }
        });
        
        // Handle session events
        socket.on('session-paused', () => {
          set({ isSessionActive: false });
        });
        
        socket.on('session-resumed', () => {
          set({ isSessionActive: true });
        });
        
        socket.on('session-completed', () => {
          set({ 
            currentSession: null,
            isSessionActive: false,
            sessionProgress: {},
            connectedPartners: []
          });
          get().disconnectWebSocket();
        });
        
        set({ socket });
        
      } catch (error) {
        console.error('Failed to initialize WebSocket:', error);
      }
    },
    
    disconnectWebSocket: () => {
      if (socket) {
        socket.disconnect();
        socket = null;
      }
      set({ 
        socket: null,
        isConnected: false,
        connectedPartners: []
      });
    },
    
    // Real-time collaboration functions
    broadcastQuadrantUpdate: (quadrantId, updates) => {
      if (get().socket && get().currentSession) {
        get().socket.emit('quadrant-update', {
          sessionId: get().currentSession.id,
          quadrantId,
          updates,
          timestamp: new Date().toISOString()
        });
      }
    },
    
    claimItem: async (itemType, itemId) => {
      try {
        const response = await api.post('/planning-session/claim-item', {
          item_type: itemType,
          item_id: itemId,
          session_id: get().currentSession?.id
        });
        
        // Broadcast claim to partners
        if (get().socket) {
          get().socket.emit('item-claimed', {
            sessionId: get().currentSession.id,
            itemType,
            itemId,
            claimedBy: response.data.claimedBy,
            timestamp: new Date().toISOString()
          });
        }
        
        return response.data;
      } catch (error) {
        console.error('Failed to claim item:', error);
        throw error;
      }
    },
    
    // Session settings
    updateSessionSettings: (settings) => {
      set(state => ({
        currentSession: {
          ...state.currentSession,
          settings: {
            ...state.currentSession?.settings,
            ...settings
          }
        }
      }));
      
      // Apply settings
      if (settings.autoSave !== undefined) {
        set({ autoSaveEnabled: settings.autoSave });
      }
    },
    
    // Cleanup function
    cleanup: () => {
      get().disconnectWebSocket();
      set({
        currentSession: null,
        isSessionActive: false,
        sessionProgress: {},
        connectedPartners: [],
        lastSaved: null
      });
    }
  }))
);

// Auto-save subscription
usePlanningStore.subscribe(
  (state) => state.sessionProgress,
  (sessionProgress) => {
    const { autoSaveEnabled, isSessionActive, saveProgress } = usePlanningStore.getState();
    
    if (autoSaveEnabled && isSessionActive && Object.keys(sessionProgress).length > 0) {
      // Debounced auto-save
      clearTimeout(window.planningSaveTimeout);
      window.planningSaveTimeout = setTimeout(() => {
        saveProgress().catch(console.error);
      }, 5000);
    }
  }
);

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    usePlanningStore.getState().cleanup();
  });
}