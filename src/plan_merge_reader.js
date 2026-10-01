function isLineBreak(character) {
  return character === '\r' || character === '\n';
}

function consumeLineBreak(text, index) {
  return text[index] === '\r' && text[index + 1] === '\n' ? index + 2 : index + 1;
}

export function parsePlanCsvText(text, inputConfig) {
  if (typeof text !== 'string' || !text.length) {
    throw new Error('The CSV file is empty.');
  }

  const delimiter = inputConfig.delimiter;
  const quoteCharacter = inputConfig.quote_character;
  if (typeof delimiter !== 'string' || delimiter.length !== 1) {
    throw new Error('The configured CSV delimiter must be one character.');
  }
  if (typeof quoteCharacter !== 'string' || quoteCharacter.length !== 1) {
    throw new Error('The configured CSV quote character must be one character.');
  }

  const records = [];
  let values = [];
  let value = '';
  let inQuotes = false;
  let quoteClosed = false;
  let recordHasContent = false;

  const finishField = () => {
    values.push(value);
    value = '';
    quoteClosed = false;
  };

  const finishRecord = () => {
    finishField();
    if (values.some((field) => field !== '')) records.push(values);
    values = [];
    recordHasContent = false;
  };

  for (let index = 0; index < text.length;) {
    const character = text[index];

    if (inQuotes) {
      if (character === quoteCharacter) {
        if (text[index + 1] === quoteCharacter) {
          value += quoteCharacter;
          index += 2;
          continue;
        }
        inQuotes = false;
        quoteClosed = true;
      } else {
        value += character;
      }
      index += 1;
      continue;
    }

    if (quoteClosed) {
      if (character === delimiter) {
        finishField();
        index += 1;
        continue;
      }
      if (isLineBreak(character)) {
        finishRecord();
        index = consumeLineBreak(text, index);
        continue;
      }
      if (inputConfig.skip_initial_space && character === ' ') {
        index += 1;
        continue;
      }
      throw new Error(`Unexpected character after a quoted CSV value at offset ${index}.`);
    }

    if (values.length > 0 && value === '' && inputConfig.skip_initial_space && character === ' ') {
      index += 1;
      continue;
    }
    if (character === quoteCharacter) {
      if (value !== '') throw new Error(`Unexpected quote inside an unquoted CSV value at offset ${index}.`);
      inQuotes = true;
      recordHasContent = true;
      index += 1;
      continue;
    }
    if (character === delimiter) {
      finishField();
      recordHasContent = true;
      index += 1;
      continue;
    }
    if (isLineBreak(character)) {
      finishRecord();
      index = consumeLineBreak(text, index);
      continue;
    }

    value += character;
    recordHasContent = true;
    index += 1;
  }

  if (inQuotes) throw new Error('The CSV file ends inside a quoted value.');
  if (recordHasContent || value !== '' || values.length > 0 || quoteClosed) finishRecord();
  if (!records.length) throw new Error('The CSV file does not contain a header or data rows.');

  if (records[0][0]?.startsWith('\uFEFF')) records[0][0] = records[0][0].slice(1);

  return {
    headers: records[0],
    rows: records.slice(1).map((row, index) => ({ recordNumber: index + 2, values: row })),
  };
}

export async function readPlanCsvFile(file, config) {
  const acceptedExtensions = config.files.plan_merge.accept
    .split(',')
    .map((extension) => extension.trim().toLocaleLowerCase());
  const extension = `.${file.name.split('.').at(-1).toLocaleLowerCase()}`;
  if (!acceptedExtensions.includes(extension)) {
    const error = new Error('Invalid CSV file extension.');
    error.code = 'plan_merge_invalid_extension';
    error.details = { fileName: file.name };
    throw error;
  }

  try {
    const parsed = parsePlanCsvText(await file.text(), config.plan_merge.input);
    return { fileName: file.name, ...parsed };
  } catch (cause) {
    const error = new Error('Invalid CSV structure.');
    error.code = 'plan_merge_invalid_csv';
    error.details = { fileName: file.name };
    error.cause = cause;
    throw error;
  }
}
