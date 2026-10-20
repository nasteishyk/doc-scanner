import Config from 'react-native-config';
import axios from 'axios';
import RNFS from 'react-native-fs';

const webhookUrl = Config.WEBHOOK_URL;
const timeout = Number(Config.API_TIMEOUT) || 10000;

export const sendXmlToWebhook = async (xmlData, filename = 'waybill.xml') => {
  if (!webhookUrl) {
    throw new Error('WEBHOOK_URL не задано у конфігурації.');
  }

  if (typeof xmlData !== 'string' || !xmlData.trim()) {
    throw new Error('XML порожній або має неправильний формат.');
  }

  const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `${RNFS.CachesDirectoryPath}/${safeFilename}`;

  await RNFS.writeFile(filePath, xmlData, 'utf8');

  const formData = new FormData();

  formData.append('file', {
    uri: `file://${filePath}`,
    type: 'application/xml',
    name: safeFilename,
  });

  try {
    const response = await axios.post(webhookUrl, formData, {
      timeout,
      headers: {
        Accept: 'application/json, text/plain, */*',
        'Content-Type': 'multipart/form-data',
      },
    });

    return {
      status: response.status,
      data: response.data,
      filename: safeFilename,
    };
  } catch (error) {
    if (error.response) {
      throw new Error(`Webhook повернув HTTP ${error.response.status}.`);
    }

    if (error.code === 'ECONNABORTED') {
      throw new Error('Час очікування відповіді Webhook вичерпано.');
    }

    throw new Error(error.message || 'Не вдалося відправити XML на Webhook.');
  } finally {
    // Файл у кеші більше не потрібен після завершення запиту.
    await RNFS.unlink(filePath).catch(() => {});
  }
};
