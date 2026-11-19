import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GradientHeader from '../../components/GradientHeader';
import ScreenContainer from '../../components/ScreenContainer';
import Button from '../../components/Button';
import StatusDot from '../../components/StatusDot';
import { usePantry } from '../../context/PantryContext';
import Input from '../../components/Input';
import colors from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';
import { brToISO, formatDateBR, getExpiryStatus } from '../../utils/date';
import { maskDateBR } from '../../utils/masks';

export default function ProductDetailScreen({ route, navigation }) {
  const { productId } = route.params;
  const { products, isLoading, updateProduct, updateQuantity, discardProduct, deleteProduct } = usePantry();
  const product = products.find((item) => item.id === productId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draft, setDraft] = useState(null);
  const [formError, setFormError] = useState(null);

  const status = product ? getExpiryStatus(product.expiryDate) : 'unknown';
  const isExpired = status === 'expired';

  const perform = async (action, title) => {
    setIsSubmitting(true);
    try {
      await action();
    } catch (e) {
      Alert.alert(title, e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = () => Alert.alert('Excluir produto', `Excluir "${product.name}" da despensa?`, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Excluir', style: 'destructive', onPress: () => perform(async () => {
      await deleteProduct(productId);
      navigation.goBack();
    }, 'Não foi possível excluir') },
  ]);

  const save = () => {
    const expiryDate = brToISO(draft.expiryDate);
    if (!draft.name.trim()) return setFormError('Informe o nome do produto.');
    if (!/^\d+$/.test(draft.quantity) || Number(draft.quantity) > 2147483647) {
      return setFormError('Informe uma quantidade inteira maior ou igual a zero.');
    }
    if (!expiryDate) return setFormError('Informe uma validade válida no formato DD/MM/AAAA.');
    setFormError(null);
    return perform(async () => {
      await updateProduct(productId, { name: draft.name, quantity: Number(draft.quantity), expiryDate });
      setDraft(null);
    }, 'Não foi possível salvar');
  };

  if (!product) {
    return (
      <View style={styles.loading}>
        {isLoading ? <ActivityIndicator color={colors.primary} size="large" /> : (
          <Button title="Produto indisponível. Voltar" onPress={() => navigation.goBack()} />
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GradientHeader title={product.name} showBack onBack={() => navigation.goBack()} />
      <ScreenContainer scroll style={styles.body} contentContainerStyle={styles.bodyContent}>
        <View style={styles.card}>
          <View style={styles.imageWrapper}>
            {product.imageUrl ? (
              <Image source={{ uri: product.imageUrl }} style={styles.image} resizeMode="cover" />
            ) : (
              <Ionicons name="cube-outline" size={48} color={colors.primary} />
            )}
            <View style={styles.dotWrapper}>
              <StatusDot status={status} size={14} />
            </View>
          </View>

          <Text style={styles.name}>{product.name}</Text>

          <InfoRow label="Marca" value={product.brand || '—'} />
          <InfoRow label="Categoria" value={product.category} />
          {product.barcode ? <InfoRow label="Código" value={product.barcode} /> : null}
          <InfoRow label="Comprado em" value={formatDateBR(product.purchaseDate)} />
          <InfoRow label="Validade" value={formatDateBR(product.expiryDate)} />
          {isExpired && <InfoRow label="Quantidade" value={product.quantity} />}

          {isExpired && (
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                Este produto está com a validade expirada. Ingeri-lo pode causar intoxicação e/ou outras complicações.
              </Text>
            </View>
          )}

          {draft ? (
            <View style={styles.actions}>
              <Input label="Nome" value={draft.name} onChangeText={(name) => setDraft({ ...draft, name })} />
              <Input label="Quantidade" keyboardType="numeric" value={draft.quantity} onChangeText={(quantity) => setDraft({ ...draft, quantity })} />
              <Input label="Validade" keyboardType="numeric" value={draft.expiryDate} onChangeText={(value) => setDraft({ ...draft, expiryDate: maskDateBR(value) })} maxLength={10} />
              {formError && <Text accessibilityRole="alert" style={styles.warningText}>{formError}</Text>}
              <Button title="Salvar alterações" onPress={save} loading={isSubmitting} />
              <Button title="Cancelar edição" variant="outline" disabled={isSubmitting} onPress={() => setDraft(null)} />
            </View>
          ) : isExpired && product.quantity > 0 ? (
            <Button title="Descartar e registrar perda" variant="danger" onPress={() => perform(async () => {
              await discardProduct(productId, 'expired');
              navigation.goBack();
            }, 'Não foi possível descartar')} loading={isSubmitting} />
          ) : isExpired ? null : (
            <View style={styles.stepperRow}>
              <Text style={styles.stepperLabel}>Quantidade</Text>
              <View style={styles.stepper}>
                <Button
                  title="–"
                  variant="outline"
                  style={styles.stepperButton}
                  onPress={() => perform(() => updateQuantity(productId, product.quantity - 1), 'Não foi possível atualizar')}
                  disabled={isSubmitting || product.quantity === 0}
                />
                <Text style={styles.quantity}>{product.quantity}</Text>
                <Button
                  title="+"
                  variant="outline"
                  style={styles.stepperButton}
                  onPress={() => perform(() => updateQuantity(productId, product.quantity + 1), 'Não foi possível atualizar')}
                  disabled={isSubmitting}
                />
              </View>
            </View>
          )}
          {!draft && (
            <View style={styles.actions}>
              <Button title="Editar produto" variant="outline" disabled={isSubmitting} onPress={() => {
                setFormError(null);
                setDraft({ name: product.name, quantity: String(product.quantity), expiryDate: formatDateBR(product.expiryDate) });
              }} />
              <Button title="Excluir produto" variant="danger" disabled={isSubmitting} onPress={confirmDelete} />
            </View>
          )}
        </View>
      </ScreenContainer>
    </View>
  );
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  body: { backgroundColor: 'transparent' },
  bodyContent: { padding: spacing.md, paddingBottom: 140 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: -spacing.xl,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  imageWrapper: {
    height: 140,
    borderRadius: radius.md,
    backgroundColor: colors.primaryPale,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  dotWrapper: { position: 'absolute', top: spacing.sm, left: spacing.sm },
  name: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.md },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.border },
  infoLabel: { ...typography.body, color: colors.textSecondary, flexShrink: 1, marginRight: spacing.sm },
  infoValue: { ...typography.bodySemibold, color: colors.textPrimary, flexShrink: 1, textAlign: 'right', maxWidth: '63%' },
  warningBox: { backgroundColor: colors.dangerLight, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md },
  warningText: { ...typography.small, color: colors.danger },
  stepperRow: { marginTop: spacing.lg, alignItems: 'center' },
  actions: { marginTop: spacing.lg, gap: spacing.sm },
  stepperLabel: { ...typography.smallSemibold, color: colors.textSecondary, marginBottom: spacing.sm },
  stepper: { flexDirection: 'row', alignItems: 'center' },
  stepperButton: { width: 48, paddingHorizontal: 0 },
  quantity: { ...typography.h2, color: colors.textPrimary, marginHorizontal: spacing.lg },
});
