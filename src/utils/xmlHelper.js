import convert from 'xml-js';

const normalizeText = value =>
  String(value || '')
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim();

const escapeAttribute = value =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, '&apos;');

const parseNumber = value => {
  if (!value) {
    return null;
  }

  let normalized = String(value)
    .replace(/\s/g, '')
    .replace(/[^\d,.-]/g, '');

  if (!normalized || !/\d/.test(normalized)) {
    return null;
  }

  if (normalized.includes(',') && normalized.includes('.')) {
    if (normalized.lastIndexOf(',') > normalized.lastIndexOf('.')) {
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = normalized.replace(/,/g, '');
    }
  } else if (normalized.includes(',')) {
    normalized = normalized.replace(',', '.');
  }

  const result = Number(normalized);

  return Number.isFinite(result) ? result : null;
};

const formatMoney = value => (value === null ? '' : value.toFixed(2));

const findField = (text, patterns) => {
  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match && match[1]) {
      return normalizeText(match[1]);
    }
  }

  return '';
};

const extractHeader = rawText => {
  const text = normalizeText(rawText);

  const id = findField(text, [
    /(?:номер|№)\s*(?:накладної|накладной|документа)?\s*[:№#-]?\s*([A-ZА-ЯІЇЄ0-9][A-ZА-ЯІЇЄ0-9./_-]*)/i,
    /(?:накладна|накладная)\s*(?:№|номер)?\s*[:#-]?\s*([A-ZА-ЯІЇЄ0-9][A-ZА-ЯІЇЄ0-9./_-]*)/i,
    /(?:invoice|waybill)\s*(?:number|no\.?|#)?\s*[:#-]?\s*([A-Z0-9][A-Z0-9./_-]*)/i,
  ]);

  const date = findField(text, [
    /(?:дата|від|date)\s*[:№]?\s*(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/i,
    /(?:дата|date)\s*[:№]?\s*(\d{4}-\d{2}-\d{2})/i,
  ]);

  const totalText = findField(text, [
    /(?:всього до сплати|разом до сплати|сума до сплати|загальна сума|усього|всього|разом|total amount|grand total|total)\s*[:=]?\s*([\d\s.,]+)/i,
  ]);

  return {
    id: id || 'UNKNOWN',
    date: normalizeDate(date),
    total: parseNumber(totalText),
  };
};

const normalizeDate = value => {
  if (!value) {
    return '';
  }

  const match = value.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);

  if (!match) {
    return value;
  }

  let [, day, month, year] = match;

  if (year.length === 2) {
    year = Number(year) >= 70 ? `19${year}` : `20${year}`;
  }

  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

const extractItems = rawText => {
  const lines = String(rawText || '')
    .split(/\r?\n/)
    .map(normalizeText)
    .filter(Boolean);

  const items = [];
  let tableStarted = false;

  const headerPattern =
    /(?:№\s*з\/п|№|позиція|найменування|назва товару|кількість|ціна за одиницю|сума|quantity|unit price|amount)/i;

  const stopPattern =
    /(?:всього до сплати|разом до сплати|сума до сплати|загальна сума|підпис|печатка|усього|всього|разом|grand total|total amount)/i;

  for (const line of lines) {
    if (headerPattern.test(line)) {
      tableStarted = true;
      continue;
    }

    if (stopPattern.test(line)) {
      tableStarted = false;
      continue;
    }

    if (!tableStarted) {
      continue;
    }

    // Табличний рядок має починатися з номера позиції.
    const match = line.match(
      /^\s*(\d{1,4})[.)]?\s+(.+?)\s+(\d+(?:[.,]\d+)?)\s+([^\d\s]+)\s+([\d\s.,]+?)\s+([\d\s.,]+)\s*$/,
    );

    if (!match) {
      continue;
    }

    const [, position, name, quantity, unit, priceText, amountText] = match;
    const price = parseNumber(priceText);
    const amount = parseNumber(amountText);

    items.push({
      position: Number(position),
      name: normalizeText(name),
      quantity: parseNumber(quantity),
      unit: normalizeText(unit),
      price,
      amount,
    });
  }

  return items;
};

export const generateXmlFromText = rawText => {
  if (typeof rawText !== 'string' || !rawText.trim()) {
    throw new Error('Немає тексту для формування XML.');
  }

  const header = extractHeader(rawText);
  const items = extractItems(rawText);

  const document = {
    Waybill: {
      _attributes: {
        id: header.id,
      },
      Date: {
        _text: header.date,
      },
      Total: {
        _text: formatMoney(header.total),
      },
      Items: {
        Item: items.map(item => ({
          _attributes: {
            position: String(item.position),
          },
          Name: {
            _text: item.name,
          },
          Quantity: {
            _text: item.quantity === null ? '' : String(item.quantity),
          },
          Unit: {
            _text: item.unit,
          },
          Price: {
            _text: formatMoney(item.price),
          },
          Amount: {
            _text: formatMoney(item.amount),
          },
        })),
      },
    },
  };

  const xml = convert.js2xml(document, {
    compact: true,
    spaces: 2,
    ignoreComment: true,
    elementNameFn: name => name,
  });

  return `<?xml version="1.0" encoding="UTF-8"?>\n${xml}`;
};
