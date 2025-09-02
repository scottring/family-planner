import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useMeals } from '../../services/meals';

const ShoppingList = ({ startDate, endDate, onClose }) => {
  const [shoppingList, setShoppingList] = useState(null);
  const [loading, setLoading] = useState(false);
  const [customItems, setCustomItems] = useState([]);
  const [newCustomItem, setNewCustomItem] = useState('');
  const [checkedItems, setCheckedItems] = useState(new Set());

  const { generateShoppingList } = useMeals();

  useEffect(() => {
    loadShoppingList();
    // Load checked items from localStorage
    const saved = localStorage.getItem(`shoppingList-${startDate}-${endDate}`);
    if (saved) {
      setCheckedItems(new Set(JSON.parse(saved)));
    }
  }, [startDate, endDate]);

  const loadShoppingList = async () => {
    setLoading(true);
    try {
      const list = await generateShoppingList(startDate, endDate);
      setShoppingList(list);
    } catch (error) {
      console.error('Failed to generate shopping list:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleItemCheck = (itemKey, checked) => {
    const newCheckedItems = new Set(checkedItems);
    if (checked) {
      newCheckedItems.add(itemKey);
    } else {
      newCheckedItems.delete(itemKey);
    }
    setCheckedItems(newCheckedItems);
    localStorage.setItem(`shoppingList-${startDate}-${endDate}`, JSON.stringify([...newCheckedItems]));
  };

  const handleAddCustomItem = () => {
    if (newCustomItem.trim()) {
      const customItem = {
        name: newCustomItem.trim(),
        quantity: 1,
        unit: '',
        custom: true
      };
      setCustomItems([...customItems, customItem]);
      setNewCustomItem('');
    }
  };

  const handleRemoveCustomItem = (index) => {
    setCustomItems(customItems.filter((_, i) => i !== index));
  };

  const handleExport = () => {
    if (!shoppingList) return;

    let exportText = `Shopping List - ${format(new Date(startDate), 'MMM d')} to ${format(new Date(endDate), 'MMM d, yyyy')}\n\n`;
    
    Object.entries(shoppingList.categories).forEach(([category, items]) => {
      exportText += `${category}:\n`;
      items.forEach(item => {
        const checked = checkedItems.has(`${category}-${item.name}`) ? '✓' : '□';
        exportText += `  ${checked} ${item.quantity} ${item.unit} ${item.name}\n`;
      });
      exportText += '\n';
    });

    if (customItems.length > 0) {
      exportText += 'Additional Items:\n';
      customItems.forEach((item, index) => {
        const checked = checkedItems.has(`custom-${index}`) ? '✓' : '□';
        exportText += `  ${checked} ${item.quantity} ${item.unit} ${item.name}\n`;
      });
    }

    const blob = new Blob([exportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shopping-list-${startDate}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    if (!shoppingList) return;

    const shareText = `Shopping List - ${format(new Date(startDate), 'MMM d')} to ${format(new Date(endDate), 'MMM d, yyyy')}\n\nTotal items: ${shoppingList.totalItems}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Shopping List',
          text: shareText
        });
      } catch (error) {
        console.error('Failed to share:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareText);
      alert('Shopping list copied to clipboard!');
    }
  };

  const getCategoryIcon = (category) => {
    const icons = {
      'Produce': '🥬',
      'Dairy & Eggs': '🥛',
      'Meat & Seafood': '🥩',
      'Pantry': '🏺',
      'Frozen': '❄️',
      'Bakery': '🍞',
      'Other': '🛒'
    };
    return icons[category] || '📦';
  };

  const getProgressStats = () => {
    if (!shoppingList) return { checked: 0, total: 0, percentage: 0 };
    
    const totalItems = shoppingList.totalItems + customItems.length;
    const checkedCount = checkedItems.size;
    const percentage = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0;
    
    return { checked: checkedCount, total: totalItems, percentage };
  };

  const stats = getProgressStats();

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex justify-center items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
          <p className="text-center mt-4 text-gray-600">Generating shopping list...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Shopping List</h2>
              <p className="text-gray-600 mt-1">
                {format(new Date(startDate), 'MMM d')} - {format(new Date(endDate), 'MMM d, yyyy')}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">
                Progress: {stats.checked} of {stats.total} items
              </span>
              <span className="text-sm font-medium text-gray-700">{stats.percentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${stats.percentage}%` }}
              ></div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 mt-4">
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              📋 Export
            </button>
            <button
              onClick={handleShare}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
            >
              📤 Share
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {shoppingList && (
            <div className="space-y-6">
              {/* Shopping Categories */}
              {Object.entries(shoppingList.categories).map(([category, items]) => (
                <div key={category} className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <span className="mr-2 text-xl">{getCategoryIcon(category)}</span>
                    {category} ({items.length} items)
                  </h3>
                  
                  <div className="space-y-2">
                    {items.map((item, index) => {
                      const itemKey = `${category}-${item.name}`;
                      const isChecked = checkedItems.has(itemKey);
                      
                      return (
                        <label
                          key={index}
                          className={`flex items-center p-3 bg-white rounded border hover:bg-gray-50 cursor-pointer transition-colors ${
                            isChecked ? 'opacity-60' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => handleItemCheck(itemKey, e.target.checked)}
                            className="mr-3 h-4 w-4 text-green-600 rounded focus:ring-green-500"
                          />
                          <div className="flex-1">
                            <div className={`font-medium ${isChecked ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                              {item.quantity} {item.unit} {item.name}
                            </div>
                            {item.sources && item.sources.length > 0 && (
                              <div className="text-xs text-gray-500 mt-1">
                                For: {item.sources.join(', ')}
                              </div>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Custom Items Section */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <span className="mr-2 text-xl">➕</span>
                  Additional Items ({customItems.length})
                </h3>
                
                {/* Add Custom Item */}
                <div className="flex space-x-2 mb-3">
                  <input
                    type="text"
                    value={newCustomItem}
                    onChange={(e) => setNewCustomItem(e.target.value)}
                    placeholder="Add custom item..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddCustomItem()}
                  />
                  <button
                    onClick={handleAddCustomItem}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add
                  </button>
                </div>

                {/* Custom Items List */}
                <div className="space-y-2">
                  {customItems.map((item, index) => {
                    const itemKey = `custom-${index}`;
                    const isChecked = checkedItems.has(itemKey);
                    
                    return (
                      <label
                        key={index}
                        className={`flex items-center p-3 bg-white rounded border hover:bg-gray-50 cursor-pointer transition-colors ${
                          isChecked ? 'opacity-60' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => handleItemCheck(itemKey, e.target.checked)}
                          className="mr-3 h-4 w-4 text-green-600 rounded focus:ring-green-500"
                        />
                        <div className={`flex-1 font-medium ${isChecked ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                          {item.quantity} {item.unit} {item.name}
                        </div>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            handleRemoveCustomItem(index);
                          }}
                          className="text-red-500 hover:text-red-700 ml-2"
                        >
                          🗑️
                        </button>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShoppingList;