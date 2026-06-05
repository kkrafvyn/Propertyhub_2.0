import { create } from 'zustand'

// Auth Store
export const useAuthStore = create((set) => ({
  user: null,
  isLoading: false,
  error: null,

  setUser: (user) => set({ user }),
  logout: () => set({ user: null }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}))

// Properties Store
export const usePropertyStore = create((set) => ({
  properties: [],
  selectedProperty: null,
  favorites: [],
  isLoading: false,
  error: null,

  setProperties: (properties) => set({ properties }),
  setSelectedProperty: (property) => set({ selectedProperty: property }),
  addFavorite: (propertyId) =>
    set((state) => ({
      favorites: [...state.favorites, propertyId],
    })),
  removeFavorite: (propertyId) =>
    set((state) => ({
      favorites: state.favorites.filter((id) => id !== propertyId),
    })),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}))

// Messages Store
export const useMessageStore = create((set) => ({
  conversations: [],
  selectedConversation: null,
  messages: [],
  isLoading: false,

  setConversations: (conversations) => set({ conversations }),
  setSelectedConversation: (conversation) => set({ selectedConversation: conversation }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),
  setLoading: (isLoading) => set({ isLoading }),
}))

// UI Store
export const useUIStore = create((set) => ({
  sidebarOpen: true,
  notifications: [],
  darkMode: true,

  toggleSidebar: () =>
    set((state) => ({
      sidebarOpen: !state.sidebarOpen,
    })),
  addNotification: (notification) =>
    set((state) => ({
      notifications: [...state.notifications, notification],
    })),
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
  setDarkMode: (darkMode) => set({ darkMode }),
}))
