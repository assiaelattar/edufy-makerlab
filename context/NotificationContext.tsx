import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { db } from '../services/firebase';
import { collection, onSnapshot, query, orderBy, limit, where, addDoc, serverTimestamp, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { ToastContainer, ToastMessage } from '../components/Toast';
import { AppNotification } from '../types';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  addToast: (title: string, message: string, type?: ToastMessage['type']) => void;
  requestPermission: () => Promise<void>;
  projectNotifications: AppNotification[];
  unreadCount: number;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  createProjectNotification: (userId: string, type: AppNotification['type'], title: string, message: string, projectId?: string, projectTitle?: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [projectNotifications, setProjectNotifications] = useState<AppNotification[]>([]);
  const isInitialLoad = useRef(true);
  const isProjectNotifInitialLoad = useRef(true);
  const { userProfile } = useAuth();

  // Audio for notification sound
  const notificationSound = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    notificationSound.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    // Request permission silently on mount if not already denied
    if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  const addToast = (title: string, message: string, type: ToastMessage['type'] = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, title, message, type, timestamp: Date.now() }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Play sound helper
  const playSound = () => {
    if (notificationSound.current) {
      notificationSound.current.currentTime = 0;
      notificationSound.current.play().catch(e => console.log("Audio play blocked (needs user interaction first)", e));
    }
  };

  // Trigger System Notification (Phone/Desktop)
  const sendSystemNotification = (title: string, body: string) => {
    if (Notification.permission === 'granted') {
      try {
        // Try Service Worker registration first (standard for mobile PWA)
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.ready.then(registration => {
            registration.showNotification(title, {
              body,
              icon: 'https://placehold.co/192x192/2563eb/ffffff?text=ML',
              vibrate: [200, 100, 200],
              tag: 'project-alert-' + Date.now()
            } as any);
          });
        } else {
          // Fallback to standard Notification API
          new Notification(title, {
            body,
            icon: 'https://placehold.co/192x192/2563eb/ffffff?text=ML',
          });
        }
      } catch (e) {
        console.error("Notification error", e);
      }
    }
  };

  // Real-time Listener for New Bookings
  useEffect(() => {
    if (!db) return;

    const q = query(
      collection(db, 'bookings'),
      orderBy('bookedAt', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
      if (isInitialLoad.current) {
        isInitialLoad.current = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const booking = change.doc.data();
          const title = "New Workshop Booking! 🎉";
          const message = `${booking.parentName} just booked for ${booking.kidName}.`;

          addToast(title, message, 'success');
          playSound();
          sendSystemNotification(title, message);
        }
      });
    }, (error) => {
      console.error("Notification Listener Error:", error);
    });

    return () => unsubscribe();
  }, []);

  // Real-time Listener for Project Notifications
  useEffect(() => {
    if (!db || !userProfile?.uid) return;

    // Calculate 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userProfile.uid),
      where('createdAt', '>', Timestamp.fromDate(sevenDaysAgo)),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
      if (isProjectNotifInitialLoad.current) {
        // First load - just set the notifications
        const notifs: AppNotification[] = [];
        snapshot.forEach((doc) => {
          notifs.push({ id: doc.id, ...doc.data() } as AppNotification);
        });
        setProjectNotifications(notifs);
        isProjectNotifInitialLoad.current = false;
        return;
      }

      // Subsequent updates - check for new notifications
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const notif = change.doc.data();
          const title = notif.title || "New Notification";
          const message = notif.message || "";

          addToast(title, message, notif.type as ToastMessage['type'] || 'info');
          playSound();
          sendSystemNotification(title, message);
        }
      });

      // Update full list
      const notifs: AppNotification[] = [];
      snapshot.forEach((doc) => {
        notifs.push({ id: doc.id, ...doc.data() } as AppNotification);
      });
      setProjectNotifications(notifs);
    });

    return () => unsubscribe();
  }, [userProfile?.uid]);

  const unreadCount = projectNotifications.filter(n => !n.read).length;

  const markAsRead = async (notificationId: string) => {
    if (!db) return;
    try {
      await updateDoc(doc(db!, 'notifications', notificationId), {
        read: true
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!db) return;
    try {
      const unreadNotifs = projectNotifications.filter(n => !n.read);
      await Promise.all(
        unreadNotifs.map(n => updateDoc(doc(db!, 'notifications', n.id), { read: true }))
      );
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const createProjectNotification = async (
    userId: string,
    type: AppNotification['type'],
    title: string,
    message: string,
    projectId?: string,
    projectTitle?: string
  ) => {
    if (!db) return;
    try {
      await addDoc(collection(db!, 'notifications'), {
        userId,
        type,
        title,
        message,
        link: projectId ? `/project/${projectId}` : undefined,
        read: false,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

  return (
    <NotificationContext.Provider value={{
      addToast,
      requestPermission,
      projectNotifications,
      unreadCount,
      markAsRead,
      markAllAsRead,
      createProjectNotification
    }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};