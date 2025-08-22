import React, { useState } from 'react';
import { useAnonymousAuth } from './hooks/useAnonymousAuth';
import { ThemeProvider } from './context/ThemeContext';
import WaitingRoom from './components/WaitingRoom';
import ChatRoom from './components/ChatRoom';
import ThemeToggle from './components/ThemeToggle';
import { Loader2 } from 'lucide-react';

function App() {
  const { user, loading, error } = useAnonymousAuth();
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);

  const handleMatch = (roomId: string) => {
    setCurrentRoomId(roomId);
  };

  const handleDisconnect = () => {
    setCurrentRoomId(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600 dark:text-gray-300">Connecting to chat...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg text-center">
          <h2 className="text-xl font-bold text-red-500 mb-2">Connection Error</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">{error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600 dark:text-gray-300">Authenticating...</p>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col">
        <header className="bg-white dark:bg-gray-800 shadow-sm py-2 px-4">
          <div className="container mx-auto flex justify-end">
            <ThemeToggle />
          </div>
        </header>
        
        <main className="flex-1 container mx-auto p-4 flex items-center justify-center">
          {currentRoomId ? (
            <ChatRoom 
              roomId={currentRoomId}
              userId={user.uid}
              onDisconnect={handleDisconnect}
            />
          ) : (
            <WaitingRoom 
              userId={user.uid}
              onMatch={handleMatch}
            />
          )}
        </main>
        
        <footer className="py-4 text-center text-gray-500 dark:text-gray-400 text-sm">
          <p>© {new Date().getFullYear()} Anonymous Chat. All chats are private and not stored.</p>
        </footer>
      </div>
    </ThemeProvider>
  );
}

export default App;