# Anonymous 1-on-1 Chat App

A minimal, real-time web application where users are anonymously paired with strangers for 1-on-1 chat. Built with React, Tailwind CSS, and Firebase.

## Features

- Instant anonymous 1-on-1 chat
- Real-time messaging via Firebase Realtime Database
- Automatic user matching via a global waiting queue
- Chat room creation when two users are paired
- "Typing..." indicator
- Option to disconnect and rejoin the queue
- Minimalist and distraction-free UI
- Dark/Light mode toggle

## Setup Instructions

1. Create a Firebase project at [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Enable Anonymous Authentication in the Firebase console
3. Create a Realtime Database in the Firebase console
4. Add the following security rules to your Realtime Database:

```json
{
  "rules": {
    "queue": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "chatRooms": {
      "$roomId": {
        ".read": "auth != null && data.child('users').hasAny([auth.uid])",
        ".write": "auth != null && data.child('users').hasAny([auth.uid])"
      }
    }
  }
}
```

5. Update the Firebase configuration in `src/firebase/config.ts` with your project's config

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```