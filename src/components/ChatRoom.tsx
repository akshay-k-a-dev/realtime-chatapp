import React, { useState, useEffect, useRef } from 'react';
import { ref, onValue, off, push, set, remove } from 'firebase/database';
import { database } from '../firebase/config';
import { Message } from '../types';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import { MessageSquare, Loader2, AlertTriangle } from 'lucide-react';

interface ChatRoomProps {
  roomId: string;
  userId: string;
  onDisconnect: () => void;
}

const ChatRoom: React.FC<ChatRoomProps> = ({ roomId, userId, onDisconnect }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [partnerConnected, setPartnerConnected] = useState(true);
  const [partnerUserId, setPartnerUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch partner user ID
  useEffect(() => {
    const usersRef = ref(database, `chatRooms/${roomId}/users`);
    const handleSnapshot = (snapshot: any) => {
      const users = snapshot.val();
      if (users) {
        const partnerId = users.find((id: string) => id !== userId);
        setPartnerUserId(partnerId);
      }
    };
    onValue(usersRef, handleSnapshot);
    return () => off(usersRef, 'value', handleSnapshot);
  }, [roomId, userId]);

  // Listen for messages
  useEffect(() => {
    const messagesRef = ref(database, `chatRooms/${roomId}/messages`);
    const handleSnapshot = (snapshot: any) => {
      const data = snapshot.val();
      if (data) {
        const messageList = Object.entries(data).map(([id, message]: [string, any]) => ({
          id,
          ...message,
        }));
        setMessages(messageList.sort((a, b) => a.timestamp - b.timestamp));
      } else {
        setMessages([]);
      }
    };
    onValue(messagesRef, handleSnapshot);
    return () => off(messagesRef, 'value', handleSnapshot);
  }, [roomId]);

  // Listen for typing and connection status of partner (when partner ID is available)
  useEffect(() => {
    if (!partnerUserId) return;

    const typingRef = ref(database, `chatRooms/${roomId}/typing/${partnerUserId}`);
    const connectedRef = ref(database, `chatRooms/${roomId}/connected/${partnerUserId}`);

    const handleTyping = (snapshot: any) => {
      setPartnerTyping(snapshot.val() === true);
    };

    const handleConnection = (snapshot: any) => {
      setPartnerConnected(snapshot.exists());
    };

    onValue(typingRef, handleTyping);
    onValue(connectedRef, handleConnection);

    return () => {
      off(typingRef, 'value', handleTyping);
      off(connectedRef, 'value', handleConnection);
    };
  }, [roomId, partnerUserId]);

  // Set self as connected
  useEffect(() => {
    const myConnectedRef = ref(database, `chatRooms/${roomId}/connected/${userId}`);
    set(myConnectedRef, true);

    return () => {
      remove(myConnectedRef);
    };
  }, [roomId, userId]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (text: string) => {
    if (text.trim() === '') return;

    const messagesRef = ref(database, `chatRooms/${roomId}/messages`);
    const newMessageRef = push(messagesRef);
    const message = {
      text,
      sender: userId,
      timestamp: Date.now(),
    };

    set(newMessageRef, message);
  };

  const handleTypingStatus = (isTyping: boolean) => {
    const typingRef = ref(database, `chatRooms/${roomId}/typing/${userId}`);
    if (isTyping) {
      set(typingRef, true);
    } else {
      remove(typingRef);
    }
  };

  const handleDisconnect = () => {
    const userConnectedRef = ref(database, `chatRooms/${roomId}/connected/${userId}`);
    remove(userConnectedRef);
    onDisconnect();
  };

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto">
      <div className="p-4 bg-blue-600 dark:bg-blue-800 text-white shadow-md rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MessageSquare size={20} />
            <h2 className="text-lg font-semibold">Anonymous Chat</h2>
          </div>
          {!partnerConnected && (
            <div className="flex items-center text-red-200">
              <AlertTriangle size={16} className="mr-1" />
              <span className="text-sm">Partner disconnected</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-800">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <MessageSquare size={48} className="mb-2 opacity-50" />
            <p>No messages yet. Say hello!</p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwnMessage={message.sender === userId}
              />
            ))}
            {partnerTyping && (
              <div className="flex items-center text-gray-500 dark:text-gray-400 ml-2 mt-2">
                <div className="flex space-x-1 items-center">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-sm">Stranger is typing...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <ChatInput
        onSendMessage={handleSendMessage}
        onTyping={handleTypingStatus}
        onDisconnect={handleDisconnect}
        disabled={!partnerConnected}
      />
    </div>
  );
};

export default ChatRoom;

