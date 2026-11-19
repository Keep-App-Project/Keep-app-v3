import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';

export default function AddProductChoiceScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  return (
    <Pressable style={styles.backdrop} onPress={() => navigation.goBack()}>
      <Pressable style={[styles.panel, { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.md }]} onPress={(event) => event.stopPropagation()}>
        <View style={styles.handle} />
        <Text style={styles.title}>Registre um novo produto</Text>
        <TouchableOpacity style={styles.option} onPress={() => navigation.replace('AddProductScan')} activeOpacity={0.8}>
          <Ionicons name="barcode-outline" size={24} color={colors.primary} />
          <Text style={styles.optionText}>Escanear código de barras</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.option} onPress={() => navigation.replace('AddProductManual')} activeOpacity={0.8}>
          <Ionicons name="create-outline" size={24} color={colors.primary} />
          <Text style={styles.optionText}>Cadastrar manualmente</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancel} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Cancelar</Text>
        </TouchableOpacity>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.48)', justifyContent: 'flex-end' },
  panel: { backgroundColor: colors.white, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg },
  handle: { width: 44, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.lg },
  title: { ...typography.h3, color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.lg },
  option: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.md, backgroundColor: colors.primaryPale, paddingHorizontal: spacing.md, minHeight: 62, marginBottom: spacing.sm },
  optionText: { ...typography.bodySemibold, color: colors.textPrimary, flex: 1 },
  cancel: { alignItems: 'center', paddingVertical: spacing.md, marginTop: spacing.sm },
  cancelText: { ...typography.bodySemibold, color: colors.textSecondary },
});
