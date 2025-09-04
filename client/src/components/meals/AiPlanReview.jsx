import React, { useState } from 'react';
import { format, addDays } from 'date-fns';
import api from '../../services/api';

const AiPlanReview = ({ mealPlan, startDate, onClose, onPlanSynced }) => {
  const [loading, setLoading] = useState(false);
  const [expandedDay, setExpandedDay] = useState(null);
  const [editingMeal, setEditingMeal] = useState(null);

  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const handleSyncPlan = async () => {
    setLoading(true);
    try {
      const response = await api.post('/meals/sync-ai-plan', {
        mealPlan: mealPlan.meal_plan,
        startDate
      });
      onPlanSynced(response.data);
    } catch (error) {
      console.error('Failed to sync meal plan:', error);
      alert('Failed to sync meal plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getMealTypeIcon = (mealType) => {
    switch (mealType) {
      case 'breakfast': return '🌅';
      case 'lunch': return '☀️';
      case 'dinner': return '🌙';
      case 'snacks': return '🍎';
      default: return '🍽️';
    }
  };

  const getMealTypeColor = (mealType) => {
    switch (mealType) {
      case 'breakfast': return 'bg-yellow-50 border-yellow-200';
      case 'lunch': return 'bg-blue-50 border-blue-200';
      case 'dinner': return 'bg-purple-50 border-purple-200';
      case 'snacks': return 'bg-green-50 border-green-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const renderMealCard = (meal, day, mealType) => {
    if (!meal || !meal.title) return null;

    return (
      <div className={`border rounded-lg p-3 ${getMealTypeColor(mealType)} hover:shadow-md transition-shadow`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-lg">{getMealTypeIcon(mealType)}</span>
              <h4 className="font-semibold text-gray-900">{meal.title}</h4>
              {meal.prep_time && (
                <span className="text-sm text-gray-500">⏱️ {meal.prep_time}min</span>
              )}
            </div>
            
            {meal.description && (
              <p className="text-sm text-gray-600 mb-2">{meal.description}</p>
            )}

            {meal.tags && meal.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {meal.tags.slice(0, 3).map(tag => (
                  <span key={tag} className="px-2 py-1 bg-gray-200 text-gray-700 rounded-full text-xs">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {meal.nutrition_info && (
              <div className="text-xs text-gray-600">
                <span className="mr-3">🔥 {meal.nutrition_info.calories || 0} cal</span>
                <span className="mr-3">💪 {meal.nutrition_info.protein || 0}g protein</span>
              </div>
            )}

            {meal.cooking_notes && (
              <p className="text-xs text-blue-600 mt-2 italic">💡 {meal.cooking_notes}</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-7xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">🎯 AI Generated Meal Plan</h2>
              <p className="text-gray-600">
                Week of {format(new Date(startDate), 'MMMM d')} - {format(addDays(new Date(startDate), 6), 'MMMM d, yyyy')}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Meal Plan Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {weekDays.map((day, index) => {
                const dayMeals = mealPlan.meal_plan[day] || {};
                const currentDate = addDays(new Date(startDate), index);
                
                return (
                  <div key={day} className="bg-gray-50 rounded-xl p-4">
                    <div className="text-center mb-4">
                      <h3 className="font-bold text-lg text-gray-900">{day}</h3>
                      <p className="text-sm text-gray-600">{format(currentDate, 'MMM d')}</p>
                    </div>

                    <div className="space-y-3">
                      {['breakfast', 'lunch', 'dinner', 'snacks'].map(mealType => (
                        <div key={mealType}>
                          {dayMeals[mealType] ? (
                            renderMealCard(dayMeals[mealType], day, mealType)
                          ) : (
                            <div className={`border-2 border-dashed border-gray-300 rounded-lg p-3 text-center ${getMealTypeColor(mealType)}`}>
                              <span className="text-gray-400 text-sm">
                                {getMealTypeIcon(mealType)} No {mealType}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sidebar with Summary */}
          <div className="w-80 bg-gray-50 p-6 border-l overflow-y-auto">
            <h3 className="font-bold text-lg mb-4">📊 Weekly Summary</h3>
            
            {mealPlan.weekly_summary && (
              <div className="space-y-4 mb-6">
                <div className="bg-white rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Total Prep Time:</span>
                      <div className="font-semibold">{mealPlan.weekly_summary.total_prep_time}min</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Budget Est:</span>
                      <div className="font-semibold">${mealPlan.weekly_summary.budget_estimate}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Variety Score:</span>
                      <div className="font-semibold">{mealPlan.weekly_summary.meal_variety_score}/10</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Avg Calories:</span>
                      <div className="font-semibold">
                        {Math.round((mealPlan.weekly_summary.nutrition_totals?.calories || 0) / 7)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {mealPlan.meal_prep_suggestions && mealPlan.meal_prep_suggestions.length > 0 && (
              <div className="mb-6">
                <h4 className="font-semibold mb-3">🥄 Meal Prep Tips</h4>
                <div className="space-y-2">
                  {mealPlan.meal_prep_suggestions.map((tip, index) => (
                    <div key={index} className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
                      💡 {tip}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {mealPlan.shopping_list && (
              <div className="mb-6">
                <h4 className="font-semibold mb-3">🛒 Shopping List Preview</h4>
                <div className="bg-white rounded-lg p-4 max-h-60 overflow-y-auto">
                  {Object.entries(mealPlan.shopping_list).map(([category, items]) => (
                    <div key={category} className="mb-3">
                      <div className="font-medium text-sm text-gray-700 mb-1">{category}</div>
                      <div className="text-xs text-gray-600 pl-2">
                        {Array.isArray(items) ? items.slice(0, 5).join(', ') : ''}
                        {Array.isArray(items) && items.length > 5 && `... +${items.length - 5} more`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              <span className="font-medium">Generated:</span> {format(new Date(mealPlan.generated_at), 'PPp')}
            </div>
            
            <div className="flex space-x-4">
              <button
                onClick={onClose}
                className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100"
                disabled={loading}
              >
                Cancel
              </button>
              
              <button
                onClick={handleSyncPlan}
                disabled={loading}
                className="px-8 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Syncing Plan...
                  </div>
                ) : (
                  '✅ Sync to Calendar'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiPlanReview;