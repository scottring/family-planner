import React, { useState } from 'react';

const MealCard = ({ 
  meal, 
  onUpdate, 
  onDelete, 
  onDragStart, 
  onDragEnd, 
  isDragging 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [editForm, setEditForm] = useState({
    title: meal.title || '',
    prep_time: meal.prep_time || '',
    recipe_url: meal.recipe_url || ''
  });

  const handleEdit = (e) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleSave = async (e) => {
    e.stopPropagation();
    try {
      await onUpdate(editForm);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update meal:', error);
    }
  };

  const handleCancel = (e) => {
    e.stopPropagation();
    setEditForm({
      title: meal.title || '',
      prep_time: meal.prep_time || '',
      recipe_url: meal.recipe_url || ''
    });
    setIsEditing(false);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this meal?')) {
      onDelete();
    }
  };

  const handleCardClick = () => {
    if (!isEditing) {
      setShowDetails(!showDetails);
    }
  };

  const getDietaryBadges = () => {
    const badges = [];
    if (meal.ingredients) {
      const hasNoMeat = !meal.ingredients.some(ing => 
        ['meat & seafood', 'meat', 'seafood'].includes(ing.category?.toLowerCase())
      );
      const hasNoDairy = !meal.ingredients.some(ing => 
        ['dairy & eggs', 'dairy'].includes(ing.category?.toLowerCase())
      );
      
      if (hasNoMeat) badges.push({ text: 'V', color: 'bg-green-100 text-green-800', title: 'Vegetarian' });
      if (hasNoDairy) badges.push({ text: 'DF', color: 'bg-blue-100 text-blue-800', title: 'Dairy Free' });
    }
    return badges;
  };

  const formatPrepTime = (minutes) => {
    if (!minutes) return null;
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  const getNutritionColor = (value, type) => {
    // Simple color coding for nutrition values
    switch (type) {
      case 'calories':
        if (value < 300) return 'text-green-600';
        if (value > 600) return 'text-red-600';
        return 'text-yellow-600';
      case 'protein':
        if (value > 20) return 'text-green-600';
        if (value < 10) return 'text-red-600';
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  const ingredientCategories = meal.ingredients ? meal.ingredients.reduce((acc, ing) => {
    const category = ing.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(ing);
    return acc;
  }, {}) : {};

  return (
    <div
      className={`bg-white rounded-lg border-2 border-gray-200 hover:border-gray-300 transition-all cursor-pointer ${
        isDragging ? 'opacity-50' : ''
      } ${showDetails ? 'ring-2 ring-blue-500' : ''}`}
      draggable={!isEditing}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={handleCardClick}
    >
      {/* Header */}
      <div className="p-3 border-b border-gray-100">
        {isEditing ? (
          <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              className="w-full text-sm font-semibold bg-gray-50 border border-gray-300 rounded px-2 py-1"
              placeholder="Meal title"
              autoFocus
            />
            <div className="flex space-x-2">
              <input
                type="number"
                value={editForm.prep_time}
                onChange={(e) => setEditForm({ ...editForm, prep_time: parseInt(e.target.value) || '' })}
                className="flex-1 text-xs bg-gray-50 border border-gray-300 rounded px-2 py-1"
                placeholder="Prep time (min)"
              />
              <input
                type="url"
                value={editForm.recipe_url}
                onChange={(e) => setEditForm({ ...editForm, recipe_url: e.target.value })}
                className="flex-1 text-xs bg-gray-50 border border-gray-300 rounded px-2 py-1"
                placeholder="Recipe URL"
              />
            </div>
            <div className="flex space-x-1">
              <button
                onClick={handleSave}
                className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
              >
                Save
              </button>
              <button
                onClick={handleCancel}
                className="px-2 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-start">
              <h3 className="font-semibold text-sm text-gray-900 leading-tight">
                {meal.title}
              </h3>
              <div className="flex space-x-1 ml-1">
                <button
                  onClick={handleEdit}
                  className="text-gray-400 hover:text-gray-600 text-xs"
                  title="Edit meal"
                >
                  ✏️
                </button>
                <button
                  onClick={handleDelete}
                  className="text-gray-400 hover:text-red-500 text-xs"
                  title="Delete meal"
                >
                  🗑️
                </button>
              </div>
            </div>
            
            {/* Prep time and badges */}
            <div className="flex items-center justify-between mt-1">
              <div className="flex items-center space-x-2">
                {meal.prep_time && (
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                    ⏱️ {formatPrepTime(meal.prep_time)}
                  </span>
                )}
                {meal.recipe_url && (
                  <a
                    href={meal.recipe_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs text-blue-500 hover:text-blue-700"
                    title="View recipe"
                  >
                    🔗
                  </a>
                )}
              </div>
              
              <div className="flex space-x-1">
                {getDietaryBadges().map((badge, index) => (
                  <span
                    key={index}
                    className={`text-xs px-1.5 py-0.5 rounded font-semibold ${badge.color}`}
                    title={badge.title}
                  >
                    {badge.text}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Expanded Details */}
      {showDetails && !isEditing && (
        <div className="p-3 space-y-3 bg-gray-50">
          {/* Nutrition Info */}
          {meal.nutrition_info && Object.keys(meal.nutrition_info).length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-700 mb-2">Nutrition (per serving)</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(meal.nutrition_info).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-gray-600 capitalize">{key}:</span>
                    <span className={`font-medium ${getNutritionColor(value, key)}`}>
                      {value}{key === 'calories' ? '' : 'g'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ingredients by Category */}
          {meal.ingredients && meal.ingredients.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-700 mb-2">Ingredients</h4>
              <div className="space-y-2">
                {Object.entries(ingredientCategories).map(([category, ingredients]) => (
                  <div key={category}>
                    <h5 className="text-xs font-medium text-gray-600 mb-1">{category}</h5>
                    <ul className="text-xs text-gray-700 space-y-0.5 ml-2">
                      {ingredients.map((ing, index) => (
                        <li key={index}>
                          • {ing.quantity} {ing.unit} {ing.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Portions */}
          {meal.portions && Object.keys(meal.portions).length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-700 mb-1">Servings</h4>
              <div className="flex space-x-3 text-xs text-gray-600">
                {Object.entries(meal.portions).map(([type, count]) => (
                  <span key={type}>
                    {count} {type}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Compact preview when not expanded */}
      {!showDetails && !isEditing && meal.ingredients && (
        <div className="px-3 pb-2">
          <div className="text-xs text-gray-500 truncate">
            {meal.ingredients.slice(0, 3).map(ing => ing.name).join(', ')}
            {meal.ingredients.length > 3 && '...'}
          </div>
        </div>
      )}
    </div>
  );
};

export default MealCard;