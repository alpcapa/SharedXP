export const getAgeFromBirthday = (birthdayValue) => {
  const normalizedBirthday = String(birthdayValue ?? "").trim();
  if (!normalizedBirthday) {
    return null;
  }

  let birthdayDate = null;
  // SharedXP stores birthday input in DD/MM/YYYY format.
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(normalizedBirthday)) {
    const [dayPart, monthPart, yearPart] = normalizedBirthday.split("/").map(Number);
    const parsedDate = new Date(yearPart, monthPart - 1, dayPart);
    if (
      parsedDate.getFullYear() === yearPart &&
      parsedDate.getMonth() === monthPart - 1 &&
      parsedDate.getDate() === dayPart
    ) {
      birthdayDate = parsedDate;
    }
  } else {
    const parsedTimestamp = Date.parse(normalizedBirthday);
    if (Number.isFinite(parsedTimestamp)) {
      birthdayDate = new Date(parsedTimestamp);
    }
  }

  if (!birthdayDate) {
    return null;
  }

  const now = new Date();
  if (birthdayDate > now) {
    return null;
  }

  let age = now.getFullYear() - birthdayDate.getFullYear();
  const monthDifference = now.getMonth() - birthdayDate.getMonth();
  if (monthDifference < 0 || (monthDifference === 0 && now.getDate() < birthdayDate.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
};

export const getProfileAge = (profile) => {
  const explicitAge = Number(profile?.age);
  if (Number.isFinite(explicitAge) && explicitAge > 0) {
    return Math.floor(explicitAge);
  }
  return getAgeFromBirthday(profile?.birthday ?? profile?.dateOfBirth ?? profile?.dob);
};
