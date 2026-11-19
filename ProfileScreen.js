import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, Alert, Image } from 'react-native';
import GradientHeader from '../../components/GradientHeader';
import ScreenContainer from '../../components/ScreenContainer';
import Input from '../../components/Input';
import Button from '../../components/Button';
import FixedFooter, { FOOTER_SPACE } from '../../components/FixedFooter';
import { useAuth } from '../../context/AuthContext';
import { getPlanRules } from '../../utils/permissions';
import { maskPhone, maskDateBR, isValidPhone, isValidEmail } from '../../utils/masks';
import { choosePhoto } from '../../utils/photo';
import { uploadProductImage } from '../../services/productsService';
import { brToISO, isoToBR, parseISODate } from '../../utils/date';
import colors from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';

export default function ProfileScreen({ navigation }) {
  const { user, updateUser, changePassword, requestEmailChange, deleteAccount } = useAuth();
  const rules = getPlanRules(user);
  const canChangePassword = user.provider === 'email';

  const initial = useMemo(
    () => ({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      phone: maskPhone(user.phone || ''),
      birthDate: user.birthDate ? isoToBR(user.birthDate) : '',
    }),
    [user.firstName, user.lastName, user.phone, user.birthDate]
  );

  const [firstName, setFirstName] = useState(initial.firstName);
  const [lastName, setLastName] = useState(initial.lastName);
  const [phone, setPhone] = useState(initial.phone);
  const [birthDate, setBirthDate] = useState(initial.birthDate);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [emailDraft, setEmailDraft] = useState(null);
  const [photoUri, setPhotoUri] = useState(null);
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState(null);

  const birthISO = brToISO(birthDate);
  const birthInvalid = birthDate.length > 0 && (!birthISO || parseISODate(birthISO).getTime() > Date.now());
  const phoneInvalid = phone.length > 0 && !isValidPhone(phone);
  const isValid = firstName.trim().length > 0 && !birthInvalid && !phoneInvalid;
  const isDirty =
    firstName !== initial.firstName ||
    lastName !== initial.lastName ||
    phone !== initial.phone ||
    birthDate !== initial.birthDate || !!photoUri;

  const handleSave = useCallback(async () => {
    setError(null);
    setIsSaving(true);
    try {
      const photoUrl = photoUri ? await uploadProductImage(user.id, photoUri) : user.photoUrl;
      await updateUser({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone,
        birthDate: birthISO,
        photoUrl,
      });
      setPhotoUri(null);
      Alert.alert('Perfil atualizado', 'Suas informações foram salvas com sucesso!');
    } catch (e) {
      setError(e.message);
    } finally {
      setIsSaving(false);
    }
  }, [updateUser, firstName, lastName, phone, birthISO, photoUri, user.id, user.photoUrl]);

  const handleChoosePhoto = async () => {
    try {
      const uri = await choosePhoto('Foto de perfil');
      if (uri) setPhotoUri(uri);
    } catch (e) {
      setError(e.message);
    }
  };

  const handleChangeEmail = async () => {
    setIsChangingEmail(true);
    try {
      await requestEmailChange(emailDraft);
      setEmailDraft(null);
      Alert.alert('Solicitação enviada', 'Confira o e-mail de confirmação. O endereço muda após a confirmação do Supabase.');
    } catch (e) {
      Alert.alert('Não foi possível alterar o e-mail', e.message);
    } finally {
      setIsChangingEmail(false);
    }
  };

  const confirmDelete = () => Alert.alert('Excluir minha conta', 'Sua conta, despensa, listas, histórico e fotos serão apagados permanentemente.', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Excluir conta', style: 'destructive', onPress: async () => {
      setIsDeleting(true);
      try {
        await deleteAccount();
      } catch (e) {
        Alert.alert('Não foi possível excluir a conta', e.message);
        setIsDeleting(false);
      }
    } },
  ]);

  const handleChangePassword = useCallback(async () => {
    setPasswordError(null);
    if (newPassword.length < 8) {
      setPasswordError('A nova senha precisa ter pelo menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('As senhas não conferem.');
      return;
    }
    setIsChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Senha alterada', 'Sua senha foi atualizada com sucesso!');
    } catch (e) {
      setPasswordError(e.message);
    } finally {
      setIsChangingPassword(false);
    }
  }, [changePassword, currentPassword, newPassword, confirmPassword]);

  return (
    <View style={styles.container}>
      <GradientHeader title="Meu perfil" showBack onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScreenContainer scroll style={styles.body} contentContainerStyle={styles.bodyContent}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Informações pessoais</Text>
            {(photoUri || user.photoUrl) && (
              <Image source={{ uri: photoUri || user.photoUrl }} style={{ width: 72, height: 72, borderRadius: 36, marginBottom: spacing.sm }} />
            )}
            <Button title="Escolher foto de perfil" variant="outline" onPress={handleChoosePhoto} />
            <Input label="E-mail" value={emailDraft ?? user.email ?? ''} keyboardType="email-address" onChangeText={setEmailDraft} />
            {emailDraft !== null && emailDraft.trim() !== user.email && (
              <Button title="Solicitar alteração de e-mail" variant="outline" onPress={handleChangeEmail}
                disabled={!isValidEmail(emailDraft) || isDeleting} loading={isChangingEmail} />
            )}
            <View style={styles.row}>
              <View style={styles.half}>
                <Input label="Nome" value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
              </View>
              <View style={styles.half}>
                <Input label="Sobrenome" value={lastName} onChangeText={setLastName} autoCapitalize="words" />
              </View>
            </View>
            <Input
              label="Celular"
              value={phone}
              onChangeText={(text) => setPhone(maskPhone(text))}
              placeholder="(11) 90000-0000"
              keyboardType="phone-pad"
              maxLength={15}
              error={phoneInvalid ? 'Informe DDD + número.' : null}
            />
            <Input
              label="Data de nascimento"
              value={birthDate}
              onChangeText={(text) => setBirthDate(maskDateBR(text))}
              placeholder="DD/MM/AAAA"
              keyboardType="numeric"
              maxLength={10}
              error={birthInvalid ? 'Data inválida.' : null}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Meu plano</Text>
            <Text style={styles.planName}>{rules.name}</Text>
            <Text style={styles.planHint}>
              {Number.isFinite(rules.maxProducts)
                ? `Até ${rules.maxProducts} produtos e ${rules.maxLists} listas de compras.`
                : 'Produtos e listas de compras ilimitados.'}
            </Text>
            <Button title="Alterar plano" variant="outline" textColor={colors.primary} onPress={() => navigation.navigate('Plans')} />
          </View>

          {canChangePassword ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Alterar senha</Text>
              <Input label="Senha atual" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry />
              <Input label="Nova senha" value={newPassword} onChangeText={setNewPassword} placeholder="Mín. 8 caracteres" secureTextEntry />
              <Input label="Confirmar nova senha" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry error={passwordError} />
              <Button
                title="Alterar senha"
                variant="outline"
                onPress={handleChangePassword}
                loading={isChangingPassword}
                disabled={!currentPassword || !newPassword || !confirmPassword}
              />
            </View>
          ) : null}
          <Button title="Excluir minha conta" variant="danger" loading={isDeleting}
            disabled={isSaving || isChangingPassword || isChangingEmail} onPress={confirmDelete} />
        </ScreenContainer>
        {isDirty ? (
          <FixedFooter>
            <Button title="Salvar alterações" onPress={handleSave} loading={isSaving} disabled={!isValid || isDeleting} />
          </FixedFooter>
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  body: { backgroundColor: 'transparent' },
  bodyContent: { padding: spacing.md, paddingTop: spacing.md, paddingBottom: FOOTER_SPACE },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardTitle: { ...typography.bodySemibold, color: colors.textPrimary, marginBottom: spacing.md },
  row: { flexDirection: 'row', gap: spacing.sm },
  half: { flex: 1 },
  planName: { ...typography.h3, color: colors.primary },
  planHint: { ...typography.small, color: colors.textSecondary, marginTop: 2, marginBottom: spacing.md },
  errorText: { ...typography.small, color: colors.danger },
});
