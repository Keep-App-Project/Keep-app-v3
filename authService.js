import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { AUTH_REDIRECT_PATH, RESET_REDIRECT_PATH, PRODUCT_IMAGES_BUCKET } from './config';
import { assertConfigured, toFriendlyError } from './errors';

WebBrowser.maybeCompleteAuthSession();

const VALID_PLANS = ['freemium', 'casa', 'business'];

const COLUMNS = {
  firstName: 'first_name',
  lastName: 'last_name',
  phone: 'phone',
  birthDate: 'birth_date',
  notificationsEnabled: 'notifications_enabled',
  photoUrl: 'photo_url',
};

// Contas Google trazem só o nome completo em user_metadata.
function namesFromMeta(meta = {}) {
  if (meta.first_name) return { first: meta.first_name, last: meta.last_name || '' };
  const full = (meta.full_name || meta.name || '').trim();
  const [first = '', ...rest] = full.split(/\s+/);
  return { first, last: rest.join(' ') };
}

function rowToUser(row, authUser) {
  const meta = (authUser && authUser.user_metadata) || {};
  const names = namesFromMeta(meta);
  return {
    id: (authUser && authUser.id) || row.id,
    email: authUser?.email || row?.email || null,
    photoUrl: row?.photo_url ?? null,
    firstName: (row && row.first_name) ?? names.first,
    lastName: (row && row.last_name) ?? names.last,
    phone: (row && row.phone) ?? meta.phone ?? null,
    birthDate: (row && row.birth_date) ?? meta.birth_date ?? null,
    plan: VALID_PLANS.includes(row && row.plan) ? row.plan : VALID_PLANS.includes(meta.plan) ? meta.plan : 'freemium',
    notificationsEnabled: row ? row.notifications_enabled : true,
    provider: (authUser && authUser.app_metadata && authUser.app_metadata.provider) || 'email',
    isGuest: false,
    createdAt: (row && row.created_at) || null,
  };
}

function userToRow(user) {
  return {
    id: user.id,
    email: user.email,
    first_name: user.firstName,
    last_name: user.lastName,
    phone: user.phone,
    birth_date: user.birthDate,
    notifications_enabled: user.notificationsEnabled,
  };
}

// Lê o perfil do usuário logado. Se a linha ainda não existir (conta antiga), cria a partir dos metadados.
export async function getProfile(authUser) {
  try {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle();
    if (error) throw error;
    if (data) return rowToUser(data, authUser);

    const fallback = rowToUser(null, authUser);
    const { data: created } = await supabase.from('profiles').insert(userToRow(fallback)).select().maybeSingle();
    return created ? rowToUser(created, authUser) : fallback;
  } catch (e) {
    if (__DEV__) console.warn('Falha ao carregar perfil:', e.message);
    return rowToUser(null, authUser);
  }
}

export async function login(email, password) {
  assertConfigured();
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw toFriendlyError(error);
  return data.user;
}

// Os dados do cadastro vão em `options.data`; o gatilho handle_new_user (schema.sql)
// cria a linha em `profiles` com eles, mesmo quando o e-mail precisa ser confirmado.
export async function signUp({ firstName, lastName, email, phone, birthDate, password, plan }) {
  assertConfigured();
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone || '',
        birth_date: birthDate || '',
        plan: VALID_PLANS.includes(plan) ? plan : 'freemium',
      },
    },
  });
  if (error) throw toFriendlyError(error);

  // Com confirmação de e-mail ligada, e-mail já existente volta sem erro e sem identidades.
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    throw new Error('Este e-mail já está cadastrado.');
  }
  return { needsConfirmation: !data.session };
}

export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw toFriendlyError(error);
}

export async function requestEmailChange(email) {
  const { error } = await supabase.auth.updateUser({ email: email.trim() });
  if (error) throw toFriendlyError(error);
}

export async function deleteAccount(userId) {
  const bucket = supabase.storage.from(PRODUCT_IMAGES_BUCKET);
  // O Keep salva seus arquivos diretamente na pasta do usuário.
  while (true) {
    const { data: images, error: listError } = await bucket.list(userId, { limit: 100 });
    if (listError) throw toFriendlyError(listError);
    if (!images?.length) break;
    const { data: removed, error: removeError } = await bucket.remove(images.map(({ name }) => `${userId}/${name}`));
    if (removeError || !removed?.length) throw toFriendlyError(removeError || 'Não foi possível apagar as fotos.');
  }
  const { error } = await supabase.rpc('delete_own_account');
  if (error) throw toFriendlyError(error);
  await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
}

export async function requestPasswordReset(email) {
  assertConfigured();
  const redirectTo = Linking.createURL(RESET_REDIRECT_PATH);
  if (__DEV__) console.log('[Keep] redirectTo da recuperação de senha (libere no Supabase):', redirectTo);
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
  if (error) throw toFriendlyError(error);
}

// Abre a sessão de recuperação a partir do link recebido por e-mail (keep://reset-password#access_token=...).
export async function handleRecoveryLink(url) {
  const params = parseAuthParams(url);
  if (params.access_token && params.refresh_token) {
    const { error } = await supabase.auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token,
    });
    if (error) throw toFriendlyError(error);
  } else if (params.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(params.code);
    if (error) throw toFriendlyError(error);
  } else {
    throw new Error(params.error_description || 'Link inválido ou expirado. Peça um novo e-mail de recuperação.');
  }
}

export async function setNewPassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw toFriendlyError(error);
}

// O plano só muda por esta função do banco (change_plan), que também confere os limites.
export async function changePlan(plan) {
  if (!VALID_PLANS.includes(plan)) throw new Error('Plano inválido.');
  const { error } = await supabase.rpc('change_plan', { p_plan: plan });
  if (error) throw toFriendlyError(error);
}

function parseAuthParams(url) {
  const parsed = new URL(url);
  const params = Object.fromEntries(new URLSearchParams(parsed.search));
  new URLSearchParams(parsed.hash.slice(1)).forEach((value, key) => {
    params[key] = value;
  });
  return params;
}

// Login com Google via Supabase OAuth (abre o navegador e volta para o app).
export async function signInWithGoogle() {
  assertConfigured();
  const redirectTo = Linking.createURL(AUTH_REDIRECT_PATH);
  if (__DEV__) console.log('[Keep] redirectTo do login com Google (libere no Supabase):', redirectTo);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw toFriendlyError(error);
  if (!data?.url) throw new Error('O Supabase não retornou o endereço de login com Google.');
  if (Platform.OS === 'web') {
    window.location.assign(data.url);
    return { cancelled: false };
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return { cancelled: true };
  await finishGoogleLogin(result.url);
  return { cancelled: false };
}

export function isGoogleCallback(url) {
  if (!url) return false;
  try {
    const received = new URL(url);
    const expected = new URL(Linking.createURL(AUTH_REDIRECT_PATH));
    return received.protocol === expected.protocol && received.host === expected.host && received.pathname === expected.pathname;
  } catch {
    return false;
  }
}

export async function finishGoogleLogin(url) {
  if (!isGoogleCallback(url)) {
    throw new Error('O login não voltou ao Keep. Confira a URL de redirecionamento no Supabase.');
  }
  const params = parseAuthParams(url);
  if (params.error || params.error_code) {
    throw new Error(params.error_description || 'O Google recusou o login. Confira a configuração do provedor no Supabase.');
  }
  if (params.access_token && params.refresh_token) {
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token,
    });
    if (sessionError) throw toFriendlyError(sessionError);
  } else if (params.code) {
    const { error: codeError } = await supabase.auth.exchangeCodeForSession(params.code);
    if (codeError) throw toFriendlyError(codeError);
  } else {
    throw new Error(params.error_description || 'Não foi possível concluir o login com o Google.');
  }
}

export async function updateProfile(userId, patch) {
  const row = {};
  Object.keys(patch).forEach((key) => {
    if (COLUMNS[key]) row[COLUMNS[key]] = patch[key] === '' ? null : patch[key];
  });
  const { error } = await supabase.from('profiles').update(row).eq('id', userId);
  if (error) throw toFriendlyError(error);
}

// Confirma a senha atual antes de trocar.
export async function changePassword(email, currentPassword, newPassword) {
  const { error: checkError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
  if (checkError) throw new Error('A senha atual está incorreta.');
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw toFriendlyError(error);
}
