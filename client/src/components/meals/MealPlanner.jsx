import React, { useState, useEffect } from 'react';
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay } from 'date-fns';
import MealCard from './MealCard';
import MealSuggestions from './MealSuggestions';
import ShoppingList from './ShoppingList';
import { useMeals } from '../../services/meals';

const MealPlanner = () => {
  const [currentWeek, setCurrentWeek] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 })); // Monday start
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [selectedMealSlot, setSelectedMealSlot] = useState(null);
  const [draggedMeal, setDraggedMeal] = useState(null);

  const { fetchWeekMeals, createMeal, updateMeal, deleteMeal } = useMeals();

  const mealTypes = ['breakfast', 'lunch', 'dinner'];
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));

  useEffect(() => {
    loadWeekMeals();
  }, [currentWeek]);

  const loadWeekMeals = async () => {
    setLoading(true);
    try {
      const weekMeals = await fetchWeekMeals(format(currentWeek, 'yyyy-MM-dd'));
      setMeals(weekMeals);
    } catch (error) {
      console.error('Failed to load meals:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMealForSlot = (date, mealType) => {
    return meals.find(meal => 
      isSameDay(new Date(meal.date), date) && meal.meal_type === mealType
    );
  };

  const handlePreviousWeek = () => {
    setCurrentWeek(subWeeks(currentWeek, 1));
  };

  const handleNextWeek = () => {
    setCurrentWeek(addWeeks(currentWeek, 1));
  };

  const handleAddMeal = (date, mealType) => {
    setSelectedMealSlot({ date: format(date, 'yyyy-MM-dd'), mealType });
    setShowSuggestions(true);
  };

  const handleMealSuggestionSelect = async (suggestion) => {
    try {
      const newMeal = await createMeal({
        date: selectedMealSlot.date,
        meal_type: selectedMealSlot.mealType,
        title: suggestion.title,
        ingredients: suggestion.ingredients,
        nutrition_info: suggestion.nutrition_info,
        prep_time: suggestion.prep_time,
        recipe_url: suggestion.recipe_url
      });
      
      setMeals([...meals, newMeal]);
      setShowSuggestions(false);
      setSelectedMealSlot(null);
    } catch (error) {
      console.error('Failed to add meal:', error);
    }
  };

  const handleMealUpdate = async (mealId, updates) => {
    try {
      const updatedMeal = await updateMeal(mealId, updates);
      setMeals(meals.map(meal => meal.id === mealId ? updatedMeal : meal));
    } catch (error) {
      console.error('Failed to update meal:', error);
    }
  };

  const handleMealDelete = async (mealId) => {
    try {
      await deleteMeal(mealId);
      setMeals(meals.filter(meal => meal.id !== mealId));
    } catch (error) {
      console.error('Failed to delete meal:', error);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e, meal) => {
    setDraggedMeal(meal);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, date, mealType) => {
    e.preventDefault();
    
    if (draggedMeal) {
      try {
        await handleMealUpdate(draggedMeal.id, {
          date: format(date, 'yyyy-MM-dd'),
          meal_type: mealType,
          title: draggedMeal.title,
          ingredients: draggedMeal.ingredients,
          nutrition_info: draggedMeal.nutrition_info,
          prep_time: draggedMeal.prep_time,
          recipe_url: draggedMeal.recipe_url
        });
        setDraggedMeal(null);
      } catch (error) {
        console.error('Failed to move meal:', error);
      }
    }
  };

  const handleDragEnd = () => {
    setDraggedMeal(null);
  };

  const getMealTypeColor = (mealType) => {
    switch (mealType) {
      case 'breakfast': return 'bg-yellow-100 border-yellow-200';
      case 'lunch': return 'bg-blue-100 border-blue-200';
      case 'dinner': return 'bg-purple-100 border-purple-200';
      default: return 'bg-gray-100 border-gray-200';
    }
  };

  const getMealTypeIcon = (mealType) => {
    switch (mealType) {
      case 'breakfast': return '🌅';
      case 'lunch': return '☀️';
      case 'dinner': return '🌙';
      default: return '🍽️';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Meal Planner</h1>
          <p className="text-gray-600 mt-1">
            Week of {format(currentWeek, 'MMMM d')} - {format(addDays(currentWeek, 6), 'MMMM d, yyyy')}
          </p>
        </div>
        
        <div className="flex space-x-4">
          <button
            onClick={() => setShowShoppingList(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            🛒 Shopping List
          </button>
          <button
            onClick={handlePreviousWeek}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            ← Previous Week
          </button>
          <button
            onClick={handleNextWeek}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Next Week →
          </button>
        </div>
      </div>

      {/* Weekly Grid */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Header Row */}
        <div className="grid grid-cols-8 bg-gray-50 border-b">
          <div className="p-4 font-semibold text-gray-700">Meals</div>
          {weekDays.map(day => (
            <div key={day.toISOString()} className="p-4 text-center">
              <div className="font-semibold text-gray-900">{format(day, 'EEE')}</div>
              <div className="text-sm text-gray-600">{format(day, 'MMM d')}</div>
            </div>
          ))}
        </div>

        {/* Meal Rows */}
        {mealTypes.map(mealType => (
          <div key={mealType} className="grid grid-cols-8 border-b last:border-b-0">
            {/* Meal Type Label */}
            <div className={`p-4 flex items-center justify-center ${getMealTypeColor(mealType)} font-semibold`}>
              <span className="mr-2">{getMealTypeIcon(mealType)}</span>
              <span className="capitalize">{mealType}</span>
            </div>

            {/* Daily Meal Slots */}
            {weekDays.map(day => {
              const meal = getMealForSlot(day, mealType);
              return (
                <div
                  key={`${day.toISOString()}-${mealType}`}
                  className="p-2 min-h-32 border-l border-gray-200 relative"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, day, mealType)}
                >
                  {meal ? (
                    <MealCard
                      meal={meal}
                      onUpdate={(updates) => handleMealUpdate(meal.id, updates)}
                      onDelete={() => handleMealDelete(meal.id)}
                      onDragStart={(e) => handleDragStart(e, meal)}
                      onDragEnd={handleDragEnd}
                      isDragging={draggedMeal?.id === meal.id}
                    />
                  ) : (
                    <button
                      onClick={() => handleAddMeal(day, mealType)}
                      className="w-full h-full min-h-24 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-all flex items-center justify-center text-gray-500 hover:text-gray-700"
                    >
                      <span className="text-2xl">+</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Quick Templates */}
      <div className="mt-6 bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Templates</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: 'Taco Tuesday', mealType: 'dinner', day: 1, color: 'bg-red-100 text-red-800' },
            { name: 'Pizza Friday', mealType: 'dinner', day: 4, color: 'bg-yellow-100 text-yellow-800' },
            { name: 'Sunday Brunch', mealType: 'breakfast', day: 6, color: 'bg-green-100 text-green-800' },
            { name: 'Meatless Monday', mealType: 'dinner', day: 0, color: 'bg-purple-100 text-purple-800' }
          ].map(template => (
            <button
              key={template.name}
              onClick={() => handleAddMeal(weekDays[template.day], template.mealType)}
              className={`p-3 rounded-lg ${template.color} hover:opacity-80 transition-opacity text-sm font-medium`}
            >
              {template.name}
            </button>
          ))}
        </div>
      </div>

      {/* Meal Suggestions Modal */}
      {showSuggestions && (
        <MealSuggestions
          mealType={selectedMealSlot?.mealType}
          onSelect={handleMealSuggestionSelect}
          onClose={() => {
            setShowSuggestions(false);
            setSelectedMealSlot(null);
          }}
        />
      )}

      {/* Shopping List Modal */}
      {showShoppingList && (
        <ShoppingList
          startDate={format(currentWeek, 'yyyy-MM-dd')}
          endDate={format(addDays(currentWeek, 6), 'yyyy-MM-dd')}
          onClose={() => setShowShoppingList(false)}
        />
      )}
    </div>
  );
};

export default MealPlanner;