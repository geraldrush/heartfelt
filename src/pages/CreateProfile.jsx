import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FaHeart, FaShieldAlt, FaUsers, FaEye, FaEyeSlash, FaBook, FaCamera, FaCheckCircle, FaInfoCircle, FaGlobe } from "react-icons/fa";
import {
  createStory,
  getReferenceData,
  updateProfile,
  uploadStoryImage,
  emailSignup,
} from "../utils/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { detectAndBlurFaces } from "../utils/faceBlur.js";

const stepTitles = [
  "Who you're seeking",
  "Your Story - The Heart of Your Profile",
  "Photos with Privacy - Faces Blurred Until You Connect",
  "About You - Let's Get to Know You",
  "Your Background - Share Your Roots",
  "Secure Your Account - Almost There!",
];

const MAX_IMAGES = 5;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const CreateProfile = () => {
  const navigate = useNavigate();
  const { updateUser, user, login } = useAuth();
  const [step, setStep] = useState(1);
  const [isGoogleSignup, setIsGoogleSignup] = useState(!!user);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [nationality, setNationality] = useState("");
  const [religion, setReligion] = useState("");
  const [race, setRace] = useState("");
  const [education, setEducation] = useState("");
  const [hasKids, setHasKids] = useState(null);
  const [numKids, setNumKids] = useState("");
  const [smoker, setSmoker] = useState(null);
  const [drinksAlcohol, setDrinksAlcohol] = useState(null);
  const [locationCity, setLocationCity] = useState("");
  const [locationProvince, setLocationProvince] = useState("");
  const [storyText, setStoryText] = useState("");
  const [images, setImages] = useState([]);
  const [seekingGender, setSeekingGender] = useState('');
  const [seekingAgeMin, setSeekingAgeMin] = useState('');
  const [seekingAgeMax, setSeekingAgeMax] = useState('');
  const [seekingRaces, setSeekingRaces] = useState([]);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({
    current: 0,
    total: 0,
  });
  const [statusMessage, setStatusMessage] = useState("");
  const [referenceData, setReferenceData] = useState(null);
  const [referenceLoading, setReferenceLoading] = useState(true);
  const [referenceError, setReferenceError] = useState("");
  const imagesRef = useRef([]);

  const [showSidebar, setShowSidebar] = useState(false);

  // Update document title
  useEffect(() => {
    document.title = 'Sign Up - AfroDate | Create Your Profile';
  }, []);

  const updateImageById = (id, updater) => {
    setImages((prev) =>
      prev.map((image) => (image.id === id ? updater(image) : image)),
    );
  };

  useEffect(() => {
    let mounted = true;

    const fetchReferenceData = async () => {
      setReferenceLoading(true);
      setReferenceError("");
      try {
        const data = await getReferenceData();
        if (mounted) {
          setReferenceData(data);
        }
      } catch (error) {
        if (mounted) {
          setReferenceError(error.message || "Failed to load reference data.");
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
      errors[field] ? "border-red-300" : "border-slate-200"
    }`;

  const validateStep1 = () => {
    const nextErrors = {};
    if (!seekingGender) {
      nextErrors.seeking_gender = "Help us find your perfect match - who are you looking for?";
    }
    const minAge = Number(seekingAgeMin);
    const maxAge = Number(seekingAgeMax);
    if (!seekingAgeMin || minAge < 18) {
      nextErrors.seeking_age_min = "Please enter minimum age (18+).";
    }
    if (!seekingAgeMax || maxAge < 18) {
      nextErrors.seeking_age_max = "Please enter maximum age (18+).";
    }
    if (minAge > maxAge) {
      nextErrors.seeking_age_max = "Maximum age must be greater than minimum.";
    }
    if (seekingRaces.length === 0) {
      nextErrors.seeking_races = "Please select at least one race preference.";
    }
    return nextErrors;
  };

  const validateStep2 = () => {
    const nextErrors = {};
    if (storyText.trim().length < 50) {
      nextErrors.story_text = "Share more about yourself! Your story helps others connect with the real you (at least 50 characters)";
    }
    return nextErrors;
  };

  const validateStep3 = () => {
    const nextErrors = {};
    if (images.length < 1) {
      nextErrors.images = "Add photos to complete your profile. Don't worry, we'll blur faces automatically!";
    }
    if (images.length > MAX_IMAGES) {
      nextErrors.images = "You can upload up to 5 photos.";
    }
    return nextErrors;
  };

  const validateStep4 = () => {
    const nextErrors = {};
    if (!age || Number(age) < 18) {
      nextErrors.age = "Please enter a valid age (18+).";
    }
    if (!gender) {
      nextErrors.gender = "Please select a gender.";
    }
    if (!locationCity || !locationProvince) {
      nextErrors.location_city = "Please select your city.";
    }
    return nextErrors;
  };

  const validateStep5 = () => {
    const nextErrors = {};
    if (!nationality) {
      nextErrors.nationality = "Please select a nationality.";
    }
    if (!religion) {
      nextErrors.religion = "Please select a religion.";
    }
    if (!race) {
      nextErrors.race = "Please select a race.";
    }
    if (!education) {
      nextErrors.education = "Please select an education level.";
    }
    if (typeof hasKids !== "boolean") {
      nextErrors.has_kids = "Please tell us if you have kids.";
    }
    const kidsCount = Number(numKids || 0);
    if (![0, 1, 2, 3].includes(kidsCount)) {
      nextErrors.num_kids = "Please select a valid number of kids.";
    }
    if (hasKids && kidsCount === 0) {
      nextErrors.num_kids = "Please select the number of kids.";
    }
    if (typeof smoker !== "boolean") {
      nextErrors.smoker = "Please select an option.";
    }
    if (typeof drinksAlcohol !== "boolean") {
      nextErrors.drinks_alcohol = "Please select an option.";
    }
    return nextErrors;
  };

  const validateStep6 = () => {
    const nextErrors = {};
    if (!email) {
      nextErrors.email = "Please enter your email.";
    }
    if (!password || password.length < 6) {
      nextErrors.password = "Password must be at least 6 characters.";
    }
    if (password !== confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }
    return nextErrors;
  };

  const validateCurrentStep = () => {
    if (step === 1) return validateStep1();
    if (step === 2) return validateStep2();
    if (step === 3) return validateStep3();
    if (step === 4) return validateStep4();
    if (step === 5) return validateStep5();
    return validateStep6();
  };

  const handleNext = () => {
    const nextErrors = validateCurrentStep();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});
    setStep((prev) => Math.min(prev + 1, isGoogleSignup ? 5 : 6));
  };

  const handleBack = () => {
    setErrors({});
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const processImageFile = async (entry) => {
    const result = await detectAndBlurFaces(entry.originalFile);
    if (result.error) {
      throw result.error;
    }

    const nextBlob = result.blob;
    const blurredFile =
      nextBlob instanceof File
        ? nextBlob
        : new File([nextBlob], entry.originalFile.name, {
            type: nextBlob.type || entry.originalFile.type,
          });
    const preview = URL.createObjectURL(blurredFile);

    updateImageById(entry.id, (image) => {
      if (image.preview) {
        URL.revokeObjectURL(image.preview);
      }
      return {
        ...image,
        file: blurredFile,
        preview,
        status: result.facesDetected > 0 ? "blurred" : "no-faces",
        facesDetected: result.facesDetected,
      };
    });
  };

  const retryBlur = async (id) => {
    const target = images.find((image) => image.id === id);
    if (!target) {
      return;
    }

    updateImageById(id, (image) => ({
      ...image,
      status: "processing",
      errorMessage: "",
    }));

    try {
      await processImageFile(target);
    } catch (error) {
      updateImageById(id, (image) => ({
        ...image,
        status: "error",
        errorMessage: "Blur failed. Try again.",
      }));
    }
  };

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) {
      return;
    }

    const nextImages = [...images];
    let fileError = "";
    const processingQueue = [];

    for (const file of files) {
      if (!ACCEPTED_TYPES.has(file.type)) {
        fileError = "Only JPG, PNG, or WEBP files are allowed.";
        continue;
      }
      if (file.size > MAX_IMAGE_SIZE) {
        fileError = "Each image must be smaller than 5MB.";
        continue;
      }
      if (nextImages.length >= MAX_IMAGES) {
        fileError = "You can upload up to 5 photos.";
        break;
      }
      const entry = {
        id: crypto.randomUUID(),
        file,
        originalFile: file,
        preview: URL.createObjectURL(file),
        status: "processing",
        facesDetected: 0,
        errorMessage: "",
      };
      nextImages.push(entry);
      processingQueue.push(entry);
    }

    setImages(nextImages);
    setErrors((prev) => ({ ...prev, images: fileError }));
    event.target.value = "";

    processingQueue.forEach(async (entry) => {
      try {
        await processImageFile(entry);
      } catch (error) {
        updateImageById(entry.id, (image) => ({
          ...image,
          status: "error",
          errorMessage: "Blur failed. Try again.",
        }));
      }
    });
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
      setLocationCity("");
      setLocationProvince("");
      return;
    }
    const [cityName, provinceName] = value.split("|||");
    setLocationCity(cityName || "");
    setLocationProvince(provinceName || "");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    // Only submit on final step
    if (step !== (isGoogleSignup ? 5 : 6)) {
      return;
    }
    
    const nextErrors = validateCurrentStep();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    
    if (isImageProcessing) {
      setFormError("Please wait for face detection to finish.");
      return;
    }
    if (hasBlurFailures) {
      setFormError("Please retry failed images before submitting.");
      return;
    }

    setLoading(true);
    setFormError("");

    try {
      // Handle email signup on step 6
      if (step === 6 && !isGoogleSignup) {
        setStatusMessage("Creating account...");
        const signupData = await emailSignup({
          email,
          password,
          full_name: `AfroDate User`,
          age: Number(age),
          gender,
          nationality,
          location_city: locationCity,
          location_province: locationProvince,
        });
        login(signupData.token, signupData.user);
        setStatusMessage("Account created! Completing profile...");
      }

      setStatusMessage("Uploading blurred images...");
      setUploadProgress({ current: 0, total: images.length });

      const uploadedImageIds = [];
      const failedUploads = [];

      for (let i = 0; i < images.length; i += 1) {
        setUploadProgress({ current: i + 1, total: images.length });
        const formData = new FormData();
        formData.append(
          "image_original",
          images[i].originalFile || images[i].file,
        );
        formData.append("image_blurred", images[i].file);

        try {
          const response = await uploadStoryImage(formData);
          if (!response?.image_id) {
            throw new Error("Image upload failed.");
          }
          uploadedImageIds.push(response.image_id);
        } catch (error) {
          failedUploads.push(images[i].file?.name || `Image ${i + 1}`);
        }
      }

      if (uploadedImageIds.length === 0) {
        throw new Error("At least one image must upload successfully.");
      }

      if (failedUploads.length > 0) {
        setFormError(
          `Some images failed to upload and were skipped: ${failedUploads.join(", ")}.`,
        );
      }

      setStatusMessage("Saving profile...");
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
        seeking_gender: seekingGender,
        seeking_age_min: Number(seekingAgeMin),
        seeking_age_max: Number(seekingAgeMax),
        seeking_races: seekingRaces,
      };

      const profileResponse = await updateProfile(profilePayload);
      if (profileResponse?.user) {
        updateUser(profileResponse.user);
      } else if (profileResponse) {
        updateUser(profileResponse);
      } else {
        updateUser({ ...(user || {}), profile_complete: true });
      }

      setStatusMessage("Creating story...");
      await createStory({
        story_text: storyText.trim(),
        image_ids: uploadedImageIds,
      });

      setStatusMessage("Complete!");
      setTimeout(() => navigate("/stories"), 800);
    } catch (error) {
      setFormError(error.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const selectedCityValue =
    locationCity && locationProvince
      ? `${locationCity}|||${locationProvince}`
      : "";

  const getStepIntroText = () => {
    switch (step) {
      case 1:
        return "Tell us who you're looking for. AfroDate connects you with verified African singles who share your values.";
      case 2:
        return "Your story is what makes you unique. Share your passions, values, and what you're looking for. This is what potential matches will see first - not your face.";
      case 3:
        return "Upload your photos. Don't worry - we'll automatically blur faces to protect your privacy. Reveal your identity when you both feel ready.";
      case 4:
        return "Let's get to know the real you. Share your basic information to help us find your perfect match.";
      case 5:
        return "Share your background and roots. This helps us connect you with people who understand your culture and values.";
      case 6:
        return "Almost there! Create your secure account to start connecting with amazing African singles.";
      default:
        return "";
    }
  };

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
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-6"
        >
          <div className="mb-6 rounded-xl bg-amber-50 border border-amber-200 p-4">
            <p className="text-sm text-amber-800">{getStepIntroText()}</p>
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <FaUsers className="text-rose-500" />
              I'm looking for
            </label>
            <select
              value={seekingGender}
              onChange={(e) => setSeekingGender(e.target.value)}
              className={inputClass("seeking_gender")}
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="non-binary">Non-binary</option>
              <option value="other">Other</option>
              <option value="any">Any</option>
            </select>
            {errors.seeking_gender && (
              <p className="mt-2 text-xs text-red-600">{errors.seeking_gender}</p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-700">
                Age range (minimum)
              </label>
              <input
                type="number"
                min="18"
                value={seekingAgeMin}
                onChange={(e) => setSeekingAgeMin(e.target.value)}
                className={inputClass("seeking_age_min")}
                placeholder="18"
              />
              {errors.seeking_age_min && (
                <p className="mt-2 text-xs text-red-600">{errors.seeking_age_min}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">
                Age range (maximum)
              </label>
              <input
                type="number"
                min="18"
                value={seekingAgeMax}
                onChange={(e) => setSeekingAgeMax(e.target.value)}
                className={inputClass("seeking_age_max")}
                placeholder="65"
              />
              {errors.seeking_age_max && (
                <p className="mt-2 text-xs text-red-600">{errors.seeking_age_max}</p>
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Race preferences (select all that apply)
            </label>
            <div className="mt-3 space-y-2">
              {(referenceData?.races || []).map((raceOption) => (
                <label
                  key={raceOption.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 cursor-pointer hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={seekingRaces.includes(raceOption.name)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSeekingRaces([...seekingRaces, raceOption.name]);
                      } else {
                        setSeekingRaces(seekingRaces.filter(r => r !== raceOption.name));
                      }
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-slate-700">{raceOption.name}</span>
                </label>
              ))}
            </div>
            {errors.seeking_races && (
              <p className="mt-2 text-xs text-red-600">{errors.seeking_races}</p>
            )}
          </div>
        </motion.div>
      );
    }

    if (step === 2) {
      return (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-6"
        >
          <div className="mb-6 rounded-xl bg-rose-50 border border-rose-200 p-4">
            <p className="text-sm text-rose-800">{getStepIntroText()}</p>
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <FaBook className="text-rose-500" />
              Your story
              <span className="text-xs text-slate-500 ml-2">This is what matches see first</span>
            </label>
            <textarea
              value={storyText}
              onChange={(event) => setStoryText(event.target.value)}
              rows="6"
              className={`${inputClass("story_text")} resize-none`}
              placeholder="Share your story, values, and what you are hoping to find..."
            />
            {errors.story_text && (
              <p className="mt-2 text-xs text-red-600">{errors.story_text}</p>
            )}
          </div>
        </motion.div>
      );
    }

    if (step === 3) {
      return (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-6"
        >
          <div className="mb-6 rounded-xl bg-emerald-50 border border-emerald-200 p-4">
            <div className="flex items-start gap-3">
              <FaShieldAlt className="text-emerald-600 mt-1 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-emerald-800 mb-2">Your Privacy Matters</p>
                <p className="text-sm text-emerald-700">{getStepIntroText()}</p>
              </div>
            </div>
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <FaCamera className="text-emerald-500" />
              <FaEyeSlash className="text-amber-500" />
              Photos
            </label>
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
                  key={image.id}
                  className="group relative overflow-hidden rounded-2xl"
                >
                  <img
                    src={image.preview}
                    alt={`Upload ${index + 1}`}
                    className="h-36 w-full rounded-2xl object-cover"
                  />
                  {image.status === "processing" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                    </div>
                  )}
                  <div
                    className={`absolute left-2 bottom-2 rounded-full px-3 py-1 text-xs font-semibold flex items-center gap-1 ${
                      image.status === "blurred"
                        ? "bg-emerald-500/90 text-white"
                        : image.status === "no-faces"
                          ? "bg-amber-500/90 text-white"
                          : image.status === "error"
                            ? "bg-red-500/90 text-white"
                            : "bg-slate-900/70 text-white"
                    }`}
                  >
                    {image.status === "processing" && "Detecting and blurring faces..."}
                    {image.status === "blurred" && (
                      <>
                        <FaCheckCircle className="text-xs" />
                        Faces blurred
                      </>
                    )}
                    {image.status === "no-faces" && "No faces detected"}
                    {image.status === "error" && "Blur failed"}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100"
                  >
                    Remove
                  </button>
                  {image.status === "error" && (
                    <button
                      type="button"
                      onClick={() => retryBlur(image.id)}
                      className="absolute right-2 bottom-2 rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-slate-700 shadow"
                    >
                      Retry
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      );
    }

    if (step === 4) {
      return (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-6"
        >
          <div className="mb-6 rounded-xl bg-blue-50 border border-blue-200 p-4">
            <p className="text-sm text-blue-800">{getStepIntroText()}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-700">Age</label>
              <input
                type="number"
                min="18"
                value={age}
                onChange={(event) => setAge(event.target.value)}
                className={inputClass("age")}
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
                className={inputClass("gender")}
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
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <FaGlobe className="text-emerald-500" />
                City
              </label>
              <select
                value={selectedCityValue}
                onChange={(event) => handleCityChange(event.target.value)}
                className={inputClass("location_city")}
              >
                <option value="">Select city</option>
                {(referenceData?.cities || []).map((city) => (
                  <option key={city.id} value={`${city.name}|||${city.province}`}>
                    {city.name}, {city.province}
                  </option>
                ))}
              </select>
              {errors.location_city && (
                <p className="mt-2 text-xs text-red-600">{errors.location_city}</p>
              )}
            </div>
          </div>
        </motion.div>
      );
    }

    if (step === 5) {
      return (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-6"
        >
          <div className="mb-6 rounded-xl bg-amber-50 border border-amber-200 p-4">
            <p className="text-sm text-amber-800">{getStepIntroText()}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-700">
                Nationality
              </label>
              <select
                value={nationality}
                onChange={(event) => setNationality(event.target.value)}
                className={inputClass("nationality")}
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
              <label className="text-sm font-medium text-slate-700">
                Religion
              </label>
              <select
                value={religion}
                onChange={(event) => setReligion(event.target.value)}
                className={inputClass("religion")}
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
                className={inputClass("race")}
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
                className={inputClass("education")}
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
            <div>
              <label className="text-sm font-medium text-slate-700">
                Do you have kids?
              </label>
              <select
                value={hasKids === null ? "" : hasKids ? "yes" : "no"}
                onChange={(event) => {
                  const value = event.target.value;
                  setHasKids(value === "" ? null : value === "yes");
                  if (value !== "yes") {
                    setNumKids("0");
                  }
                }}
                className={inputClass("has_kids")}
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
                  className={inputClass("num_kids")}
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
                value={smoker === null ? "" : smoker ? "yes" : "no"}
                onChange={(event) =>
                  setSmoker(
                    event.target.value === ""
                      ? null
                      : event.target.value === "yes",
                  )
                }
                className={inputClass("smoker")}
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
              <label className="text-sm font-medium text-slate-700">
                Drinks alcohol
              </label>
              <select
                value={drinksAlcohol === null ? "" : drinksAlcohol ? "yes" : "no"}
                onChange={(event) =>
                  setDrinksAlcohol(
                    event.target.value === ""
                      ? null
                      : event.target.value === "yes",
                  )
                }
                className={inputClass("drinks_alcohol")}
              >
                <option value="">Select option</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
              {errors.drinks_alcohol && (
                <p className="mt-2 text-xs text-red-600">
                  {errors.drinks_alcohol}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-6"
      >
        <div className="mb-6 rounded-xl bg-green-50 border border-green-200 p-4">
          <p className="text-sm text-green-800">{getStepIntroText()}</p>
        </div>
        <div className="space-y-6">
          <div>
            <label className="text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass("email")}
              placeholder="your@email.com"
            />
            {errors.email && (
              <p className="mt-2 text-xs text-red-600">{errors.email}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass("password")}
              placeholder="At least 6 characters"
            />
            {errors.password && (
              <p className="mt-2 text-xs text-red-600">{errors.password}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClass("confirmPassword")}
              placeholder="Confirm your password"
            />
            {errors.confirmPassword && (
              <p className="mt-2 text-xs text-red-600">{errors.confirmPassword}</p>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  const isImageProcessing = images.some(
    (image) => image.status === "processing",
  );
  const hasBlurFailures = images.some((image) => image.status === "error");

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-100 via-rose-50 to-emerald-100 pb-24">
      <div className="mx-auto flex min-h-screen w-full flex-col items-center justify-center px-0 py-6 sm:px-6 sm:py-12">
        <div className="w-full max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.4fr]">
            {/* Main Form */}
            <div className="bg-white/80 p-6 shadow-2xl backdrop-blur sm:rounded-3xl sm:p-10">
              {/* Hero Section */}
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-center mb-8"
              >
                <h1 className="text-4xl font-bold text-slate-900 mb-2">AfroDate</h1>
                <p className="text-lg text-slate-600 mb-4">Connect through stories, not faces. Find African singles who match your heart first</p>
                <p className="text-sm text-slate-500 mb-6">Share your authentic story, keep your face private until you both feel the connection</p>
                
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                  className="flex justify-center items-center gap-8 mb-6"
                >
                  <div className="flex flex-col items-center gap-2">
                    <FaHeart className="text-2xl text-rose-500" />
                    <span className="text-xs text-slate-600">Heart-First</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <FaShieldAlt className="text-2xl text-emerald-500" />
                    <span className="text-xs text-slate-600">Privacy</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <FaUsers className="text-2xl text-amber-500" />
                    <span className="text-xs text-slate-600">Community</span>
                  </div>
                </motion.div>
              </motion.div>

              {/* Step Progress */}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-emerald-500">
                    Step {step} of {isGoogleSignup ? 5 : 6}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-900">
                    {stepTitles[step - 1]}
                  </h2>
                </div>
                <div className="flex gap-2">
                  {stepTitles.map((title, index) => (
                    <motion.span
                      key={`step-dot-${index}`}
                      className={`h-3 w-3 rounded-full flex items-center justify-center text-xs font-bold ${
                        index + 1 <= step ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-400"
                      }`}
                      whileHover={{ scale: 1.2 }}
                      title={title}
                    >
                      {index + 1}
                    </motion.span>
                  ))}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
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
                    Uploading image {uploadProgress.current} of{" "}
                    {uploadProgress.total}...
                  </div>
                )}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  {step > 1 ? (
                    <motion.button
                      type="button"
                      onClick={handleBack}
                      disabled={loading}
                      className="rounded-xl bg-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-300 disabled:cursor-not-allowed disabled:opacity-70"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Back
                    </motion.button>
                  ) : (
                    <div />
                  )}

                  {step < (isGoogleSignup ? 5 : 6) ? (
                    <motion.button
                      type="button"
                      onClick={handleNext}
                      disabled={loading}
                      className="rounded-xl bg-rose-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Next
                    </motion.button>
                  ) : (
                    <motion.button
                      type="submit"
                      disabled={loading || (step === 3 && isImageProcessing)}
                      className="rounded-xl bg-rose-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {loading ? "Saving..." : isGoogleSignup ? "Complete Profile" : "Create Account"}
                    </motion.button>
                  )}
                </div>
              </form>
            </div>

            {/* Sidebar */}
            <div className="hidden lg:block">
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="bg-gradient-to-br from-amber-50 to-rose-50 rounded-2xl p-6 shadow-lg h-fit sticky top-6"
              >
                <div className="flex items-center gap-2 mb-4">
                  <FaInfoCircle className="text-emerald-600" />
                  <h3 className="font-semibold text-slate-800">How AfroDate Works</h3>
                </div>
                
                <div className="space-y-4">
                  <motion.div 
                    className="flex items-start gap-3"
                    whileHover={{ x: 4 }}
                  >
                    <FaBook className="text-rose-500 mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-slate-800 text-sm">📖 Share Your Story</p>
                      <p className="text-xs text-slate-600 mt-1">Create a profile that showcases your personality, values, and what you're looking for</p>
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    className="flex items-start gap-3"
                    whileHover={{ x: 4 }}
                  >
                    <FaHeart className="text-rose-500 mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-slate-800 text-sm">❤️ Connect Through Hearts</p>
                      <p className="text-xs text-slate-600 mt-1">Browse stories from verified African singles. Faces are blurred to help you focus on what matters</p>
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    className="flex items-start gap-3"
                    whileHover={{ x: 4 }}
                  >
                    <FaEye className="text-emerald-500 mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-slate-800 text-sm">👁️ Reveal When Ready</p>
                      <p className="text-xs text-slate-600 mt-1">When you both feel a connection, reveal your identities and take the conversation further</p>
                    </div>
                  </motion.div>
                </div>
                
                <div className="mt-6 pt-4 border-t border-amber-200">
                  <p className="text-xs text-slate-600 text-center font-medium">Join thousands of African singles finding authentic connections</p>
                </div>
              </motion.div>
            </div>

            {/* Mobile Help Button */}
            <div className="lg:hidden fixed bottom-20 right-4 z-50">
              <motion.button
                onClick={() => setShowSidebar(!showSidebar)}
                className="bg-emerald-600 text-white p-3 rounded-full shadow-lg"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <FaInfoCircle className="text-lg" />
              </motion.button>
            </div>

            {/* Mobile Sidebar Modal */}
            <AnimatePresence>
              {showSidebar && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="lg:hidden fixed inset-0 bg-black/50 z-40"
                  onClick={() => setShowSidebar(false)}
                >
                  <motion.div
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-6 max-h-[70vh] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-slate-800">How AfroDate Works</h3>
                      <button
                        onClick={() => setShowSidebar(false)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        ✕
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <FaBook className="text-rose-500 mt-1 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-slate-800 text-sm">📖 Share Your Story</p>
                          <p className="text-xs text-slate-600 mt-1">Create a profile that showcases your personality, values, and what you're looking for</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <FaHeart className="text-rose-500 mt-1 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-slate-800 text-sm">❤️ Connect Through Hearts</p>
                          <p className="text-xs text-slate-600 mt-1">Browse stories from verified African singles. Faces are blurred to help you focus on what matters</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <FaEye className="text-emerald-500 mt-1 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-slate-800 text-sm">👁️ Reveal When Ready</p>
                          <p className="text-xs text-slate-600 mt-1">When you both feel a connection, reveal your identities and take the conversation further</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-6 pt-4 border-t border-slate-200">
                      <p className="text-xs text-slate-600 text-center font-medium">Join thousands of African singles finding authentic connections</p>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateProfile;
