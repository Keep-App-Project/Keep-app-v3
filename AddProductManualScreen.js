import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GradientHeader from '../../components/GradientHeader';
import Input from '../../components/Input';
import Button from '../../components/Button';
import Checkbox from '../../components/Checkbox';
import FixedFooter, { FOOTER_SPACE } from '../../components/FixedFooter';
import { usePantry } from '../../context/PantryContext';
import { useAuth } from '../../context/AuthContext';
import * as productsService from '../../services/productsService';
import colors from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';
import { todayISO, isoToBR, brToISO } from '../../utils/date';
import { maskDateBR, parsePrice } from '../../utils/masks';
import { takePhoto, pickFromGallery } from '../../utils/photo';

export default function AddProductManualScreen({ route, navigation }) {
  const prefill = route.params?.prefill || {};
  const { user } = useAuth();
  const { addProduct } = usePantry();
  const categories = useMemo(() => productsService.getCategories(), []);
  const storageOptions = useMemo(() => productsService.getStorageOptions(), []);

  const [name, setName] = useState(prefill.name || '');
  const [brand, setBrand] = useState(prefill.brand || '');
  const [category, setCategory] = useState(prefill.category || categories[0]);
  const [storage, setStorage] = useState(storageOptions[0]);
  const [purchaseDate, setPurchaseDate] = useState(isoToBR(todayISO()));
  const [expiryDate, setExpiryDate] = useState(prefill.expiryDate ? isoToBR(prefill.expiryDate) : '');
  const [quantity, setQuantity] = useState('1');
  const [price, setPrice] = useState('');
  const [photoUri, setPhotoUri] = useState(null);
  const [photoStatus, setPhotoStatus] = useState('');
  const [isPickingPhoto, setIsPickingPhoto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [attempted, setAttempted] = useState(false);

  const purchaseISO = brToISO(purchaseDate);
  const expiryISO = brToISO(expiryDate);
  const isValid = name.trim().length > 0 && !!purchaseISO && !!expiryISO;

  const handlePhoto = useCallback(async (source) => {
    if (isPickingPhoto || isSubmitting) return;
    setError(null);
    setIsPickingPhoto(true);
    try {
      const uri = await (source === 'camera' ? takePhoto() : pickFromGallery());
      if (uri) { setPhotoUri(uri); setPhotoStatus('Foto pronta para cadastrar.'); }
    } catch (e) {
      setError(e?.message || 'Não foi possível adicionar a foto.');
    } finally {
      setIsPickingPhoto(false);
    }
  }, [isPickingPhoto, isSubmitting]);

  const handleSubmit = useCallback(async () => {
    setAttempted(true);
    if (!isValid) {
      setError('Preencha o nome e as datas no formato DD/MM/AAAA.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      setPhotoStatus(photoUri ? 'Salvando imagem na despensa...' : '');
      const imageUrl = photoUri ? await productsService.uploadProductImage(user.id, photoUri) : null;
      await addProduct({
        name: name.trim(),
        brand: brand.trim() || null,
        category,
        barcode: prefill.barcode || null,
        purchaseDate: purchaseISO,
        expiryDate: expiryISO,
        quantity: Math.max(1, parseInt(quantity, 10) || 1),
        storage,
        imageUrl,
        price: parsePrice(price),
      });
      setPhotoStatus('');
      navigation.replace('AddProductSuccess');
    } catch (e) {
      setError(e.message);
      setPhotoStatus('');
    } finally {
      setIsSubmitting(false);
    }
  }, [isValid, user.id, photoUri, addProduct, name, brand, category, prefill.barcode, purchaseISO, expiryISO, quantity, storage, price, navigation]);

  return (
    <View style={styles.container}>
      <GradientHeader title="Cadastrar Manualmente" showBack onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {prefill.scanMessage ? <Text style={styles.scanHint}>{prefill.scanMessage}</Text> : null}
          <TouchableOpacity style={styles.photoBox} onPress={() => handlePhoto('camera')} disabled={isPickingPhoto || isSubmitting} activeOpacity={0.85}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
            ) : (
              <>
                <Ionicons name="camera-outline" size={26} color={colors.primary} />
                <Text style={styles.photoText}>Tirar foto do produto</Text>
              </>
            )}
          </TouchableOpacity>
          <View style={styles.photoActions}>
            <TouchableOpacity onPress={() => handlePhoto('camera')} disabled={isPickingPhoto || isSubmitting} style={styles.photoAction}>
              <Ionicons name="camera-outline" size={18} color={colors.primary} />
              <Text style={styles.photoActionText}>{isPickingPhoto ? 'Carregando...' : 'Câmera'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handlePhoto('gallery')} disabled={isPickingPhoto || isSubmitting} style={styles.photoAction}>
              <Ionicons name="images-outline" size={18} color={colors.primary} />
              <Text style={styles.photoActionText}>Galeria</Text>
            </TouchableOpacity>
            {photoUri ? (
              <TouchableOpacity onPress={() => { setPhotoUri(null); setPhotoStatus(''); }} disabled={isPickingPhoto || isSubmitting} style={styles.photoAction}>
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
                <Text style={styles.photoActionText}>Remover</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          {photoUri ? <Text style={styles.photoSavedHint}>{photoStatus || 'Foto selecionada. Toque em Cadastrar Produto para salvá-la na despensa.'}</Text> : null}

          <Input label="Nome do produto" value={name} onChangeText={setName} placeholder="Ex: pão" autoCapitalize="sentences"
            error={attempted && !name.trim() ? 'Informe o nome.' : null} />
          <Input label="Marca" value={brand} onChangeText={setBrand} placeholder="Ex: Pullman" autoCapitalize="words" />

          <Text style={styles.label}>Categoria</Text>
          <View style={styles.grid}>
            {categories.map((option) => (
              <Checkbox
                key={option}
                label={option}
                checked={category === option}
                onPress={() => setCategory(option)}
                style={styles.gridItem}
              />
            ))}
          </View>

          <View style={styles.row}>
            <View style={styles.half}>
              <Input
                label="Data da Compra"
                value={purchaseDate}
                onChangeText={(text) => setPurchaseDate(maskDateBR(text))}
                placeholder="DD/MM/AAAA"
                keyboardType="numeric"
                maxLength={10}
                icon="calendar-outline"
                error={(attempted || purchaseDate.length === 10) && !purchaseISO ? 'Data de compra inválida' : null}
              />
            </View>
            <View style={styles.half}>
              <Input
                label="Data de Validade"
                value={expiryDate}
                onChangeText={(text) => setExpiryDate(maskDateBR(text))}
                placeholder="DD/MM/AAAA"
                keyboardType="numeric"
                maxLength={10}
                icon="calendar-outline"
                error={(attempted || expiryDate.length === 10) && !expiryISO ? 'Informe uma validade válida' : null}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.half}>
              <Input label="Quantidade" value={quantity} onChangeText={setQuantity} placeholder="Ex: 20" keyboardType="numeric" />
            </View>
            <View style={styles.half}>
              <Input label="Preço unitário (R$)" value={price} onChangeText={setPrice} placeholder="Opcional" keyboardType="decimal-pad" />
            </View>
          </View>

          <Text style={styles.label}>Local de Armazenamento</Text>
          <View style={styles.grid}>
            {storageOptions.map((option) => (
              <Checkbox
                key={option}
                label={option}
                checked={storage === option}
                onPress={() => setStorage(option)}
                style={styles.gridItem}
              />
            ))}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </ScrollView>
        <FixedFooter>
          <Button title="Cadastrar Produto" onPress={handleSubmit} loading={isSubmitting} disabled={isSubmitting || isPickingPhoto} />
        </FixedFooter>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: FOOTER_SPACE },
  photoBox: {
    height: 152,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primarySoft,
    backgroundColor: colors.primaryPale,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  photoPreview: { width: '100%', height: '100%' },
  photoActions: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginTop: -spacing.md, marginBottom: spacing.md, flexWrap: 'wrap' },
  photoAction: { flexDirection: 'row', alignItems: 'center', gap: 5, padding: spacing.sm },
  photoActionText: { ...typography.smallSemibold, color: colors.primary },
  scanHint: { ...typography.small, padding: spacing.sm, color: colors.textPrimary, backgroundColor: colors.primaryPale, marginBottom: spacing.md, borderRadius: radius.sm },
  photoSavedHint: { ...typography.caption, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.md },
  photoText: { ...typography.small, color: colors.primary, marginTop: spacing.xs },
  label: { ...typography.smallSemibold, color: colors.textPrimary, marginBottom: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.md },
  gridItem: { width: '50%', marginBottom: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  half: { flex: 1 },
  errorText: { ...typography.small, color: colors.danger, marginTop: spacing.xs },
});
