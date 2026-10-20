import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DocumentScanner from 'react-native-document-scanner-plugin';
import ImagePicker from 'react-native-image-crop-picker';
import TextRecognition from '@react-native-ml-kit/text-recognition';

import { generateXmlFromText } from './src/utils/xmlHelper';
import { sendXmlToWebhook } from './src/services/api';
import styles from './src/styles/App.styles';

type ImageFile = {
  path: string;
};

const MAX_PAGES = 10;

const App = () => {
  const [xml, setXml] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(
    'Відскануй накладну або вибери фотографії.',
  );
  const [error, setError] = useState('');

  const recognizeImages = async (images: ImageFile[]) => {
    if (!images.length) {
      setStatus('Зображення не вибрано.');
      return;
    }

    const selectedImages = images.slice(0, MAX_PAGES);

    setLoading(true);
    setError('');
    setXml('');
    setStatus(`Розпізнавання сторінок: ${selectedImages.length}...`);

    try {
      const recognizedPages: string[] = [];

      for (let index = 0; index < selectedImages.length; index += 1) {
        const path = selectedImages[index].path;

        if (!path) {
          continue;
        }

        const imageUri = path.startsWith('file://') ? path : `file://${path}`;

        const result = await TextRecognition.recognize(imageUri);

        recognizedPages.push(`\n--- Сторінка ${index + 1} ---\n${result.text}`);

        setStatus(`Розпізнано сторінок: ${index + 1}/${selectedImages.length}`);
      }

      const fullText = recognizedPages.join('\n');

      if (!fullText.trim()) {
        throw new Error(
          'OCR не знайшов тексту. Спробуй сфотографувати документ чіткіше.',
        );
      }

      const generatedXml = generateXmlFromText(fullText);

      setXml(generatedXml);
      setStatus(
        `Готово. Оброблено сторінок: ${recognizedPages.length}. Перевір XML перед відправленням.`,
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Невідома помилка OCR.';

      setError(message);
      setStatus('Не вдалося обробити документ.');
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async () => {
    try {
      setError('');
      setStatus('Відкриваємо сканер...');

      const result = await DocumentScanner.scanDocument({
        maxNumDocuments: MAX_PAGES,
        croppedImageQuality: 100,
      });

      if (!result.scannedImages || result.scannedImages.length === 0) {
        setStatus('Сканування скасовано або сторінок немає.');
        return;
      }

      await recognizeImages(
        result.scannedImages.map((path: string) => ({ path })),
      );
    } catch (e) {
      const message =
        e instanceof Error ? e.message : 'Не вдалося відкрити сканер.';

      setError(message);
      setStatus('Помилка сканування.');
    }
  };

  const handleGallery = async () => {
    try {
      setError('');

      const images = await ImagePicker.openPicker({
        multiple: true,
        mediaType: 'photo',
        maxFiles: MAX_PAGES,
        compressImageQuality: 1,
      });

      const selectedImages = Array.isArray(images) ? images : [images];

      await recognizeImages(
        selectedImages.map(image => ({ path: image.path })),
      );
    } catch (e) {
      const message =
        e instanceof Error ? e.message : 'Не вдалося вибрати фотографії.';

      if (
        message.toLowerCase().includes('cancel') ||
        message.toLowerCase().includes('user cancelled')
      ) {
        setStatus('Вибір фотографій скасовано.');
        return;
      }

      setError(message);
      setStatus('Помилка вибору фотографій.');
    }
  };

  const handleSend = async () => {
    if (!xml.trim()) {
      Alert.alert('Немає XML', 'Спочатку відскануй накладну.');
      return;
    }

    setSending(true);
    setError('');
    setStatus('Відправляємо XML на Webhook...');

    try {
      const result = await sendXmlToWebhook(xml, 'waybill.xml');

      setStatus(`Відправлено файл ${result.filename}. HTTP ${result.status}.`);

      Alert.alert('Успішно', `XML-файл відправлено. HTTP ${result.status}.`);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : 'Не вдалося відправити XML.';

      setError(message);
      setStatus('Помилка відправлення.');
    } finally {
      setSending(false);
    }
  };

  const renderButton = (
    title: string,
    onPress: () => void,
    buttonStyle: object,
    disabled: boolean,
  ) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        buttonStyle,
        disabled && styles.disabledButton,
        pressed && !disabled ? { opacity: 0.8 } : null,
      ]}
    >
      <Text style={styles.buttonText}>{title}</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#101318" />

      <View style={styles.container}>
        <Text style={styles.title}>Doc XML Scanner</Text>

        <Text style={styles.subtitle}>
          Сканування накладних, розпізнавання тексту та формування XML.
        </Text>

        {renderButton(
          'Сканувати документ (Камера)',
          handleScan,
          styles.scanButton,
          loading || sending,
        )}

        {renderButton(
          'Вибрати з Галереї / Файлів',
          handleGallery,
          styles.galleryButton,
          loading || sending,
        )}

        <Text style={styles.sectionTitle}>Попередній перегляд XML</Text>

        <ScrollView
          style={styles.xmlPreview}
          contentContainerStyle={{ flexGrow: 1 }}
          nestedScrollEnabled
        >
          {xml ? (
            <Text selectable style={styles.xmlText}>
              {xml}
            </Text>
          ) : (
            <Text style={styles.placeholder}>
              Тут з'явиться XML після сканування документа.
            </Text>
          )}
        </ScrollView>

        {loading ? (
          <ActivityIndicator
            size="small"
            color="#00FF66"
            style={{ marginTop: 12 }}
          />
        ) : null}

        {renderButton(
          sending ? 'Відправлення...' : 'Відправити XML на Webhook',
          handleSend,
          styles.sendButton,
          loading || sending || !xml,
        )}

        <Text style={[styles.status, error ? styles.error : null]}>
          {error || status}
        </Text>

        <Text style={styles.footer}>
          Перевір правильність розпізнаних даних перед відправленням.
        </Text>
      </View>
    </SafeAreaView>
  );
};

export default App;
