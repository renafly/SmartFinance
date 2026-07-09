import { useTranslation } from 'react-i18next';
import { Pressable, Text } from 'react-native';
import { AuthService } from '@/services/AuthService';

export default function SignOutButton() {
  const { t } = useTranslation('common');

  return (
    <Pressable onPress={() => AuthService.signOut()}>
      <Text>{t('logout')}</Text>
    </Pressable>
  );
}
