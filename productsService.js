import { supabase } from './supabase';
import { PRODUCT_IMAGES_BUCKET } from './config';
import { guestStore, isGuestId, newGuestId, hydrateGuestPantry, persistGuestPantry } from './guestStore';
import { toFriendlyError } from './errors';
import { productImageType } from '../utils/productImageType';
import { File } from 'expo-file-system';

const CATEGORIES = ['Laticínios', 'Carnes', 'Hortifruti', 'Grãos e cereais', 'Bebidas', 'Padaria', 'Congelados', 'Outros'];
const STORAGE_OPTIONS = ['Geladeira', 'Congelador', 'Despensa'];

export const getCategories = () => CATEGORIES;
export const getStorageOptions = () => STORAGE_OPTIONS;

// Produtos que vencem primeiro aparecem primeiro.
export const sortByExpiry = (list) =>
  [...list].sort((a, b) => String(a.expiryDate).localeCompare(String(b.expiryDate)));

function fromRow(row) {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    category: row.category,
    barcode: row.barcode,
    purchaseDate: row.purchase_date,
    expiryDate: row.expiry_date,
    quantity: row.quantity,
    storage: row.storage,
    imageUrl: row.image_url,
    price: row.price != null ? Number(row.price) : null,
    createdAt: row.created_at,
  };
}

function toRow(userId, product) {
  return {
    user_id: userId,
    name: product.name,
    brand: product.brand || null,
    category: product.category || 'Outros',
    barcode: product.barcode || null,
    purchase_date: product.purchaseDate,
    expiry_date: product.expiryDate,
    quantity: product.quantity ?? 1,
    storage: product.storage || null,
    image_url: product.imageUrl || null,
    price: product.price ?? null,
  };
}

export async function getProducts(userId) {
  if (isGuestId(userId)) { await hydrateGuestPantry(); return sortByExpiry(guestStore.products); }
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('user_id', userId)
    .order('expiry_date', { ascending: true });
  if (error) throw toFriendlyError(error);
  return (data ?? []).map(fromRow);
}

export async function getProductById(userId, productId) {
  if (isGuestId(userId)) { await hydrateGuestPantry(); return guestStore.products.find((p) => p.id === productId) || null; }
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('user_id', userId)
    .eq('id', productId)
    .maybeSingle();
  if (error) throw toFriendlyError(error);
  return data ? fromRow(data) : null;
}

export async function addProduct(userId, product) {
  if (isGuestId(userId)) {
    await hydrateGuestPantry();
    const created = { ...product, id: newGuestId('prod'), createdAt: new Date().toISOString() };
    guestStore.products = [created, ...guestStore.products];
    await persistGuestPantry();
    return created;
  }
  const { data, error } = await supabase.from('products').insert(toRow(userId, product)).select().single();
  if (error) throw toFriendlyError(error);
  return fromRow(data);
}

export async function updateProduct(userId, productId, { name, quantity, expiryDate }) {
  if (name !== undefined && !name.trim()) throw new Error('Informe o nome do produto.');
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > 2147483647) {
    throw new Error('Informe uma quantidade inteira maior ou igual a zero.');
  }
  const patch = { quantity };
  if (name !== undefined) patch.name = name.trim();
  if (expiryDate !== undefined) patch.expiryDate = expiryDate;
  if (isGuestId(userId)) {
    await hydrateGuestPantry();
    const current = guestStore.products.find((p) => p.id === productId);
    if (!current) throw new Error('Produto não encontrado.');
    const updated = { ...current, ...patch };
    guestStore.products = guestStore.products.map((p) => (p.id === productId ? updated : p));
    await persistGuestPantry();
    return updated;
  }
  const { data, error } = await supabase.rpc('update_pantry_product', {
    p_id: productId,
    p_quantity: quantity,
    p_name: patch.name ?? null,
    p_expiry: expiryDate ?? null,
  });
  if (error) throw toFriendlyError(error);
  return fromRow(data);
}

export async function deleteProduct(userId, productId) {
  if (isGuestId(userId)) {
    await hydrateGuestPantry();
    guestStore.products = guestStore.products.filter((p) => p.id !== productId);
    await persistGuestPantry();
    return;
  }
  const { data, error } = await supabase.from('products').delete()
    .eq('user_id', userId).eq('id', productId).select('image_url').maybeSingle();
  if (error) throw toFriendlyError(error);
  const path = storagePathFromUrl(data?.image_url);
  if (path) supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove([path]).catch(() => {});
}

// Remove o produto e registra a perda (função discard_product no banco, atômica).
export async function discardProduct(userId, productId, reason = 'expired') {
  if (isGuestId(userId)) {
    await hydrateGuestPantry();
    const product = guestStore.products.find((p) => p.id === productId);
    if (product) {
      guestStore.lossEvents.push({
        id: newGuestId('loss'),
        productName: product.name,
        category: product.category,
        quantity: product.quantity,
        lossValue: (product.price || 0) * product.quantity,
        reason,
        createdAt: new Date().toISOString(),
      });
    }
    guestStore.products = guestStore.products.filter((p) => p.id !== productId);
    await persistGuestPantry();
    return;
  }
  // Guarda o caminho da foto antes de apagar o produto, para não deixar arquivo órfão no Storage.
  let imagePath = null;
  try {
    const product = await getProductById(userId, productId);
    imagePath = storagePathFromUrl(product && product.imageUrl);
  } catch (e) {
    // sem a foto, o descarte continua normalmente
  }
  const { error } = await supabase.rpc('discard_product', { p_id: productId, p_reason: reason });
  if (error) throw toFriendlyError(error);
  if (imagePath) {
    supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove([imagePath]).catch(() => {});
  }
}

// https://.../storage/v1/object/public/product-images/<userId>/<arquivo>.jpg  →  <userId>/<arquivo>.jpg
function storagePathFromUrl(url) {
  if (!url) return null;
  const marker = `/${PRODUCT_IMAGES_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return decodeURIComponent(url.slice(index + marker.length).split('?')[0]);
}

export async function getLossEvents(userId) {
  if (isGuestId(userId)) return guestStore.lossEvents;
  const { data, error } = await supabase
    .from('loss_events')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(2000);
  if (error) throw toFriendlyError(error);
  return (data ?? []).map((row) => ({
    id: row.id,
    productName: row.product_name,
    category: row.category,
    quantity: row.quantity,
    lossValue: Number(row.loss_value) || 0,
    reason: row.reason,
    createdAt: row.created_at,
  }));
}

// Sobe a foto para o Storage (pasta do próprio usuário) e devolve a URL pública.
export async function uploadProductImage(userId, uri) {
  if (!uri) return null;
  if (isGuestId(userId)) return uri;
  // fetch(file://...) pode falhar no React Native. O FileSystem lê o arquivo
  // local produzido pela câmera/galeria e fornece os bytes corretos para Supabase.
  let buffer;
  try {
    const imageFile = new File(uri);
    if (!imageFile.exists || !imageFile.size) throw new Error('O arquivo não existe ou está vazio.');
    buffer = await imageFile.arrayBuffer();
  } catch (e) {
    throw new Error(`Não foi possível ler a imagem salva: ${e?.message || 'arquivo indisponível'}`);
  }
  const { extension, contentType } = productImageType(buffer);
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
  const { error } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(path, buffer, { contentType, upsert: false });
  if (error) {
    throw new Error(`Falha ao enviar foto para o Supabase Storage (bucket ${PRODUCT_IMAGES_BUCKET}): ${error.message}`);
  }
  const publicUrl = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path).data.publicUrl;
  if (!publicUrl) throw new Error('Supabase não retornou a URL da foto.');
  return publicUrl;
}

// Consulta o Open Food Facts (gratuito, sem chave) para preencher nome/marca pelo código de barras.
export async function lookupBarcode(barcode) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const url =
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json` +
      '?fields=product_name,product_name_pt,brands';
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return { found: false };
    const json = await response.json();
    if (json.status === 1 && json.product) {
      const name = (json.product.product_name_pt || json.product.product_name || '').trim();
      if (name) {
        const brand = (json.product.brands || '').split(',')[0].trim();
        return { found: true, product: { name, brand: brand || null, category: 'Outros', barcode } };
      }
    }
  } catch (e) {
    // Sem internet, timeout ou API fora do ar: o scanner continua funcional
    // e o usuário pode concluir o cadastro manualmente com o mesmo código.
  } finally {
    clearTimeout(timeout);
  }
  return { found: false };
}
