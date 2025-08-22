import React, { useState, useEffect, useCallback } from 'react';
import { ref, set, onValue, remove, get, push, onDisconnect } from 'firebase/database';
import { database } from '../firebase/config';
import { Loader2, Users } from 'lucide-react';

interface WaitingRoomProps {
  userId: string;
  onMatch: (roomId: string) => void;
}

const WaitingRoom: React.FC<WaitingRoomProps> = ({ userId, onMatch }) => {
  const [waitingCount, setWaitingCount] = useState(0);
  const [isJoiningQueue, setIsJoiningQueue] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000;

  useEffect(() => {
    const queueRef = ref(database, 'queue');
    const unsubscribe = onValue(queueRef, (snapshot) => {
      if (snapshot.exists()) {
        const queueData = snapshot.val();
        const count = Object.entries(queueData)
          .filter(([id, data]: [string, any]) => {
            const timestamp = data.timestamp || 0;
            const isRecent = Date.now() - timestamp < 30000; // Consider only users from last 30 seconds
            return id !== userId && isRecent;
          }).length;
        setWaitingCount(count);
      } else {
        setWaitingCount(0);
      }
    });

    return () => unsubscribe();
  }, [userId]);

  const createChatRoom = async (partnerId: string): Promise<string | null> => {
    try {
      const roomRef = push(ref(database, 'chatRooms'));
      const roomData = {
        users: {
          [userId]: true,
          [partnerId]: true
        },
        createdAt: Date.now(),
        lastActivity: Date.now(),
        status: 'active'
      };

      await set(roomRef, roomData);
      
      // Set up room cleanup on disconnect
      const roomDisconnectRef = ref(database, `chatRooms/${roomRef.key}/status`);
      onDisconnect(roomDisconnectRef).set('inactive');

      return roomRef.key;
    } catch (error) {
      console.error('Error creating chat room:', error);
      return null;
    }
  };

  const findMatch = async (): Promise<string | null> => {
    try {
      const queueRef = ref(database, 'queue');
      const snapshot = await get(queueRef);
      
      if (snapshot.exists()) {
        const queueData = snapshot.val();
        const now = Date.now();
        
        // Filter and sort waiting users
        const waitingUsers = Object.entries(queueData)
          .filter(([id, data]: [string, any]) => {
            const timestamp = data.timestamp || 0;
            const isRecent = now - timestamp < 30000; // Only match with users from last 30 seconds
            return id !== userId && isRecent;
          })
          .sort(([, a], [, b]) => a.timestamp - b.timestamp);
        
        if (waitingUsers.length > 0) {
          const [partnerId] = waitingUsers[0];
          
          // Double-check partner is still available
          const partnerSnapshot = await get(ref(database, `queue/${partnerId}`));
          if (partnerSnapshot.exists()) {
            const roomId = await createChatRoom(partnerId);
            if (roomId) {
              // Remove both users from queue
              await Promise.all([
                remove(ref(database, `queue/${partnerId}`)),
                remove(ref(database, `queue/${userId}`))
              ]);
              return roomId;
            }
          }
        }
      }
      return null;
    } catch (error) {
      console.error('Error finding match:', error);
      return null;
    }
  };

  const cleanupQueue = useCallback(async () => {
    try {
      await remove(ref(database, `queue/${userId}`));
      setIsJoiningQueue(false);
      setRetryCount(0);
    } catch (error) {
      console.error('Error cleaning up queue:', error);
    }
  }, [userId]);

  const joinQueue = async () => {
    if (isJoiningQueue) return;
    setIsJoiningQueue(true);
    
    try {
      // Try to find a match first
      const roomId = await findMatch();
      
      if (roomId) {
        onMatch(roomId);
        return;
      }
      
      // No match found, add to queue
      const userQueueRef = ref(database, `queue/${userId}`);
      const queueData = {
        timestamp: Date.now(),
        status: 'waiting'
      };
      
      await set(userQueueRef, queueData);
      
      // Set up disconnect cleanup
      onDisconnect(userQueueRef).remove();
      
      // Listen for matches
      const chatRoomsRef = ref(database, 'chatRooms');
      let matchFound = false;
      
      const unsubscribe = onValue(chatRoomsRef, async (snapshot) => {
        if (matchFound) return;
        
        if (snapshot.exists()) {
          const rooms = snapshot.val();
          
          const userRoom = Object.entries(rooms).find(([, room]: [string, any]) => 
            room.status === 'active' && room.users && room.users[userId]
          );
          
          if (userRoom) {
            matchFound = true;
            const [roomId] = userRoom;
            unsubscribe();
            await cleanupQueue();
            onMatch(roomId);
          }
        }
      });

      // Set up retry mechanism
      const retryMatch = async () => {
        if (matchFound || !isJoiningQueue) return;
        
        if (retryCount < MAX_RETRIES) {
          setRetryCount(prev => prev + 1);
          const roomId = await findMatch();
          
          if (roomId) {
            matchFound = true;
            unsubscribe();
            await cleanupQueue();
            onMatch(roomId);
          } else {
            setTimeout(retryMatch, RETRY_DELAY);
          }
        } else {
          // Max retries reached, stay in queue but stop active matching
          console.log('Max retries reached, waiting for passive match');
        }
      };

      setTimeout(retryMatch, RETRY_DELAY);
      
    } catch (error) {
      console.error('Error joining queue:', error);
      await cleanupQueue();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto p-6">
      <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        <div className="bg-blue-600 dark:bg-blue-800 text-white p-6 text-center">
          <h1 className="text-2xl font-bold mb-2">Anonymous Chat</h1>
          <p className="text-blue-100">Talk to strangers, make new friends</p>
        </div>
        
        <div className="p-6">
          {isJoiningQueue ? (
            <div className="text-center py-8">
              <Loader2 size={48} className="animate-spin mx-auto mb-4 text-blue-500" />
              <h2 className="text-xl font-semibold mb-2 dark:text-white">Finding you a chat partner...</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {waitingCount === 1 
                  ? "1 person waiting in queue" 
                  : `${waitingCount} people waiting in queue`}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {retryCount > 0 ? `Attempt ${retryCount} of ${MAX_RETRIES}...` : 'Please wait while we connect you with someone'}
              </p>
            </div>
          ) : (
            <div className="text-center py-8">
              <Users size={48} className="mx-auto mb-4 text-blue-500" />
              <h2 className="text-xl font-semibold mb-4 dark:text-white">Start chatting anonymously</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Connect with random strangers from around the world for a one-on-one conversation.
              </p>
              <button
                onClick={joinQueue}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                Start Chatting
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WaitingRoom;