import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createStory,
  getReferenceData,
  updateProfile,
  uploadStoryImage,
} from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const stepTitles = [
  'Personal Details',
  'Lifestyle & Family',
  'Location',
  'Your Story',
];

const MAX_IMAGES = 5;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const CreateProfile = () => {
  const navigate = useNavigate();
  const { updateUser, user } = useAuth();
  const [step, setStep] = useState(1);
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [nationality, setNationality] = useState('');
  const [religion, setReligion] = useState('');
  const [race, setRace] = useState('');
  const [education, setEducation] = useState('');
  const [hasKids, setHasKids] = useState(null);
  const [numKids, setNumKids] = useState('');
  const [smoker, setSmoker] = useState(null);
  const [drinksAlcohol, setDrinksAlcohol] = useState(null);
  const [locationCity, setLocationCity] = useState('');
  const [locationProvince, setLocationProvince] = useState('');
  const [storyText, setStoryText] = useState('');
  const [images, setImages] = useState([]);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [statusMessage, setStatusMessage] = useState('');
  const [referenceData, setReferenceData] = useState(null);
  const [referenceLoading, setReferenceLoading] = useState(true);
  const [referenceError, setReferenceError] = useState('');
  const imagesRef = useRef([]);

  useEffect(() => {
    let mounted = true;

    const fetchReferenceData = async () => {
      setReferenceLoading(true);
      setReferenceError('');
      try {
        const data = await getReferenceData();
        if (mounted) {
          setReferenceData(data);
        }
      } catch (error) {
        if (mounted) {
          setReferenceError(error.message || 'Failed to load reference data.');
        }
      } finally {
        if (mounted) {
          setReferenceLoading(false);
        }
      }
    };

    fetchReferenceData();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    return () => {
      imagesRef.current.forEach((image) => URL.revokeObjectURL(image.preview));
    };
  }, []);

  const inputClass = (field) =>
    `mt-2 w-full rounded-xl border px-4 py-3 text-sm focus:border-emerald-400 focus:outline-none ${
      errors[field] ? 'border-red-300' : 'border-slate-200'
    }`;

  const validateStep1 = () => {
    const nextErrors = {};
    if (!age || Number(age) < 18) {
      nextErrors.age = 'Please enter a valid age (18+).';
    }
    if (!gender) {
      nextErrors.gender = 'Please select a gender.';
    }
    if (!nationality) {
      nextErrors.nationality = 'Please select a nationality.';
    }
    if (!religion) {
      nextErrors.religion = 'Please select a religion.';
    }
    if (!race) {
      nextErrors.race = 'Please select a race.';
    }
    if (!education) {
      nextErrors.education = 'Please select an education level.';
    }
    return nextErrors;
  };

  const validateStep2 = () => {
    const nextErrors = {};
    if (typeof hasKids !== 'boolean') {
      nextErrors.has_kids = 'Please tell us if you have kids.';
    }
    const kidsCount = Number(numKids || 0);
    if (![0, 1, 2, 3].includes(kidsCount)) {
      nextErrors.num_kids = 'Please select a valid number of kids.';
    }
    if (hasKids && kidsCount === 0) {
      nextErrors.num_kids = 'Please select the number of kids.';
    }
    if (typeof smoker !== 'boolean') {
      nextErrors.smoker = 'Please select an option.';
    }
    if (typeof drinksAlcohol !== 'boolean') {
      nextErrors.drinks_alcohol = 'Please select an option.';
    }
    return nextErrors;
  };

  const validateStep3 = () => {
    const nextErrors = {};
    if (!locationCity || !locationProvince) {
      nextErrors.location_city = 'Please select your city.';
    }
    return nextErrors;
  };

  const validateStep4 = () => {
    const nextErrors = {};
    if (storyText.trim().length < 50) {
      nextErrors.story_text = 'Story must be at least 50 characters.';
    }
    if (images.length < 1) {
      nextErrors.images = 'Upload at least one photo.';
    }
    if (images.length > MAX_IMAGES) {
      nextErrors.images = 'You can upload up to 5 photos.';
    }
    return nextErrors;
  };

  const validateCurrentStep = () => {
    if (step === 1) return validateStep1();
    if (step === 2) return validateStep2();
    if (step === 3) return validateStep3();
    return validateStep4();
  };

  const handleNext = () => {
    const nextErrors = validateCurrentStep();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});
    setStep((prev) => Math.min(prev + 1, 4));
  };

  const handleBack = () => {
    setErrors({});
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) {
      return;
    }

    const nextImages = [...images];
    let fileError = '';

    for (const file of files) {
      if (!ACCEPTED_TYPES.has(file.type)) {
        fileError = 'Only JPG, PNG, or WEBP files are allowed.';
        continue;
      }
      if (file.size > MAX_IMAGE_SIZE) {
        fileError = 'Each image must be smaller than 5MB.';
        continue;
      }
      if (nextImages.length >= MAX_IMAGES) {
        fileError = 'You can upload up to 5 photos.';
        break;
      }
      nextImages.push({ file, preview: URL.createObjectURL(file) });
    }

    setImages(nextImages);
    setErrors((prev) => ({ ...prev, images: fileError }));
    event.target.value = '';
  };

  const removeImage = (index) => {
    setImages((prev) => {
      const next = [...prev];
      const [removed] = next.splice(index, 1);
      if (removed?.preview) {
        URL.revokeObjectURL(removed.preview);
      }
      return next;
    });
  };

  const handleCityChange = (value) => {
    if (!value) {
      setLocationCity('');
      setLocationProvince('');
      return;
    }
    const [cityName, provinceName] = value.split('|||');
    setLocationCity(cityName || '');
    setLocationProvince(provinceName || '');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validateStep4();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setLoading(true);
    setFormError('');
    setStatusMessage('Uploading images...');
    setUploadProgress({ current: 0, total: images.length });

    try {
      const uploadedImageIds = [];
      const failedUploads = [];

      for (let i = 0; i < images.length; i += 1) {
        setUploadProgress({ current: i + 1, total: images.length });
        const formData = new FormData();
        formData.append('image', images[i].file);

        try {
          const response = await uploadStoryImage(formData);
          if (!response?.image_id) {
            throw new Error('Image upload failed.');
          }
          uploadedImageIds.push(response.image_id);
        } catch (error) {
          failedUploads.push(images[i].file?.name || `Image ${i + 1}`);
        }
      }

      if (uploadedImageIds.length === 0) {
        throw new Error('At least one image must upload successfully.');
      }

      if (failedUploads.length > 0) {
        setFormError(
          `Some images failed to upload and were skipped: ${failedUploads.join(', ')}.`
        );
      }

      setStatusMessage('Saving profile...');
      const profilePayload = {
        age: Number(age),
        gender,
        nationality,
        religion,
        race,
        education,
        has_kids: hasKids,
        num_kids: Number(numKids || 0),
        smoker,
        drinks_alcohol: drinksAlcohol,
        location_city: locationCity,
        location_province: locationProvince,
      };

      const profileResponse = await updateProfile(profilePayload);
      if (profileResponse?.user) {
        updateUser(profileResponse.user);
      } else if (profileResponse) {
        updateUser(profileResponse);
      } else {
        updateUser({ ...(user || {}), profile_complete: true });
      }

      setStatusMessage('Creating story...');
      await createStory({
        story_text: storyText.trim(),
        image_ids: uploadedImageIds,
      });

      setStatusMessage('Complete!');
      setTimeout(() => navigate('/landing'), 800);
    } catch (error) {
      setFormError(error.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedCityValue =
    locationCity && locationProvince
      ? `${locationCity}|||${locationProvince}`
      : '';

  const renderStepContent = () => {
    if (referenceLoading) {
      return (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-8 text-sm text-slate-500">
          Loading reference data...
        </div>
      );
    }

    if (referenceError) {
      return (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-sm text-red-600">
          {referenceError}
        </div>
      );
    }

    if (step === 1) {
      return (
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-slate-700">Age</label>
            <input
              type="number"
              min="18"
              value={age}
              onChange={(event) => setAge(event.target.value)}
              className={inputClass('age')}
              placeholder="18+"
            />
            {errors.age && (
              <p className="mt-2 text-xs text-red-600">{errors.age}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Gender</label>
            <select
              value={gender}
              onChange={(event) => setGender(event.target.value)}
              className={inputClass('gender')}
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="non-binary">Non-binary</option>
              <option value="other">Other</option>
            </select>
            {errors.gender && (
              <p className="mt-2 text-xs text-red-600">{errors.gender}</p>
            )}
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-slate-700">
              Nationality
            </label>
            <select
              value={nationality}
              onChange={(event) => setNationality(event.target.value)}
              className={inputClass('nationality')}
            >
              <option value="">Select nationality</option>
              <option value="South Africa">South Africa</option>
              <option value="Zimbabwe">Zimbabwe</option>
              <option value="Namibia">Namibia</option>
              <option value="Botswana">Botswana</option>
              <option value="Mozambique">Mozambique</option>
              <option value="Other">Other</option>
            </select>
            {errors.nationality && (
              <p className="mt-2 text-xs text-red-600">{errors.nationality}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Religion</label>
            <select
              value={religion}
              onChange={(event) => setReligion(event.target.value)}
              className={inputClass('religion')}
            >
              <option value="">Select religion</option>
              {(referenceData?.religions || []).map((option) => (
                <option key={option.id} value={option.name}>
                  {option.name}
                </option>
              ))}
            </select>
            {errors.religion && (
              <p className="mt-2 text-xs text-red-600">{errors.religion}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Race</label>
            <select
              value={race}
              onChange={(event) => setRace(event.target.value)}
              className={inputClass('race')}
            >
              <option value="">Select race</option>
              {(referenceData?.races || []).map((option) => (
                <option key={option.id} value={option.name}>
                  {option.name}
                </option>
              ))}
            </select>
            {errors.race && (
              <p className="mt-2 text-xs text-red-600">{errors.race}</p>
            )}
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-slate-700">
              Education level
            </label>
            <select
              value={education}
              onChange={(event) => setEducation(event.target.value)}
              className={inputClass('education')}
            >
              <option value="">Select education</option>
              {(referenceData?.education_levels || []).map((option) => (
                <option key={option.id} value={option.name}>
                  {option.name}
                </option>
              ))}
            </select>
            {errors.education && (
              <p className="mt-2 text-xs text-red-600">{errors.education}</p>
            )}
          </div>
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-slate-700">
              Do you have kids?
            </label>
            <select
              value={hasKids === null ? '' : hasKids ? 'yes' : 'no'}
              onChange={(event) => {
                const value = event.target.value;
                setHasKids(value === '' ? null : value === 'yes');
                if (value !== 'yes') {
                  setNumKids('0');
                }
              }}
              className={inputClass('has_kids')}
            >
              <option value="">Select option</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
            {errors.has_kids && (
              <p className="mt-2 text-xs text-red-600">{errors.has_kids}</p>
            )}
          </div>
          {hasKids && (
            <div>
              <label className="text-sm font-medium text-slate-700">
                Number of kids
              </label>
              <select
                value={numKids}
                onChange={(event) => setNumKids(event.target.value)}
                className={inputClass('num_kids')}
              >
                <option value="">Select count</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3+</option>
              </select>
              {errors.num_kids && (
                <p className="mt-2 text-xs text-red-600">{errors.num_kids}</p>
              )}
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-slate-700">Smoker</label>
            <select
              value={smoker === null ? '' : smoker ? 'yes' : 'no'}
              onChange={(event) =>
                setSmoker(event.target.value === '' ? null : event.target.value === 'yes')
              }
              className={inputClass('smoker')}
            >
              <option value="">Select option</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
            {errors.smoker && (
              <p className="mt-2 text-xs text-red-600">{errors.smoker}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Drinks alcohol</label>
            <select
              value={drinksAlcohol === null ? '' : drinksAlcohol ? 'yes' : 'no'}
              onChange={(event) =>
                setDrinksAlcohol(
                  event.target.value === '' ? null : event.target.value === 'yes'
                )
              }
              className={inputClass('drinks_alcohol')}
            >
              <option value="">Select option</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
            {errors.drinks_alcohol && (
              <p className="mt-2 text-xs text-red-600">{errors.drinks_alcohol}</p>
            )}
          </div>
        </div>
      );
    }

    if (step === 3) {
      return (
        <div>
          <label className="text-sm font-medium text-slate-700">City</label>
          <select
            value={selectedCityValue}
            onChange={(event) => handleCityChange(event.target.value)}
            className={inputClass('location_city')}
          >
            <option value="">Select city</option>
            {(referenceData?.cities || []).map((city) => (
              <option
                key={city.id}
                value={`${city.name}|||${city.province}`}
              >
                {city.name}, {city.province}
              </option>
            ))}
          </select>
          {errors.location_city && (
            <p className="mt-2 text-xs text-red-600">{errors.location_city}</p>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div>
          <label className="text-sm font-medium text-slate-700">Your story</label>
          <textarea
            value={storyText}
            onChange={(event) => setStoryText(event.target.value)}
            rows="6"
            className={`${inputClass('story_text')} resize-none`}
            placeholder="Share your story, values, and what you are hoping to find..."
          />
          {errors.story_text && (
            <p className="mt-2 text-xs text-red-600">{errors.story_text}</p>
          )}
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Photos</label>
          <div className="mt-2 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="block w-full text-sm text-slate-500 file:mr-4 file:rounded-xl file:border-0 file:bg-emerald-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-emerald-700 hover:file:bg-emerald-100"
            />
            <p className="mt-3 text-xs text-slate-400">
              Upload up to 5 photos. JPG, PNG, or WEBP, max 5MB each.
            </p>
          </div>
          {errors.images && (
            <p className="mt-2 text-xs text-red-600">{errors.images}</p>
          )}
        </div>
        {images.length > 0 && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {images.map((image, index) => (
              <div
                key={`${image.preview}-${index}`}
                className="group relative overflow-hidden rounded-2xl"
              >
                <img
                  src={image.preview}
                  alt={`Upload ${index + 1}`}
                  className="h-36 w-full rounded-2xl object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-200 via-sky-100 to-amber-100">
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-6 py-12">
        <div className="w-full rounded-3xl bg-white/80 p-8 shadow-2xl backdrop-blur md:p-10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-500">
                Guided Profile Setup
              </p>
              <h1 className="mt-3 text-2xl font-semibold text-slate-900 md:text-3xl">
                Step {step} of 4: {stepTitles[step - 1]}
              </h1>
            </div>
            <div className="flex gap-2">
              {stepTitles.map((_, index) => (
                <span
                  key={`step-dot-${index}`}
                  className={`h-2.5 w-2.5 rounded-full ${
                    index + 1 <= step ? 'bg-emerald-500' : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            {renderStepContent()}

            {formError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {formError}
              </div>
            )}

            {!formError && statusMessage && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {statusMessage}
              </div>
            )}

            {loading && uploadProgress.total > 0 && (
              <div className="text-sm text-slate-500">
                Uploading image {uploadProgress.current} of {uploadProgress.total}...
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={loading}
                  className="rounded-xl bg-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-300 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Back
                </button>
              ) : (
                <div />
              )}

              {step < 4 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={loading}
                  className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? 'Saving...' : 'Submit'}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateProfile;
