import React, { useState } from 'react'
import Navigation from '../components/Navigation'
import Header from '../components/Header'

export default function Messages() {
  const [conversations, setConversations] = useState([
    {
      id: 1,
      name: 'Julian Vane',
      role: 'Global Portfolio Manager',
      lastMessage: 'Good morning. I\'ve reviewed the prospectus for the Skyview Residences...',
      timestamp: '2 mins ago',
      unread: true,
      image: 'https://via.placeholder.com/48x48?text=JV',
    },
    {
      id: 2,
      name: 'Elena Rostova',
      role: 'Investment Advisor',
      lastMessage: 'Thank you for the floor plans. I\'ll discuss with my team...',
      timestamp: '1 hour ago',
      unread: false,
      image: 'https://via.placeholder.com/48x48?text=ER',
    },
    {
      id: 3,
      name: 'Marcus Sterling',
      role: 'Senior Broker',
      lastMessage: 'The contract looks good. Let\'s proceed with...',
      timestamp: 'Yesterday',
      unread: false,
      image: 'https://via.placeholder.com/48x48?text=MS',
    },
  ])

  const [selectedConversation, setSelectedConversation] = useState(conversations[0])
  const [message, setMessage] = useState('')

  const handleSendMessage = () => {
    if (message.trim()) {
      setMessage('')
      // API call to send message
    }
  }

  return (
    <div className="bg-surface min-h-screen">
      <Navigation />

      <main className="md:ml-64 pb-32 md:pb-8">
        <Header title="Messages" />

        <div className="pt-20 h-screen md:h-[calc(100vh-80px)] flex overflow-hidden">
          {/* Conversation List */}
          <div className="hidden md:flex w-80 border-r border-outline-variant flex-col">
            <div className="p-4 border-b border-outline-variant">
              <input
                type="text"
                placeholder="Search conversations..."
                className="input-field"
              />
            </div>

            <div className="flex-1 overflow-y-auto">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`w-full p-4 border-b border-outline-variant text-left transition ${
                    selectedConversation.id === conv.id
                      ? 'bg-surface-container-high'
                      : 'hover:bg-surface-container'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <img
                      src={conv.image}
                      alt={conv.name}
                      className="w-12 h-12 rounded-full"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{conv.name}</p>
                      <p className="text-xs text-on-surface-variant truncate">{conv.lastMessage}</p>
                      <p className="text-xs text-on-surface-variant mt-1">{conv.timestamp}</p>
                    </div>
                    {conv.unread && (
                      <div className="w-2 h-2 rounded-full bg-secondary mt-1"></div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            {/* Chat Header */}
            <div className="border-b border-outline-variant p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={selectedConversation.image}
                  alt={selectedConversation.name}
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <p className="font-semibold">{selectedConversation.name}</p>
                  <p className="text-xs text-on-surface-variant">{selectedConversation.role}</p>
                </div>
              </div>
              <button className="p-2 hover:bg-surface-container-high rounded-md">
                <span className="material-symbols-outlined">more_vert</span>
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="flex justify-start">
                <div className="max-w-xs glass-card p-4 rounded-lg">
                  <p>Good morning. I've reviewed the prospectus for the Skyview Residences. The architectural narrative is compelling...</p>
                </div>
              </div>
              <div className="flex justify-end">
                <div className="max-w-xs bg-secondary/20 p-4 rounded-lg">
                  <p>Absolutely. The integration of modern design with contextual sensitivity is impressive.</p>
                </div>
              </div>
            </div>

            {/* Message Input */}
            <div className="border-t border-outline-variant p-4 flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type a message..."
                className="input-field"
              />
              <button
                onClick={handleSendMessage}
                className="btn-primary px-4"
              >
                <span className="material-symbols-outlined">send</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
