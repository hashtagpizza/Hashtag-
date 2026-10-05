import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  Flame,
  Utensils,
  Eye,
  AlertTriangle,
  RefreshCw,
  Image as ImageIcon,
} from 'lucide-react';
import { MENU_ITEMS, MENU_CATEGORIES, MenuItem, MenuItemSize } from '../../constants';
import { crmService } from '../../services/crmService';

export const MenuCms: React.FC = () => {
  const [items, setItems] = useState<MenuItem[]>(MENU_ITEMS);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<MenuItem | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<string>('pizza-veg');
  const [formDietary, setFormDietary] = useState<'veg' | 'non-veg'>('veg');
  const [formPrice, setFormPrice] = useState<number>(500);
  const [formDescription, setFormDescription] = useState('');
  const [formImage, setFormImage] = useState('');
  const [formInStock, setFormInStock] = useState(true);

  // Sizes for the dish
  const [sizes, setSizes] = useState<MenuItemSize[]>([
    { label: 'Regular (R)', shortLabel: 'R', price: 450 },
    { label: 'Medium (M)', shortLabel: 'M', price: 750 },
    { label: 'Large (L)', shortLabel: 'L', price: 1050 },
  ]);

  // Subscribe to live Firestore menu updates
  useEffect(() => {
    const unsub = crmService.subscribeToMenuItems((remoteItems) => {
      if (remoteItems && remoteItems.length > 0) {
        // Merge remote items with default items
        const remoteIds = new Set(remoteItems.map((r) => r.id));
        const merged = [
          ...remoteItems,
          ...MENU_ITEMS.filter((i) => !remoteIds.has(i.id)),
        ];
        setItems(merged);
      }
    });

    return () => {
      if (unsub) unsub();
    };
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchCat =
        activeCategory === 'all' ||
        (activeCategory === 'pizza' && item.category.startsWith('pizza')) ||
        (activeCategory === 'burger' && item.category.includes('burger')) ||
        (activeCategory === 'sides' && (item.category.includes('sides') || item.category.includes('cfc'))) ||
        (activeCategory === 'drinks' && item.category.includes('drinks')) ||
        item.category === activeCategory;
      const matchSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [items, activeCategory, searchQuery]);

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormName('');
    setFormCategory('pizza-veg');
    setFormDietary('veg');
    setFormPrice(600);
    setFormDescription('');
    setFormImage('/src/assets/images/hero_supreme_pizza_1790938618890.jpg');
    setFormInStock(true);
    setSizes([
      { label: 'Regular (R)', shortLabel: 'R', price: 450 },
      { label: 'Medium (M)', shortLabel: 'M', price: 750 },
      { label: 'Large (L)', shortLabel: 'L', price: 1050 },
    ]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormCategory(item.category);
    setFormDietary(item.dietary);
    setFormPrice(item.price);
    setFormDescription(item.description);
    setFormImage(item.image);
    setFormInStock(item.inStock !== false);
    setSizes(
      item.sizes && item.sizes.length > 0
        ? [...item.sizes]
        : [{ label: 'Regular', shortLabel: 'R', price: item.price }]
    );
    setIsModalOpen(true);
  };

  const handleToggleStock = async (item: MenuItem) => {
    const newStock = item.inStock === false ? true : false;
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, inStock: newStock } : i))
    );
    await crmService.toggleMenuItemStock(item.id, newStock);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    setLoading(true);
    try {
      const itemId = editingItem
        ? editingItem.id
        : 'item_' + Date.now().toString(36);

      const computedHighlightGroup =
        formCategory.startsWith('pizza') ? 'pizza' :
        formCategory.includes('burger') ? 'burger' :
        formCategory.includes('momo') ? 'momo' :
        formCategory.includes('cfc') ? 'cfc' : 'all';

      const newItem: MenuItem = {
        id: itemId,
        name: formName.trim(),
        description: formDescription.trim(),
        category: formCategory as any,
        highlightGroup: computedHighlightGroup,
        dietary: formDietary,
        price: formPrice,
        sizes: sizes.length > 0 ? sizes : undefined,
        image: formImage.trim() || '/src/assets/images/hero_supreme_pizza_1790938618890.jpg',
        inStock: formInStock,
      };

      await crmService.saveMenuItem(newItem);

      setItems((prev) => {
        const idx = prev.findIndex((i) => i.id === itemId);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = newItem;
          return updated;
        }
        return [newItem, ...prev];
      });

      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving menu item:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    const targetId = itemToDelete.id;
    setItems((prev) => prev.filter((i) => i.id !== targetId));
    setItemToDelete(null);
    await crmService.deleteMenuItem(targetId);
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 p-4 sm:p-6 overflow-hidden">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Utensils className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black text-white">Restaurant Menu CMS</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-slate-950">
              {filteredItems.length} Dishes
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manage live prices, sizes, availability, and menu items across storefront and POS.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Dish</span>
        </button>
      </div>

      {/* Control Bar: Search & Category Pills */}
      <div className="py-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search dish by name or keyword..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          {[
            { id: 'all', label: 'All Items' },
            { id: 'pizza', label: '🍕 Pizzas' },
            { id: 'burger', label: '🍔 Burgers' },
            { id: 'sides', label: '🍗 CFC & Sides' },
            { id: 'drinks', label: '🥤 Beverages' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer ${
                activeCategory === cat.id
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Items Table */}
      <div className="flex-1 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900/60">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/90 border-b border-slate-800 text-slate-400 font-bold sticky top-0 z-10">
            <tr>
              <th className="py-3 px-4">Dish Info</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Dietary</th>
              <th className="py-3 px-4">Base Price</th>
              <th className="py-3 px-4">Sizes / Variants</th>
              <th className="py-3 px-4">Stock Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {filteredItems.map((item) => (
              <tr key={item.id} className="hover:bg-slate-850/60 transition-colors">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700/80 overflow-hidden shrink-0">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-xs sm:text-sm">{item.name}</h4>
                      <p className="text-[11px] text-slate-400 line-clamp-1 max-w-xs">{item.description}</p>
                    </div>
                  </div>
                </td>

                <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                  {item.category}
                </td>

                <td className="py-3 px-4">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      item.dietary === 'veg'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                        : 'bg-red-950 text-red-400 border border-red-800/60'
                    }`}
                  >
                    {item.dietary}
                  </span>
                </td>

                <td className="py-3 px-4 font-mono font-bold text-amber-400 text-xs sm:text-sm">
                  Rs. {item.price}
                </td>

                <td className="py-3 px-4">
                  {item.sizes && item.sizes.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {item.sizes.map((s) => (
                        <span
                          key={s.label}
                          className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-300 border border-slate-700"
                        >
                          {s.shortLabel || s.label}: Rs.{s.price}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-500 text-[11px]">Standard</span>
                  )}
                </td>

                <td className="py-3 px-4">
                  <button
                    onClick={() => handleToggleStock(item)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                      item.inStock !== false
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                        : 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        item.inStock !== false ? 'bg-emerald-400' : 'bg-red-400'
                      }`}
                    />
                    <span>{item.inStock !== false ? 'In Stock' : 'Sold Out'}</span>
                  </button>
                </td>

                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => handleOpenEditModal(item)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                      title="Edit dish"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setItemToDelete(item)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-900/50 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                      title="Delete dish"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Dish Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">
                {editingItem ? 'Edit Menu Dish' : 'Add New Menu Dish'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Dish Name</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Hashtag Paneer Tikka Pizza"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="pizza-veg">Veg Pizza</option>
                    <option value="pizza-nonveg">Non-Veg Pizza</option>
                    <option value="burger-sandwich">Burger & Sandwich</option>
                    <option value="momo">Momo Special</option>
                    <option value="cfc-nonveg-sides">Crispy Chicken CFC</option>
                    <option value="sides-pasta">Garlic Breads & Pasta</option>
                    <option value="drinks-desserts">Drinks & Desserts</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Dietary Tag</label>
                  <select
                    value={formDietary}
                    onChange={(e) => setFormDietary(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="veg">🟢 Veg</option>
                    <option value="non-veg">🔴 Non-Veg</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Base Price (NPR)</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={formPrice}
                  onChange={(e) => setFormPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* Sizes Editor */}
              <div>
                <label className="block text-slate-300 font-bold mb-1">Sizes & Pricing</label>
                <div className="space-y-1.5">
                  {sizes.map((s, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={s.label}
                        onChange={(e) => {
                          const updated = [...sizes];
                          updated[idx].label = e.target.value;
                          setSizes(updated);
                        }}
                        className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white"
                      />
                      <input
                        type="number"
                        value={s.price}
                        onChange={(e) => {
                          const updated = [...sizes];
                          updated[idx].price = Number(e.target.value);
                          setSizes(updated);
                        }}
                        className="w-24 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setSizes((prev) => prev.filter((_, i) => i !== idx))}
                        className="p-1.5 text-slate-500 hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setSizes((prev) => [
                        ...prev,
                        { label: 'Medium', shortLabel: 'M', price: formPrice },
                      ])
                    }
                    className="text-[11px] font-bold text-amber-400 hover:underline pt-1"
                  >
                    + Add Size Variant
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Ingredients and culinary notes..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Image URL / Asset</label>
                <input
                  type="text"
                  value={formImage}
                  onChange={(e) => setFormImage(e.target.value)}
                  placeholder="/src/assets/images/hero_supreme_pizza_1790938618890.jpg"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="inStockCheck"
                  checked={formInStock}
                  onChange={(e) => setFormInStock(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-0 bg-slate-950 border-slate-700"
                />
                <label htmlFor="inStockCheck" className="text-white font-bold cursor-pointer">
                  Available in Stock (Visible on Storefront Menu)
                </label>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 font-bold hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Dish to Menu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-App Delete Confirmation Modal (Zero window.alert / window.confirm) */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-400 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Dish?</h3>
                <p className="text-xs text-slate-400">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-5">
              Are you sure you want to remove <span className="text-white font-bold">"{itemToDelete.name}"</span>? It will be removed immediately from both the customer storefront and the POS terminal.
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md cursor-pointer transition-colors"
              >
                Yes, Delete Dish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
