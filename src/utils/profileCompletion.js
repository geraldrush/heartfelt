export const getProfileCompletion = (user) => {
  if (!user) {
    return { percent: 0, missing: [] };
  }

  const checks = [
    { key: 'age', label: 'Age', valid: Number(user.age) >= 18 },
    { key: 'gender', label: 'Gender', valid: Boolean(user.gender) },
    { key: 'seeking_gender', label: 'Looking for', valid: Boolean(user.seeking_gender) },
    { key: 'location_city', label: 'City', valid: Boolean(user.location_city) },
    { key: 'location_province', label: 'Province', valid: Boolean(user.location_province) },
    { key: 'nationality', label: 'Nationality', valid: Boolean(user.nationality) },
    { key: 'religion', label: 'Religion', valid: Boolean(user.religion) },
    { key: 'race', label: 'Race', valid: Boolean(user.race) },
    { key: 'education', label: 'Education', valid: Boolean(user.education) },
    { key: 'has_kids', label: 'Kids', valid: typeof user.has_kids === 'boolean' },
    {
      key: 'num_kids',
      label: 'Number of kids',
      valid:
        user.has_kids === true || user.has_kids === 1
          ? Number.isFinite(Number(user.num_kids))
          : true,
    },
    { key: 'smoker', label: 'Smoker', valid: typeof user.smoker === 'boolean' },
    { key: 'drinks_alcohol', label: 'Drinks alcohol', valid: typeof user.drinks_alcohol === 'boolean' },
    { key: 'seeking_age_min', label: 'Seeking min age', valid: Number.isFinite(Number(user.seeking_age_min)) },
    { key: 'seeking_age_max', label: 'Seeking max age', valid: Number.isFinite(Number(user.seeking_age_max)) },
    {
      key: 'seeking_races',
      label: 'Seeking races',
      valid: Array.isArray(user.seeking_races) ? user.seeking_races.length > 0 : Boolean(user.seeking_races),
    },
  ];

  const completedCount = checks.filter((check) => check.valid).length;
  const percent = Math.round((completedCount / checks.length) * 100);
  const missing = checks.filter((check) => !check.valid).map((check) => check.label);

  return { percent, missing };
};

export const isBasicProfileComplete = (user) => {
  if (!user) return false;
  return Number(user.age) >= 18 && Boolean(user.gender) && Boolean(user.seeking_gender);
};
