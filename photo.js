import { Alert, Linking, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Directory, File, Paths } from 'expo-file-system';

function permissionMessage(label, canAskAgain) {
  Alert.alert('Permissão necessária', `Permita o acesso à ${label} para adicionar a foto.`, [
    { text: 'Cancelar', style: 'cancel' },
    ...(!canAskAgain ? [{ text: 'Configurações', onPress: () => Linking.openSettings() }] : []),
  ]);
}

// ImagePicker devolve uma imagem temporária. Normalizamos para JPEG no cache do app,
// o que também permite escolher fotos HEIC de celulares iOS e reduz uploads muito grandes.
export async function normalizePhoto(asset) {
  if (!asset?.uri) throw new Error('A câmera não retornou uma foto válida.');
  // O ImagePicker grava no cache temporário. Ele pode ser descartado ao navegar
  // ou ao reabrir o app, então copiamos o JPEG para documents (persistente).
  let normalized;
  try {
    normalized = await ImageManipulator.manipulateAsync(
      asset.uri,
      asset.width > 1600 ? [{ resize: { width: 1600 } }] : [],
      { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG }
    );
  } catch (e) {
    throw new Error(`Falha ao preparar foto da câmera: ${e?.message || 'erro de imagem'}`);
  }
  if (!normalized?.uri) throw new Error('Não foi possível preparar a foto. Tente novamente.');
  if (Platform.OS === 'web') return normalized.uri;

  try {
    const folder = new Directory(Paths.document, 'keep-product-images');
    folder.create({ idempotent: true, intermediates: true });
    const destination = new File(folder, `product-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`);
    await new File(normalized.uri).copy(destination);
    if (!destination.exists || destination.size === 0) {
      throw new Error('Arquivo de imagem vazio.');
    }
    return destination.uri;
  } catch (e) {
    throw new Error(`Não foi possível guardar a foto no celular: ${e?.message || 'erro de armazenamento'}`);
  }
}

export async function takePhoto() {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    permissionMessage('câmera', permission.canAskAgain);
    return null;
  }
  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9 });
  if (result.canceled || !result.assets?.length) return null;
  return normalizePhoto(result.assets[0]);
}

export async function pickFromGallery() {
  // O seletor nativo recente (Android Photo Picker) pode funcionar sem conceder acesso
  // à biblioteca inteira. Deixamos o sistema pedir somente o necessário.
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
  if (result.canceled || !result.assets?.length) return null;
  return normalizePhoto(result.assets[0]);
}

// Também usado na edição do perfil. NÃO resolver a Promise no onDismiss:
// Android chama onDismiss ao tocar em uma opção, antes de a câmera terminar;
// a versão antiga perdia a foto por resolver null primeiro.
export function choosePhoto(title = 'Foto do produto') {
  return new Promise((resolve, reject) => {
    Alert.alert(title, 'Como deseja adicionar a foto?', [
      { text: 'Tirar foto', onPress: () => takePhoto().then(resolve, reject) },
      { text: 'Escolher da galeria', onPress: () => pickFromGallery().then(resolve, reject) },
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(null) },
    ], { cancelable: false });
  });
}
