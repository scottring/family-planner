import React, { useState } from 'react';
import { format, addDays } from 'date-fns';
import api from '../../services/api';

const AiPlanGenerator = ({ startDate, onClose, onPlanGenerated }) => {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    dietaryPatterns: {
      intermittentFasting: false,
      fastingWindow: '16:8',
      mealTiming: 'flexible'
    },
    familyPreferences: {
      adults: [
        { name: 'You', likes: '', dislikes: '', allergies: '' },
        { name: 'Partner', likes: '', dislikes: '', allergies: '' }
      ],
      children: [
        { name: 'Kaleb', likes: '', dislikes: '', allergies: '' },
        { name: 'Ella', likes: '', dislikes: '', allergies: '' }
      ]
    },
    scheduleInfo: {
      workdays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      lunchAtWork: true,
      busyNights: [],
      cookingSkill: 'intermediate'
    },
    availableIngredients: [],
    nutritionGoals: {
      healthyFocus: true,
      proteinTarget: 'moderate',
      vegetableFocus: 'high',
      specialDiets: []
    }
  });

  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const fastingOptions = ['16:8', '14:10', '18:6', 'None'];
  const commonIngredients = [
    'Chicken breast', 'Ground beef', 'Salmon', 'Eggs', 'Greek yogurt',
    'Rice', 'Pasta', 'Quinoa', 'Sweet potatoes', 'Broccoli',
    'Spinach', 'Tomatoes', 'Onions', 'Garlic', 'Olive oil',
    'Avocado', 'Bananas', 'Apples', 'Berries', 'Oats'
  ];

  const handleInputChange = (category, field, value, index = null, subField = null) => {
    setFormData(prev => {
      const newData = { ...prev };
      
      if (index !== null && subField) {
        newData[category][field][index][subField] = value;
      } else if (index !== null) {
        newData[category][field][index] = value;
      } else if (field === 'availableIngredients') {
        if (newData.availableIngredients.includes(value)) {
          newData.availableIngredients = newData.availableIngredients.filter(item => item !== value);
        } else {
          newData.availableIngredients = [...newData.availableIngredients, value];
        }
      } else {
        newData[category][field] = value;
      }
      
      return newData;
    });
  };

  const handleGeneratePlan = async () => {
    setLoading(true);
    try {
      const response = await api.post('/meals/ai-generate-plan', {
        startDate,
        dietaryPatterns: formData.dietaryPatterns,
        familyPreferences: formData.familyPreferences,
        scheduleInfo: formData.scheduleInfo,
        availableIngredients: formData.availableIngredients,
        nutritionGoals: formData.nutritionGoals
      });

      onPlanGenerated(response.data);
    } catch (error) {
      console.error('Failed to generate meal plan:', error);
      alert('Failed to generate meal plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Dietary Patterns</h3>
        
        <div className="space-y-4">
          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.dietaryPatterns.intermittentFasting}
                onChange={(e) => handleInputChange('dietaryPatterns', 'intermittentFasting', e.target.checked)}
                className="w-4 h-4 text-blue-600"
              />
              <span>Follow intermittent fasting schedule</span>
            </label>
          </div>

          {formData.dietaryPatterns.intermittentFasting && (
            <div>
              <label className="block text-sm font-medium mb-2">Fasting Window</label>
              <select
                value={formData.dietaryPatterns.fastingWindow}
                onChange={(e) => handleInputChange('dietaryPatterns', 'fastingWindow', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              >
                {fastingOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Meal Timing Preference</label>
            <select
              value={formData.dietaryPatterns.mealTiming}
              onChange={(e) => handleInputChange('dietaryPatterns', 'mealTiming', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="flexible">Flexible timing</option>
              <option value="strict">Strict meal times</option>
              <option value="early">Early meals (breakfast 6-7am, dinner 5-6pm)</option>
              <option value="late">Later meals (breakfast 8-9am, dinner 7-8pm)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Family Preferences</h3>
        
        <div className="space-y-6">
          <div>
            <h4 className="font-medium mb-3">Adults</h4>
            {formData.familyPreferences.adults.map((adult, index) => (
              <div key={index} className="border rounded-lg p-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">{adult.name} - Likes</label>
                    <input
                      type="text"
                      value={adult.likes}
                      onChange={(e) => handleInputChange('familyPreferences', 'adults', e.target.value, index, 'likes')}
                      placeholder="e.g., Italian food, spicy dishes"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Dislikes</label>
                    <input
                      type="text"
                      value={adult.dislikes}
                      onChange={(e) => handleInputChange('familyPreferences', 'adults', e.target.value, index, 'dislikes')}
                      placeholder="e.g., seafood, mushrooms"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Allergies</label>
                    <input
                      type="text"
                      value={adult.allergies}
                      onChange={(e) => handleInputChange('familyPreferences', 'adults', e.target.value, index, 'allergies')}
                      placeholder="e.g., nuts, dairy"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div>
            <h4 className="font-medium mb-3">Children</h4>
            {formData.familyPreferences.children.map((child, index) => (
              <div key={index} className="border rounded-lg p-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">{child.name} - Likes</label>
                    <input
                      type="text"
                      value={child.likes}
                      onChange={(e) => handleInputChange('familyPreferences', 'children', e.target.value, index, 'likes')}
                      placeholder="e.g., chicken nuggets, fruit"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Won't eat</label>
                    <input
                      type="text"
                      value={child.dislikes}
                      onChange={(e) => handleInputChange('familyPreferences', 'children', e.target.value, index, 'dislikes')}
                      placeholder="e.g., vegetables, spicy food"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Allergies</label>
                    <input
                      type="text"
                      value={child.allergies}
                      onChange={(e) => handleInputChange('familyPreferences', 'children', e.target.value, index, 'allergies')}
                      placeholder="e.g., peanuts"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Schedule & Available Ingredients</h3>
        
        <div className="space-y-6">
          <div>
            <label className="flex items-center space-x-2 mb-4">
              <input
                type="checkbox"
                checked={formData.scheduleInfo.lunchAtWork}
                onChange={(e) => handleInputChange('scheduleInfo', 'lunchAtWork', e.target.checked)}
                className="w-4 h-4 text-blue-600"
              />
              <span>Need packed lunches for workdays</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Cooking Skill Level</label>
            <select
              value={formData.scheduleInfo.cookingSkill}
              onChange={(e) => handleInputChange('scheduleInfo', 'cookingSkill', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="beginner">Beginner (simple recipes only)</option>
              <option value="intermediate">Intermediate (30-45 min meals)</option>
              <option value="advanced">Advanced (any complexity)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Busy nights (quick meals needed)</label>
            <div className="grid grid-cols-2 gap-2">
              {weekDays.map(day => (
                <label key={day} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.scheduleInfo.busyNights.includes(day)}
                    onChange={(e) => {
                      const newBusyNights = e.target.checked
                        ? [...formData.scheduleInfo.busyNights, day]
                        : formData.scheduleInfo.busyNights.filter(d => d !== day);
                      handleInputChange('scheduleInfo', 'busyNights', newBusyNights);
                    }}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm">{day}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Available Ingredients (check what you have)</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
              {commonIngredients.map(ingredient => (
                <label key={ingredient} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.availableIngredients.includes(ingredient)}
                    onChange={() => handleInputChange('', 'availableIngredients', ingredient)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm">{ingredient}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Nutrition Goals</h3>
        
        <div className="space-y-4">
          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.nutritionGoals.healthyFocus}
                onChange={(e) => handleInputChange('nutritionGoals', 'healthyFocus', e.target.checked)}
                className="w-4 h-4 text-blue-600"
              />
              <span>Focus on healthy, balanced meals</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Protein Target</label>
            <select
              value={formData.nutritionGoals.proteinTarget}
              onChange={(e) => handleInputChange('nutritionGoals', 'proteinTarget', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="low">Low protein</option>
              <option value="moderate">Moderate protein</option>
              <option value="high">High protein</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Vegetable Focus</label>
            <select
              value={formData.nutritionGoals.vegetableFocus}
              onChange={(e) => handleInputChange('nutritionGoals', 'vegetableFocus', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="low">Minimal vegetables</option>
              <option value="moderate">Some vegetables</option>
              <option value="high">Lots of vegetables</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Special Diets</label>
            {['Vegetarian', 'Vegan', 'Keto', 'Low-carb', 'Gluten-free', 'Dairy-free'].map(diet => (
              <label key={diet} className="flex items-center space-x-2 mb-2">
                <input
                  type="checkbox"
                  checked={formData.nutritionGoals.specialDiets.includes(diet)}
                  onChange={(e) => {
                    const newDiets = e.target.checked
                      ? [...formData.nutritionGoals.specialDiets, diet]
                      : formData.nutritionGoals.specialDiets.filter(d => d !== diet);
                    handleInputChange('nutritionGoals', 'specialDiets', newDiets);
                  }}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm">{diet}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">🤖 AI Meal Plan Generator</h2>
              <p className="text-gray-600">Week of {format(new Date(startDate), 'MMMM d')} - {format(addDays(new Date(startDate), 6), 'MMMM d, yyyy')}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
          
          {/* Progress Steps */}
          <div className="flex justify-center mt-6">
            <div className="flex space-x-4">
              {[1, 2, 3, 4].map(stepNum => (
                <div
                  key={stepNum}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    stepNum === step
                      ? 'bg-blue-600 text-white'
                      : stepNum < step
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {stepNum < step ? '✓' : stepNum}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between">
            <button
              onClick={() => step > 1 ? setStep(step - 1) : onClose()}
              className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100"
              disabled={loading}
            >
              {step > 1 ? 'Previous' : 'Cancel'}
            </button>
            
            {step < 4 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                disabled={loading}
              >
                Next Step
              </button>
            ) : (
              <button
                onClick={handleGeneratePlan}
                disabled={loading}
                className="px-8 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Generating Plan...
                  </div>
                ) : (
                  '🚀 Generate AI Meal Plan'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiPlanGenerator;