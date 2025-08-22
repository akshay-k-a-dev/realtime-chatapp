import React, { useState, useRef, useEffect } from 'react';
import { Send, X } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  onTyping: (isTyping: boolean) => void;
  onDisconnect: () => void;
  disabled?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ 
  onSendMessage, 
  onTyping, 
  onDisconnect,
  disabled = false 
}) => {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Handle typing indicator with debounce
    if (message && !isTyping) {
      setIsTyping(true);
      onTyping(true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        onTyping(false);
      }
    }, 1000);

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [message, isTyping, onTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() !== '') {
      onSendMessage(message);
      setMessage('');
      // Focus the input after sending
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="p-4 bg-white dark:bg-gray-900 border-t dark:border-gray-700 rounded-b-lg">
      <form onSubmit={handleSubmit} className="flex flex-col space-y-2">
        <div className="flex">
          <textarea
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? "Chat ended - start a new chat" : "Type a message..."}
            className="flex-1 resize-none border rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            rows={1}
            disabled={disabled}
          />
          <button
            type="submit"
            disabled={!message.trim() || disabled}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 rounded-r-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={20} />
          </button>
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onDisconnect}
            className="flex items-center text-red-500 hover:text-red-700 px-3 py-1 rounded-md transition-colors"
          >
            <X size={16} className="mr-1" />
            <span>End Chat</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatInput;