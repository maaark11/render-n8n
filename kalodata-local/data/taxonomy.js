'use strict';

/*
 * Shared taxonomy: the category list (name + icon) and regions.
 * Kept in one place so both the synthetic generator and the real-data
 * importers map categories to the same icons and vocabulary.
 */

const CATEGORIES = [
  { name: 'Beauty & Personal Care', icon: '💄' },
  { name: 'Womenswear & Underwear', icon: '👗' },
  { name: 'Menswear & Underwear', icon: '👕' },
  { name: 'Phones & Electronics', icon: '📱' },
  { name: 'Home Supplies', icon: '🏠' },
  { name: 'Kitchenware', icon: '🍳' },
  { name: 'Health', icon: '💊' },
  { name: 'Sports & Outdoor', icon: '⚽' },
  { name: 'Toys & Hobbies', icon: '🧸' },
  { name: 'Shoes', icon: '👟' },
  { name: 'Pet Supplies', icon: '🐾' },
  { name: 'Baby & Maternity', icon: '🍼' },
  { name: 'Jewellery & Accessories', icon: '💍' },
  { name: 'Food & Beverages', icon: '🍫' },
  { name: 'Automotive', icon: '🚗' },
];

const REGIONS = ['US', 'UK', 'ID', 'MY', 'TH', 'VN', 'PH', 'BR'];

const ICON_BY_NAME = Object.fromEntries(CATEGORIES.map((c) => [c.name, c.icon]));

function catIcon(name) {
  return ICON_BY_NAME[name] || '🏷️';
}

module.exports = { CATEGORIES, REGIONS, catIcon };
