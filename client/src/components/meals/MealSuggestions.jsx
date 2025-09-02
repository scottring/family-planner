import React, { useState, useEffect } from 'react';
import { useMeals } from '../../services/meals';

const MealSuggestions = ({ mealType, onSelect, onClose }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    difficulty: 'all',
    prepTime: 'all',
    dietary: []
  });
  const [searchTerm, setSearchTerm] = useState('');

  const { generateMealSuggestions } = useMeals();

  useEffect(() => {
    loadSuggestions();
  }, [mealType]);

  const loadSuggestions = async () => {
    setLoading(true);
    try {
      const result = await generateMealSuggestions({
        mealType,
        preferences: filters,
        servings: 4
      });
      setSuggestions(result);
    } catch (error) {
      console.error('Failed to load meal suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = async () => {
    await loadSuggestions();
  };

  const filteredSuggestions = suggestions.filter(suggestion => {
    // Search filter
    if (searchTerm && !suggestion.title.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    // Difficulty filter
    if (filters.difficulty !== 'all' && suggestion.difficulty?.toLowerCase() !== filters.difficulty) {
      return false;
    }

    // Prep time filter
    if (filters.prepTime !== 'all') {
      const maxTime = parseInt(filters.prepTime);
      if (suggestion.prep_time > maxTime) {
        return false;
      }
    }

    // Dietary filters
    if (filters.dietary.length > 0) {
      if (filters.dietary.includes('vegetarian') && !suggestion.tags?.includes('vegetarian')) {
        return false;
      }
      if (filters.dietary.includes('quick') && suggestion.prep_time > 30) {
        return false;
      }
      if (filters.dietary.includes('healthy') && !suggestion.tags?.includes('healthy')) {
        return false;
      }
    }

    return true;
  });

  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatPrepTime = (minutes) => {
    if (!minutes) return 'N/A';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  const getMealTypeIcon = (type) => {
    switch (type) {
      case 'breakfast': return '🌅';
      case 'lunch': return '☀️';
      case 'dinner': return '🌙';
      case 'snack': return '🍎';
      default: return '🍽️';
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex justify-center items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
          <p className="text-center mt-4 text-gray-600">Finding meal suggestions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <span className="text-2xl mr-3">{getMealTypeIcon(mealType)}</span>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {mealType ? `${mealType.charAt(0).toUpperCase() + mealType.slice(1)} ` : ''}
                  Suggestions
                </h2>
                <p className="text-gray-600">Choose a meal to add to your plan</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search meals..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
              <select
                value={filters.difficulty}
                onChange={(e) => {
                  setFilters({ ...filters, difficulty: e.target.value });
                  handleFilterChange();
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="all">All levels</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            {/* Prep Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Prep Time</label>
              <select
                value={filters.prepTime}
                onChange={(e) => {
                  setFilters({ ...filters, prepTime: e.target.value });
                  handleFilterChange();
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="all">Any time</option>
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
              </select>
            </div>

            {/* Dietary Preferences */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dietary</label>
              <div className="flex flex-wrap gap-2">
                {['vegetarian', 'quick', 'healthy'].map(diet => (
                  <label key={diet} className="flex items-center text-sm">
                    <input
                      type="checkbox"
                      checked={filters.dietary.includes(diet)}
                      onChange={(e) => {
                        const newDietary = e.target.checked
                          ? [...filters.dietary, diet]
                          : filters.dietary.filter(d => d !== diet);
                        setFilters({ ...filters, dietary: newDietary });
                        handleFilterChange();
                      }}
                      className="mr-1 h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="capitalize">{diet}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Suggestions Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredSuggestions.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No suggestions found</h3>
              <p className="text-gray-600">Try adjusting your filters or search terms</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSuggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => onSelect(suggestion)}
                >
                  {/* Image placeholder */}
                  <div className="h-40 bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                    <span className="text-4xl">
                      {suggestion.image_url ? '🖼️' : '🍽️'}
                    </span>
                  </div>

                  <div className="p-4">
                    {/* Title */}
                    <h3 className="font-semibold text-lg text-gray-900 mb-2">
                      {suggestion.title}
                    </h3>

                    {/* Description */}
                    {suggestion.description && (
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                        {suggestion.description}
                      </p>
                    )}

                    {/* Tags and badges */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {suggestion.difficulty && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(suggestion.difficulty)}`}>
                          {suggestion.difficulty}
                        </span>
                      )}
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                        ⏱️ {formatPrepTime(suggestion.prep_time)}
                      </span>
                      {suggestion.tags?.slice(0, 2).map(tag => (
                        <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Nutrition preview */}
                    {suggestion.nutrition_info && (
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-3">
                        {Object.entries(suggestion.nutrition_info).slice(0, 4).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="capitalize">{key}:</span>
                            <span className="font-medium">{value}{key === 'calories' ? '' : 'g'}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Ingredients preview */}
                    {suggestion.ingredients && (
                      <div className="text-xs text-gray-500 mb-3">
                        <strong>Key ingredients:</strong> {suggestion.ingredients.slice(0, 3).map(ing => ing.name).join(', ')}
                        {suggestion.ingredients.length > 3 && '...'}
                      </div>
                    )}

                    {/* Action button */}
                    <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                      Add to Meal Plan
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 text-center">
          <p className="text-sm text-gray-600">
            Showing {filteredSuggestions.length} of {suggestions.length} suggestions
          </p>
        </div>
      </div>
    </div>
  );
};

export default MealSuggestions;