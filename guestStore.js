import AsyncStorage from '@react-native-async-storage/async-storage';

// Modo visitante: a despensa fica neste aparelho. Sair ou entrar em uma conta limpa esses dados.
export const GUEST_ID = 'guest';
export const isGuestId = (id) => id === GUEST_ID;
export const guestStore = { products: [], lists: [], lossEvents: [] };

const PANTRY_KEY = '@keep/guest-pantry/v1';
let guestLoaded = false;
let loadingGuest = null;
let counter = 0;
export const newGuestId = (prefix) => `${prefix}_${Date.now()}_${counter++}`;

export async function hydrateGuestPantry() {
  if (guestLoaded) return;
  if (!loadingGuest) {
    loadingGuest = AsyncStorage.getItem(PANTRY_KEY).then((stored) => {
      if (stored) {
        const loaded = JSON.parse(stored);
        if (Array.isArray(loaded)) guestStore.products = loaded;
      }
      guestLoaded = true;
    }).finally(() => { loadingGuest = null; });
  }
  return loadingGuest;
}

export async function persistGuestPantry() {
  await AsyncStorage.setItem(PANTRY_KEY, JSON.stringify(guestStore.products));
}

export function resetGuestStore() {
  guestLoaded = true;
  guestStore.products = [];
  guestStore.lists = [];
  guestStore.lossEvents = [];
  AsyncStorage.removeItem(PANTRY_KEY).catch(() => {});
}
