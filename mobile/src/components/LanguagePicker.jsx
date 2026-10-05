import { View } from 'react-native';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { Chips } from '../ui/index.jsx';

/** Sélecteur de langue compact (écrans de connexion / inscription). */
export default function LanguagePicker() {
  const { language, languages, setLanguage } = useLanguage();
  return (
    <View style={{ alignItems: 'center' }}>
      <Chips value={language} onChange={setLanguage} options={languages.map((item) => ({ value: item.code, label: item.label }))} />
    </View>
  );
}
