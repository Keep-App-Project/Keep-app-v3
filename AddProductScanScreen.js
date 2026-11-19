import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, Linking, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import GradientHeader from '../../components/GradientHeader';
import Input from '../../components/Input';
import Button from '../../components/Button';
import FixedFooter, { FOOTER_SPACE } from '../../components/FixedFooter';
import * as productsService from '../../services/productsService';
import colors from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';
import { brToISO } from '../../utils/date';
import { maskDateBR } from '../../utils/masks';
import { normalizeBarcode, BARCODE_TYPES } from '../../utils/barcode';

function PhotoBox({ icon, label, onPress }) {
  return (
    <TouchableOpacity style={styles.photoBox} onPress={onPress} activeOpacity={0.85}>
      <Ionicons name={icon} size={24} color={colors.primary} />
      <Text style={styles.photoText}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function AddProductScanScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [barcode, setBarcode] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [nativeScanning, setNativeScanning] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraIssue, setCameraIssue] = useState('');
  const [cameraKey, setCameraKey] = useState(0);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const scannedRef = useRef(false);
  const nativeSubscriptionRef = useRef(null);

  const expiryISO = brToISO(expiryDate);

  const stopNativeScanner = useCallback(() => {
    nativeSubscriptionRef.current?.remove();
    nativeSubscriptionRef.current = null;
  }, []);
  useEffect(() => () => stopNativeScanner(), [stopNativeScanner]);
  // Some Android devices leave the CameraView black without raising onMountError.
  // Show a visible recovery path instead of an indefinite empty black screen.
  useEffect(() => {
    if (!isScanning || cameraReady || cameraIssue) return undefined;
    const timeout = setTimeout(() => setCameraIssue('A câmera não iniciou. Tente novamente ou digite o código.'), 7000);
    return () => clearTimeout(timeout);
  }, [isScanning, cameraReady, cameraIssue]);

  // Código lido é encaminhado ao cadastro mesmo que a API de produtos esteja fora do ar.
  // Antes, o aviso "produto não encontrado" parecia que a leitura tinha falhado.
  const findProduct = useCallback(async (rawCode) => {
    const code = normalizeBarcode(rawCode);
    if (!code) {
      setError('Código inválido. Digite ou escaneie um código válido.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await productsService.lookupBarcode(code);
      navigation.replace('AddProductManual', {
        prefill: {
          ...(result.product || {}),
          barcode: code,
          expiryDate: expiryISO,
          scanMessage: result.found
            ? 'Produto identificado pelo código de barras. Confira os dados e cadastre.'
            : 'Código lido com sucesso! Preencha o nome e os demais dados para cadastrar.',
        },
      });
    } catch (e) {
      // Consulta é opcional: nada impede cadastrar o código já reconhecido.
      navigation.replace('AddProductManual', {
        prefill: { barcode: code, expiryDate: expiryISO,
          scanMessage: 'Código lido! Complete os dados para cadastrar o produto.' },
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [expiryISO, navigation]);

  const handleBarcode = useCallback((event) => {
    if (scannedRef.current) return;
    const code = normalizeBarcode(event?.data);
    if (!code) return;
    scannedRef.current = true;
    stopNativeScanner();
    setBarcode(code);
    setIsScanning(false);
    setNativeScanning(false);
    findProduct(code);
  }, [findProduct, stopNativeScanner]);

  const startEmbeddedScanner = useCallback(() => {
    stopNativeScanner();
    scannedRef.current = false;
    setError(null);
    setNativeScanning(false);
    setCameraReady(false);
    setCameraIssue('');
    setCameraKey((value) => value + 1);
    setTorchEnabled(false);
    setIsScanning(true);
  }, [stopNativeScanner]);

  const handleOpenScanner = useCallback(async (preferEmbedded = false) => {
    if (isSubmitting || nativeScanning) return;
    let current;
    try {
      current = permission?.granted ? permission : await requestPermission();
    } catch (e) {
      setError(`Não foi possível solicitar acesso à câmera: ${e?.message || 'erro desconhecido'}`);
      return;
    }
    if (!current?.granted) {
      Alert.alert('Permissão da câmera',
        'Autorize a câmera nas configurações do celular, ou digite o código manualmente.', [
          { text: 'Cancelar', style: 'cancel' },
          ...(!current?.canAskAgain ? [{ text: 'Abrir configurações', onPress: () => Linking.openSettings() }] : []),
        ]);
      return;
    }
    if (preferEmbedded || Platform.OS !== 'android' ||
      !CameraView.isModernBarcodeScannerAvailable ||
      typeof CameraView.launchScanner !== 'function' ||
      typeof CameraView.onModernBarcodeScanned !== 'function') {
      startEmbeddedScanner();
      return;
    }
    scannedRef.current = false;
    setError(null);
    setNativeScanning(true);
    try {
      // Scanner do Google ML Kit no Android, independente da área de preview da CameraView.
      nativeSubscriptionRef.current = CameraView.onModernBarcodeScanned(handleBarcode);
      await CameraView.launchScanner({ barcodeTypes: BARCODE_TYPES });
    } catch (e) {
      // Em aparelhos sem o scanner nativo disponível, usa automaticamente CameraView.
      if (!scannedRef.current) {
        startEmbeddedScanner();
      }
    } finally {
      stopNativeScanner();
      setNativeScanning(false);
    }
  }, [permission, requestPermission, isSubmitting, nativeScanning,
    startEmbeddedScanner, handleBarcode, stopNativeScanner]);

  if (isScanning) {
    return (
      <View style={styles.container}>
        <GradientHeader title="Escanear Produto" showBack onBack={() => setIsScanning(false)} />
        <View style={styles.cameraWrapper}>
          <CameraView
            key={cameraKey}
            style={StyleSheet.absoluteFillObject}
            facing="back"
            enableTorch={torchEnabled}
            barcodeScannerSettings={{ barcodeTypes: BARCODE_TYPES }}
            onBarcodeScanned={handleBarcode}
            onCameraReady={() => setCameraReady(true)}
            onMountError={(event) => {
              setTorchEnabled(false);
              setCameraIssue(event?.message || 'Não foi possível iniciar a câmera. Tente novamente ou digite o código.');
            }}
          />
          <View pointerEvents="none" style={styles.frame} />
          <Text pointerEvents="none" style={styles.hint}>
            {cameraIssue || (cameraReady ? 'Aponte para o código de barras do produto' : 'Iniciando a câmera...')}
          </Text>
          {cameraIssue ? (
            <TouchableOpacity style={styles.retryButton} onPress={() => {
              setCameraIssue('');
              setCameraReady(false);
              setCameraKey((value) => value + 1);
            }}>
              <Ionicons name="refresh" size={18} color={colors.white} />
              <Text style={styles.torchText}>Tentar novamente</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={styles.torchButton} onPress={() => setTorchEnabled((on) => !on)} accessibilityLabel="Ligar ou desligar a lanterna">
            <Ionicons name={torchEnabled ? 'flash' : 'flash-outline'} size={22} color={colors.white} />
            <Text style={styles.torchText}>{torchEnabled ? 'Desligar luz' : 'Ligar luz'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.manualExitButton} onPress={() => { setIsScanning(false); setTorchEnabled(false); }}>
            <Text style={styles.torchText}>Digitar código manualmente</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GradientHeader title="Escanear Produto" showBack onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.sectionHeader}>
            <Ionicons name="barcode-outline" size={18} color={colors.textPrimary} />
            <Text style={styles.sectionTitle}>Código de barras</Text>
          </View>
          <PhotoBox icon="camera-outline" label={nativeScanning ? 'Abrindo leitor...' : 'Escanear código com a câmera'} onPress={() => handleOpenScanner()} />
          {nativeScanning || isSubmitting ? <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.sm }} /> : null}
          <TouchableOpacity style={{ paddingVertical: spacing.sm }} onPress={() => handleOpenScanner(true)} disabled={nativeScanning || isSubmitting}>
            <Text style={{ color: colors.primary, textAlign: 'center' }}>Usar leitor alternativo na tela</Text>
          </TouchableOpacity>
          <Text style={styles.orText}>Ou digite manualmente</Text>
          <Input value={barcode} onChangeText={(value) => { setBarcode(value); if (error) setError(null); }} placeholder="7891234567890" keyboardType="numeric" error={error} />

          <View style={styles.sectionHeader}>
            <Ionicons name="calendar-outline" size={18} color={colors.textPrimary} />
            <Text style={styles.sectionTitle}>Data de validade</Text>
          </View>
          <Input
            value={expiryDate}
            onChangeText={(text) => setExpiryDate(maskDateBR(text))}
            placeholder="DD/MM/AAAA"
            keyboardType="numeric"
            maxLength={10}
            error={expiryDate.length === 10 && !expiryISO ? 'Data inválida' : null}
          />
        </ScrollView>
        <FixedFooter>
          <Button title="Buscar produto" onPress={() => findProduct(barcode)} loading={isSubmitting} disabled={isSubmitting || nativeScanning || !barcode.trim() || (expiryDate.length > 0 && !expiryISO)} />
        </FixedFooter>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: FOOTER_SPACE },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
  sectionTitle: { ...typography.bodySemibold, color: colors.textPrimary },
  photoBox: {
    height: 90,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primarySoft,
    backgroundColor: colors.primaryPale,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  photoText: { ...typography.small, color: colors.primary, marginTop: spacing.xs },
  orText: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.xs },
  manualExitButton: { position: 'absolute', bottom: 16, alignSelf: 'center', backgroundColor: '#343434', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, minHeight: 48, justifyContent: 'center' },
  retryButton: { position: 'absolute', top: '62%', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: '#343434', borderRadius: radius.md },
  // Android camera SurfaceViews can render black when parent overflow clips rounded borders.
  cameraWrapper: { flex: 1, margin: spacing.md, backgroundColor: colors.black },
  frame: {
    position: 'absolute',
    top: '35%',
    left: '10%',
    right: '10%',
    height: 100,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: radius.md,
  },
  torchButton: {
    position: 'absolute', top: spacing.md, right: spacing.md,
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    padding: spacing.sm, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: radius.md,
  },
  torchText: { ...typography.smallSemibold, color: colors.white },
  hint: {
    position: 'absolute',
    bottom: 82,
    left: spacing.lg,
    right: spacing.lg,
    ...typography.small,
    color: colors.white,
    textAlign: 'center',
  },
});
