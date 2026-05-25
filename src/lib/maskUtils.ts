export const maskSensitiveData = (text: string, loggedIn: boolean): string => {
  if (!text) return '';
  if (loggedIn) return text;

  let masked = text;

  // 1. Match typical HN patterns, e.g. HN followed by numbers or symbols and alphanumeric code.
  masked = masked.replace(/(HN|H\.N\.)\s*[:\-\s]*\s*([a-zA-Z0-9\-\/]+)/gi, (match, prefix, val) => {
    return 'HN: ****';
  });

  // 2. Match typical LN patterns, e.g. LN: 12345, LN 4567-89, etc.
  masked = masked.replace(/(LN|L\.N\.)\s*[:\-\s]*\s*([a-zA-Z0-9\-\/]+)/gi, (match, prefix, val) => {
    return 'LN: ****';
  });

  // 3. Match Patient Name starting with prefix (นาย, นาง, นางสาว, น.ส., นส., ด.ช., ด.ญ., ดช., ดญ., เด็กชาย, เด็กหญิง) and Thai alphabet
  masked = masked.replace(/(นาย|นาง|นางสาว|น\.ส\.|นส\.|ด\.ช\.|ด\.ญ\.|ดช\.|ดญ\.|เด็กชาย|เด็กหญิง)\s*([ก-๙]+)(?:\s+([ก-๙]+))?/g, (match, prefix, firstName, lastName) => {
    if (lastName) {
      return `${prefix} **** ****`;
    }
    return `${prefix} ****`;
  });

  // 4. Match "คนไข้ชื่อ", "ชื่อคนไข้", "ชื่อผู้ป่วย" followed by Thai alphabet (optional prefix, first name, last name)
  masked = masked.replace(/(คนไข้ชื่อ|ชื่อคนไข้|ชื่อผู้ป่วย|ชื่อ)\s*(นาย|นาง|นางสาว|น\.ส\.|นส\.|ด\.ช\.|ด\.ญ\.|ดช\.|ดญ\.|เด็กชาย|เด็กหญิง)?\s*([ก-๙]+)(?:\s+([ก-๙]+))?/g, (match, label, prefix, firstName, lastName) => {
    const pref = prefix || '';
    if (lastName) {
      return `${label} ${pref} **** ****`.replace(/\s+/g, ' ');
    }
    return `${label} ${pref} ****`.replace(/\s+/g, ' ');
  });

  return masked;
};
