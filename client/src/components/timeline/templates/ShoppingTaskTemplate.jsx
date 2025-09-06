import { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  Plus, 
  X, 
  Clock, 
  DollarSign, 
  MapPin,
  ExternalLink,
  Check,
  Tags,
  Share2,
  Trash2
} from 'lucide-react';
import { useTaskStore } from '../../../stores/taskStore';

const ShoppingTaskTemplate = ({ task, onUpdate, className = "" }) => {
  const [shoppingData, setShoppingData] = useState({
    items: [],
    store: '',
    customStore: '',
    estimatedTime: null,
    budget: '',
    categories: ['Groceries', 'Household', 'Personal', 'Other'],
    selectedCategory: 'Groceries',
    notes: '',
    ...task.templateData
  });
  
  const [newItem, setNewItem] = useState('');
  const [showCustomStore, setShowCustomStore] = useState(false);
  const [showBudget, setShowBudget] = useState(false);
  
  const { updateTask } = useTaskStore();

  // Common stores list
  const commonStores = [
    'Walmart', 'Target', 'Kroger', 'Safeway', 'Whole Foods',
    'Costco', 'CVS', 'Walgreens', 'Home Depot', 'Lowes'
  ];

  // Calculate estimated shopping time based on number of items
  useEffect(() => {
    const itemCount = shoppingData.items.length;
    let time = '';
    if (itemCount === 0) {
      time = '';
    } else if (itemCount <= 5) {
      time = '15-30 mins';
    } else if (itemCount <= 10) {
      time = '30-45 mins';
    } else if (itemCount <= 20) {
      time = '45-60 mins';
    } else {
      time = '60+ mins';
    }
    
    if (time !== shoppingData.estimatedTime) {
      setShoppingData(prev => ({
        ...prev,
        estimatedTime: time
      }));
    }
  }, [shoppingData.items.length]);

  // Save data when it changes
  useEffect(() => {
    const saveData = async () => {
      if (task.id) {
        try {
          await updateTask(task.id, {
            ...task,
            templateType: 'shopping',
            templateData: shoppingData
          });
          if (onUpdate) {
            onUpdate({ ...task, templateData: shoppingData });
          }
        } catch (error) {
          console.error('Error updating shopping task:', error);
        }
      }
    };

    const timeoutId = setTimeout(saveData, 500); // Debounce saves
    return () => clearTimeout(timeoutId);
  }, [shoppingData, task.id, updateTask, onUpdate]);

  const addItem = () => {
    if (newItem.trim()) {
      const item = {
        id: Date.now(),
        name: newItem.trim(),
        completed: false,
        category: shoppingData.selectedCategory,
        quantity: 1
      };
      setShoppingData(prev => ({
        ...prev,
        items: [...prev.items, item]
      }));
      setNewItem('');
    }
  };

  const removeItem = (id) => {
    setShoppingData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
  };

  const toggleItemComplete = (id) => {
    setShoppingData(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    }));
  };

  const updateItemQuantity = (id, quantity) => {
    setShoppingData(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item
      )
    }));
  };

  const handleStoreChange = (store) => {
    if (store === 'custom') {
      setShowCustomStore(true);
      setShoppingData(prev => ({ ...prev, store: '' }));
    } else {
      setShowCustomStore(false);
      setShoppingData(prev => ({ ...prev, store, customStore: '' }));
    }
  };

  const openStoreLocator = () => {
    const storeQuery = shoppingData.store || shoppingData.customStore;
    if (storeQuery) {
      // Mock store locator - would integrate with maps API
      const url = `https://www.google.com/maps/search/${encodeURIComponent(storeQuery)}+near+me`;
      window.open(url, '_blank');
    }
  };

  const shareList = () => {
    // Mock share functionality
    const listText = shoppingData.items
      .map(item => `${item.completed ? '✓' : '○'} ${item.name} (${item.quantity})`)
      .join('\n');
    
    if (navigator.share) {
      navigator.share({
        title: 'Shopping List',
        text: `Shopping List:\n\n${listText}`
      });
    } else {
      // Fallback - copy to clipboard
      navigator.clipboard.writeText(`Shopping List:\n\n${listText}`);
      alert('Shopping list copied to clipboard!');
    }
  };

  const completedCount = shoppingData.items.filter(item => item.completed).length;
  const totalCount = shoppingData.items.length;

  return (
    <div className={`bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 ${className}`}>
      {/* Header */}
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-green-100 rounded-xl">
          <ShoppingCart className="h-5 w-5 text-green-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">Shopping List</h3>
          <p className="text-sm text-gray-500">
            {totalCount === 0 ? 'Add items to your shopping list' : `${completedCount}/${totalCount} items completed`}
          </p>
        </div>
        {shoppingData.estimatedTime && (
          <div className="flex items-center space-x-1 text-sm text-gray-600 bg-gray-100 rounded-lg px-3 py-1">
            <Clock className="h-4 w-4" />
            <span>{shoppingData.estimatedTime}</span>
          </div>
        )}
      </div>

      {/* Store Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <MapPin className="h-4 w-4 inline mr-1" />
          Store
        </label>
        <div className="flex space-x-2">
          <select
            value={shoppingData.store}
            onChange={(e) => handleStoreChange(e.target.value)}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
          >
            <option value="">Select a store...</option>
            {commonStores.map(store => (
              <option key={store} value={store}>{store}</option>
            ))}
            <option value="custom">Other (Custom)</option>
          </select>
          {(shoppingData.store || shoppingData.customStore) && (
            <button
              onClick={openStoreLocator}
              className="px-4 py-3 text-green-600 border border-green-300 rounded-xl hover:bg-green-50 transition-colors"
              title="Find store locations"
            >
              <ExternalLink className="h-4 w-4" />
            </button>
          )}
        </div>
        
        {showCustomStore && (
          <input
            type="text"
            value={shoppingData.customStore}
            onChange={(e) => setShoppingData(prev => ({ ...prev, customStore: e.target.value }))}
            placeholder="Enter custom store name..."
            className="w-full mt-2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
          />
        )}
      </div>

      {/* Add Item */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Add Items</label>
        <div className="flex space-x-2">
          <div className="flex-1 flex space-x-2">
            <select
              value={shoppingData.selectedCategory}
              onChange={(e) => setShoppingData(prev => ({ ...prev, selectedCategory: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
            >
              {shoppingData.categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <input
              type="text"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addItem()}
              placeholder="Add item..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
            />
          </div>
          <button
            onClick={addItem}
            disabled={!newItem.trim()}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Shopping Items */}
      {shoppingData.items.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-700">Shopping List</label>
            <div className="text-xs text-gray-500">
              {completedCount}/{totalCount} completed
            </div>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {shoppingData.items.map((item) => (
              <div 
                key={item.id} 
                className={`flex items-center space-x-3 p-3 rounded-lg border transition-all ${
                  item.completed 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <button
                  onClick={() => toggleItemComplete(item.id)}
                  className={`p-1 rounded-full transition-colors ${
                    item.completed 
                      ? 'text-green-600 bg-green-100' 
                      : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                  }`}
                >
                  {item.completed ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <div className="h-4 w-4 border-2 border-current rounded-full"></div>
                  )}
                </button>
                
                <div className="flex-1">
                  <div className={`font-medium ${item.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                    {item.name}
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <Tags className="h-3 w-3" />
                    <span>{item.category}</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value) || 1)}
                    min="1"
                    className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-green-500 focus:border-green-500"
                  />
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Remove item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Budget Section */}
      <div className="mb-4">
        <div className="flex items-center space-x-2 mb-2">
          <button
            onClick={() => setShowBudget(!showBudget)}
            className="text-sm font-medium text-gray-700 hover:text-gray-900 flex items-center space-x-1"
          >
            <DollarSign className="h-4 w-4" />
            <span>Budget {showBudget ? '(Hide)' : '(Optional)'}</span>
          </button>
        </div>
        {showBudget && (
          <input
            type="number"
            value={shoppingData.budget}
            onChange={(e) => setShoppingData(prev => ({ ...prev, budget: e.target.value }))}
            placeholder="Enter budget amount..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
          />
        )}
      </div>

      {/* Notes */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
        <textarea
          value={shoppingData.notes}
          onChange={(e) => setShoppingData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Any special instructions or notes..."
          rows="2"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-3">
        {shoppingData.items.length > 0 && (
          <button
            onClick={shareList}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
          >
            <Share2 className="h-4 w-4" />
            <span>Share List</span>
          </button>
        )}
        
        {(shoppingData.store || shoppingData.customStore) && (
          <button
            onClick={openStoreLocator}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200 transition-colors"
          >
            <MapPin className="h-4 w-4" />
            <span>Find Store</span>
            <ExternalLink className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Shopping Summary */}
      {shoppingData.items.length > 0 && (
        <div className="mt-4 p-3 bg-green-50 rounded-xl">
          <div className="text-sm font-medium text-green-900 mb-1">Shopping Summary</div>
          <div className="text-sm text-green-700">
            {totalCount} item{totalCount !== 1 ? 's' : ''} • {completedCount} completed
            {shoppingData.estimatedTime && ` • ${shoppingData.estimatedTime}`}
            {shoppingData.budget && ` • $${shoppingData.budget} budget`}
          </div>
          {(shoppingData.store || shoppingData.customStore) && (
            <div className="text-xs text-green-600 mt-1">
              Store: {shoppingData.store || shoppingData.customStore}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ShoppingTaskTemplate;