import React from 'react';

const FilterForm = ({ filters, onChange, referenceData }) => {
  const handleInputChange = (key, value) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {/* Age Range */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Min Age
        </label>
        <input
          type="number"
          min="18"
          max="100"
          value={filters.age_min || ''}
          onChange={(e) => handleInputChange('age_min', e.target.value)}
          className="premium-input w-full"
          placeholder="18"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Max Age
        </label>
        <input
          type="number"
          min="18"
          max="100"
          value={filters.age_max || ''}
          onChange={(e) => handleInputChange('age_max', e.target.value)}
          className="premium-input w-full"
          placeholder="65"
        />
      </div>

      {/* Gender */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Gender
        </label>
        <select
          value={filters.gender || ''}
          onChange={(e) => handleInputChange('gender', e.target.value)}
          className="premium-input w-full"
        >
          <option value="">Any</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="non-binary">Non-binary</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Nationality */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Nationality
        </label>
        <select
          value={filters.nationality || ''}
          onChange={(e) => handleInputChange('nationality', e.target.value)}
          className="premium-input w-full"
        >
          <option value="">Any</option>
          <option value="South Africa">South Africa</option>
          <option value="Zimbabwe">Zimbabwe</option>
          <option value="Namibia">Namibia</option>
          <option value="Botswana">Botswana</option>
          <option value="Mozambique">Mozambique</option>
          <option value="Other">Other</option>
        </select>
      </div>

      {/* Race */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Race
        </label>
        <select
          value={filters.race || ''}
          onChange={(e) => handleInputChange('race', e.target.value)}
          className="premium-input w-full"
        >
          <option value="">Any</option>
          {(referenceData?.races || []).map((race) => (
            <option key={race.id} value={race.name}>
              {race.name}
            </option>
          ))}
        </select>
      </div>

      {/* Religion */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Religion
        </label>
        <select
          value={filters.religion || ''}
          onChange={(e) => handleInputChange('religion', e.target.value)}
          className="premium-input w-full"
        >
          <option value="">Any</option>
          {(referenceData?.religions || []).map((religion) => (
            <option key={religion.id} value={religion.name}>
              {religion.name}
            </option>
          ))}
        </select>
      </div>

      {/* Distance Slider */}
      <div className="sm:col-span-2 lg:col-span-3">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Max Distance: {filters.max_distance_km || 100} km
        </label>
        <input
          type="range"
          min="5"
          max="500"
          step="5"
          value={filters.max_distance_km || 100}
          onChange={(e) => handleInputChange('max_distance_km', parseInt(e.target.value))}
          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer slider"
        />
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>5 km</span>
          <span>500 km</span>
        </div>
      </div>
    </div>
  );
};

export default React.memo(FilterForm);