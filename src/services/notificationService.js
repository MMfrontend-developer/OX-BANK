/**
 * notificationService.js
 * Create, list, mark-read, clear notifications.
 */

import { dbRead, dbUpdate } from './db.js';
import { generateId } from './cryptoService.js';

async function create(userId, { type, title, message }) {
  const notification = {
    id: generateId(),
    userId,
    type,
    title,
    message,
    read: false,
    createdAt: new Date().toISOString(),
  };

  dbUpdate('notifications', (notifs) => {
    const userNotifs = notifs[userId] || [];
    return {
      ...notifs,
      [userId]: [notification, ...userNotifs].slice(0, 50), // keep last 50
    };
  });

  return notification;
}

function getAll(userId) {
  const notifs = dbRead('notifications');
  return (notifs[userId] || []).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
}

function getUnreadCount(userId) {
  return getAll(userId).filter((n) => !n.read).length;
}

function markRead(userId, notificationId) {
  dbUpdate('notifications', (notifs) => {
    const userNotifs = notifs[userId] || [];
    return {
      ...notifs,
      [userId]: userNotifs.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n
      ),
    };
  });
}

function markAllRead(userId) {
  dbUpdate('notifications', (notifs) => {
    const userNotifs = notifs[userId] || [];
    return {
      ...notifs,
      [userId]: userNotifs.map((n) => ({ ...n, read: true })),
    };
  });
}

function deleteNotification(userId, notificationId) {
  dbUpdate('notifications', (notifs) => {
    const userNotifs = notifs[userId] || [];
    return {
      ...notifs,
      [userId]: userNotifs.filter((n) => n.id !== notificationId),
    };
  });
}

// Admin: all notifications
function getAllNotifications() {
  return dbRead('notifications');
}

function list(userId) {
  return getAll(userId);
}

function safeMarkRead(arg1, arg2) {
  const notifs = dbRead('notifications');
  if (arg2) {
    return markRead(arg1, arg2);
  }
  // If single arg passed (notificationId)
  const notificationId = arg1;
  for (const [userId, userNotifs] of Object.entries(notifs)) {
    if (userNotifs.some((n) => n.id === notificationId)) {
      return markRead(userId, notificationId);
    }
  }
}

export {
  create,
  list,
  getAll,
  getUnreadCount,
  safeMarkRead as markRead,
  markAllRead,
  deleteNotification,
  getAllNotifications,
};

export const notificationService = {
  create,
  list,
  getAll,
  getUnreadCount,
  markRead: safeMarkRead,
  markAllRead,
  deleteNotification,
  getAllNotifications,
};
