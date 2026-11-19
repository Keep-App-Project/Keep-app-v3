import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch, Alert, Linking, Platform } from 'react-native';
import GradientHeader from '../../components/GradientHeader';
import ScreenContainer from '../../components/ScreenContainer';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { usePantry } from '../../context/PantryContext';
import {
  requestNotificationPermission, hasNotificationPermission,
  sendTestNotification, syncExpiryNotifications, getScheduledExpiryCount,
} from '../../services/notificationsService';
import colors from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';

export default function NotificationSettingsScreen({ navigation }) {
  const { user, updateUser } = useAuth();
  const { products } = usePantry();
  const [enabled, setEnabled] = useState(user?.notificationsEnabled ?? true);
  const [isSaving, setIsSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [scheduledCount, setScheduledCount] = useState(null);
  const isGuest = !!user?.isGuest;

  const refreshCount = useCallback(async () => {
    try { setScheduledCount(await getScheduledExpiryCount()); }
    catch { setScheduledCount(null); }
  }, []);

  useEffect(() => { setEnabled(user?.notificationsEnabled ?? true); }, [user?.notificationsEnabled]);
  useEffect(() => { refreshCount(); }, [refreshCount]);

  const handleToggle = useCallback(async (value) => {
    setIsSaving(true);
    try {
      if (value) {
        const allowed = (await hasNotificationPermission()) || (await requestNotificationPermission());
        if (!allowed) {
          Alert.alert('Permissão necessária',
            'Permita as notificações do Keep nas configurações do aparelho.', [
              { text: 'Agora não', style: 'cancel' },
              { text: 'Abrir configurações', onPress: () => Linking.openSettings() },
            ]);
          return;
        }
      }
      await updateUser({ notificationsEnabled: value });
      setEnabled(value);
      await syncExpiryNotifications(products, value, { batch: user?.plan === 'business' });
      await refreshCount();
    } catch (error) {
      Alert.alert('Não foi possível salvar', error.message);
    } finally { setIsSaving(false); }
  }, [products, refreshCount, updateUser, user?.plan]);

  const handleTest = useCallback(async () => {
    setTesting(true);
    try {
      await sendTestNotification();
      Alert.alert('Teste agendado',
        'Uma notificação com título e descrição será enviada em aproximadamente 3 segundos. Confira a barra de notificações do Android.');
    } catch (error) {
      Alert.alert('Não foi possível testar', error.message, [
        { text: 'OK' },
        { text: 'Configurações', onPress: () => Linking.openSettings() },
      ]);
    } finally { setTesting(false); }
  }, []);

  return (
    <View style={styles.container}>
      <GradientHeader title="Notificações" showBack onBack={() => navigation.goBack()} />
      <ScreenContainer scroll style={styles.body} contentContainerStyle={styles.bodyContent}>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Alertas de validade</Text>
            <Text style={styles.rowDescription}>
              {isGuest ? 'Entre na sua conta para receber avisos de validade.'
                : user?.plan === 'business'
                  ? 'Às 9h, produtos com aviso na mesma data são reunidos em uma notificação.'
                  : 'Avisos às 9h, até 3 dias antes e no dia do vencimento.'}
            </Text>
          </View>
          <Switch value={enabled && !isGuest} onValueChange={handleToggle}
            disabled={isSaving || isGuest}
            trackColor={{ false: colors.disabled, true: colors.primarySoft }}
            thumbColor={enabled ? colors.primary : colors.white} />
        </View>
        {!isGuest && (
          <View style={styles.testCard}>
            <Text style={styles.rowTitle}>Verificar notificações</Text>
            <Text style={styles.rowDescription}>
              Toque para receber um aviso de teste. Ele deve mostrar um título e uma mensagem completa, não apenas o nome Keep.
            </Text>
            <Button title="Enviar notificação de teste" icon="notifications-outline"
              onPress={handleTest} loading={testing} style={styles.testButton} />
            <Text style={styles.meta}>
              {scheduledCount == null ? 'Avisos futuros: indisponível'
                : `Avisos de validade agendados: ${scheduledCount}`}
            </Text>
            <Text style={styles.help}>
              {Platform.OS === 'android'
                ? 'Se aparecer apenas “Keep”, expanda a notificação e verifique se o Android está ocultando o conteúdo nas configurações de notificações e da tela bloqueada.'
                : 'Se o alerta não aparecer, verifique as permissões de notificações do aparelho.'}
            </Text>
            <Button title="Atualizar contagem" variant="outline"
              onPress={refreshCount} style={styles.refreshButton} />
          </View>
        )}
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  body: { backgroundColor: 'transparent' },
  bodyContent: { padding: spacing.md, paddingBottom: spacing.xxl },
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card,
    borderRadius: radius.lg, padding: spacing.md,
  },
  rowText: { flex: 1, marginRight: spacing.md },
  rowTitle: { ...typography.bodySemibold, color: colors.textPrimary },
  rowDescription: { ...typography.small, color: colors.textSecondary, marginTop: spacing.sm },
  testCard: { marginTop: spacing.md, backgroundColor: colors.card,
    borderRadius: radius.lg, padding: spacing.md },
  testButton: { marginTop: spacing.md },
  meta: { ...typography.small, color: colors.textPrimary, marginTop: spacing.md },
  help: { ...typography.small, color: colors.textSecondary, marginTop: spacing.sm },
  refreshButton: { marginTop: spacing.md },
});
