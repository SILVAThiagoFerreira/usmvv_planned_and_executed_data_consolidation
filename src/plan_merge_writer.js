export function serializePlanCsv(headers, rows, outputConfig) {
  const quote = outputConfig.quote_character;
  const separator = outputConfig.separator;
  const delimiter = outputConfig.delimiter_character;
  const lineEnding = outputConfig.line_ending;

  const escapeField = (input) => {
    const value = String(input ?? '');
    const requiresQuotes = value.includes(delimiter)
      || value.includes(quote)
      || value.includes('\r')
      || value.includes('\n')
      || value.trim() !== value;
    if (!requiresQuotes) return value;
    return `${quote}${value.split(quote).join(quote + quote)}${quote}`;
  };

  const records = [headers, ...rows].map((row) => row.map(escapeField).join(separator));
  const content = records.join(lineEnding) + lineEnding;
  return outputConfig.utf8_bom ? `\uFEFF${content}` : content;
}
