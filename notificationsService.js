import { Platform } from 'react-native';
import { buildExpiryReminders } from '../utils/expiryReminders';

const CHANNEL_ID = 'keep-validade-v2';
const PREFIX = 'keep-expiry-';
const SCHEMA_VERSION = 2;
let notifications;
let queue = Promise.resolve();

function getNotifications() {
  if (Platform.OS === 'web') return null;
  if (!notifications) {
    notifications = require('expo-notifications');
    notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  }
  return notifications;
}

// Instala o handler assim que o app é carregado, não apenas após carregar a despensa.
export function initializeNotifications() {
  try { getNotifications(); } catch (error) {
    if (__DEV__) console.warn('Notificações indisponíveis:', error.message);
  }
}

async function ensureChannel(api) {
  if (Platform.OS !== 'android') return;
  await api.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Validade dos produtos',
    description: 'Avisos da despensa quando os produtos estão próximos do vencimento.',
    importance: api.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 200, 100, 200],
    showBadge: false,
  });
}

function isAllowed(api, permission) {
  return !!permission && (permission.granted || permission.ios?.status === api.IosAuthorizationStatus.PROVISIONAL);
}

export async function hasNotificationPermission() {
  try {
    const api = getNotifications();
    return !!api && isAllowed(api, await api.getPermissionsAsync());
  } catch { return false; }
}

export async function requestNotificationPermission() {
  try {
    const api = getNotifications();
    if (!api) return false;
    await ensureChannel(api); // Obrigatório antes do diálogo de permissão Android 13+.
    const current = await api.getPermissionsAsync();
    if (isAllowed(api, current)) return true;
    return !!current.canAskAgain && isAllowed(api, await api.requestPermissionsAsync());
  } catch { return false; }
}

function createContent(reminder, api) {
  const title = String(reminder.title || '').trim();
  const body = String(reminder.body || '').trim();
  if (!title || !body) throw new Error('Uma notificação está sem título ou descrição.');
  return {
    title,
    body,
    sound: 'default',
    color: '#FF7A1A',
    ...(Platform.OS === 'android' ? { priority: api.AndroidNotificationPriority.HIGH } : {}),
    data: { kind: 'expiry', schemaVersion: SCHEMA_VERSION, productIds: reminder.productIds },
  };
}

function onQueue(work) {
  const result = queue.then(work);
  // Uma falha não deve impedir sincronizações futuras.
  queue = result.catch(() => {});
  return result;
}

export function syncExpiryNotifications(products, enabled, { askPermission = false, batch = false } = {}) {
  return onQueue(async () => {
    try {
      const api = getNotifications();
      if (!api) return { scheduled: 0, reason: 'unsupported' };
      const all = await api.getAllScheduledNotificationsAsync();
      const existing = new Map(all.filter(({ identifier }) => identifier.startsWith(PREFIX))
        .map((request) => [request.identifier, request]));
      let allowed = enabled && await hasNotificationPermission();
      if (enabled && !allowed && askPermission) allowed = await requestNotificationPermission();
      if (allowed) await ensureChannel(api);
      const reminders = allowed ? buildExpiryReminders(products, { batch }) : [];
      const desired = new Map(reminders.map((item) => [`${PREFIX}${item.key}`, item]));
      for (const [id, request] of existing) {
        const next = desired.get(id);
        if (next && next.title === request.content?.title && next.body === request.content?.body &&
            request.content?.data?.schemaVersion === SCHEMA_VERSION &&
            (Platform.OS !== 'android' || request.trigger?.channelId === CHANNEL_ID)) {
          desired.delete(id);
        } else {
          await api.cancelScheduledNotificationAsync(id);
        }
      }
      for (const [identifier, reminder] of desired) {
        await api.scheduleNotificationAsync({
          identifier,
          content: createContent(reminder, api),
          trigger: {
            type: api.SchedulableTriggerInputTypes.DATE,
            date: reminder.date,
            ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
          },
        });
      }
      return { scheduled: reminders.length, allowed: !!allowed };
    } catch (error) {
      if (__DEV__) console.warn('Falha ao agendar notificações:', error);
      return { scheduled: 0, error: error.message };
    }
  });
}

// Permite verificar no celular, mesmo que nenhum produto esteja perto de vencer.
export async function sendTestNotification() {
  const api = getNotifications();
  if (!api) throw new Error('Notificações não são suportadas nesta plataforma.');
  const allowed = (await hasNotificationPermission()) || (await requestNotificationPermission());
  if (!allowed) throw new Error('Permita as notificações nas configurações do Android.');
  await ensureChannel(api);
  const identifier = await api.scheduleNotificationAsync({
    content: {
      title: 'Teste de notificação do Keep',
      body: 'O título e o texto aparecem corretamente? Seus avisos de validade usarão este formato.',
      sound: 'default',
      color: '#FF7A1A',
      ...(Platform.OS === 'android' ? { priority: api.AndroidNotificationPriority.HIGH } : {}),
      data: { kind: 'test', schemaVersion: SCHEMA_VERSION },
    },
    trigger: {
      type: api.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 3,
      ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
    },
  });
  return identifier;
}

export async function getScheduledExpiryCount() {
  const api = getNotifications();
  if (!api) return 0;
  const scheduled = await api.getAllScheduledNotificationsAsync();
  return scheduled.filter(({ identifier }) => identifier.startsWith(PREFIX)).length;
}

export function cancelExpiryNotifications() {
  return syncExpiryNotifications([], false);
}
