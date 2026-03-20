// Local food database — instant results, no API needed
// All values per 100g. Sorted by popularity.
const LOCAL_FOODS = [
  // ── Proteins ──────────────────────────────────────────────
  { id: 'l001', name: 'Chicken Breast (cooked)', brand: '', calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  { id: 'l002', name: 'Chicken Thigh (cooked)', brand: '', calories: 209, protein: 26, carbs: 0, fat: 11 },
  { id: 'l003', name: 'Chicken Wings (cooked)', brand: '', calories: 290, protein: 27, carbs: 0, fat: 19 },
  { id: 'l004', name: 'Ground Beef 80/20 (cooked)', brand: '', calories: 254, protein: 26, carbs: 0, fat: 17 },
  { id: 'l005', name: 'Ground Beef Lean 90/10 (cooked)', brand: '', calories: 196, protein: 28, carbs: 0, fat: 9 },
  { id: 'l006', name: 'Beef Steak (grilled)', brand: '', calories: 271, protein: 26, carbs: 0, fat: 18 },
  { id: 'l007', name: 'Salmon (cooked)', brand: '', calories: 206, protein: 20, carbs: 0, fat: 13 },
  { id: 'l008', name: 'Tuna (canned in water)', brand: '', calories: 116, protein: 26, carbs: 0, fat: 1 },
  { id: 'l009', name: 'Shrimp (cooked)', brand: '', calories: 99, protein: 24, carbs: 0.2, fat: 0.3 },
  { id: 'l010', name: 'Tilapia (cooked)', brand: '', calories: 128, protein: 26, carbs: 0, fat: 3 },
  { id: 'l011', name: 'Cod (cooked)', brand: '', calories: 105, protein: 23, carbs: 0, fat: 0.9 },
  { id: 'l012', name: 'Egg (whole, large)', brand: '', calories: 143, protein: 13, carbs: 1, fat: 10 },
  { id: 'l013', name: 'Egg White', brand: '', calories: 52, protein: 11, carbs: 0.7, fat: 0.2 },
  { id: 'l014', name: 'Turkey Breast (cooked)', brand: '', calories: 135, protein: 30, carbs: 0, fat: 1 },
  { id: 'l015', name: 'Pork Tenderloin (cooked)', brand: '', calories: 166, protein: 29, carbs: 0, fat: 5 },
  { id: 'l016', name: 'Bacon (cooked)', brand: '', calories: 541, protein: 37, carbs: 1.4, fat: 42 },
  { id: 'l017', name: 'Ham (deli)', brand: '', calories: 113, protein: 17, carbs: 2, fat: 4 },
  { id: 'l018', name: 'Lamb Chop (cooked)', brand: '', calories: 294, protein: 25, carbs: 0, fat: 21 },

  // ── Dairy ─────────────────────────────────────────────────
  { id: 'l020', name: 'Whole Milk', brand: '', calories: 61, protein: 3.2, carbs: 4.8, fat: 3.3 },
  { id: 'l021', name: 'Skim Milk', brand: '', calories: 34, protein: 3.4, carbs: 4.9, fat: 0.1 },
  { id: 'l022', name: 'Greek Yogurt (plain, full-fat)', brand: '', calories: 97, protein: 9, carbs: 3.6, fat: 5 },
  { id: 'l023', name: 'Greek Yogurt (plain, 0%)', brand: '', calories: 59, protein: 10, carbs: 3.6, fat: 0.4 },
  { id: 'l024', name: 'Cottage Cheese (low-fat)', brand: '', calories: 72, protein: 12, carbs: 2.7, fat: 1 },
  { id: 'l025', name: 'Cheddar Cheese', brand: '', calories: 402, protein: 25, carbs: 1.3, fat: 33 },
  { id: 'l026', name: 'Mozzarella Cheese', brand: '', calories: 280, protein: 28, carbs: 2.2, fat: 17 },
  { id: 'l027', name: 'Butter', brand: '', calories: 717, protein: 0.9, carbs: 0.1, fat: 81 },
  { id: 'l028', name: 'Cream Cheese', brand: '', calories: 342, protein: 6, carbs: 4, fat: 34 },
  { id: 'l029', name: 'Heavy Cream', brand: '', calories: 340, protein: 2.8, carbs: 2.8, fat: 36 },
  { id: 'l030', name: 'Whey Protein Powder', brand: '', calories: 352, protein: 78, carbs: 8, fat: 3.5 },

  // ── Grains & Carbs ────────────────────────────────────────
  { id: 'l040', name: 'White Rice (cooked)', brand: '', calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
  { id: 'l041', name: 'Brown Rice (cooked)', brand: '', calories: 123, protein: 2.7, carbs: 26, fat: 1 },
  { id: 'l042', name: 'Oats (dry)', brand: '', calories: 389, protein: 17, carbs: 66, fat: 7 },
  { id: 'l043', name: 'Oatmeal (cooked)', brand: '', calories: 71, protein: 2.5, carbs: 12, fat: 1.5 },
  { id: 'l044', name: 'White Bread', brand: '', calories: 265, protein: 9, carbs: 49, fat: 3.2 },
  { id: 'l045', name: 'Whole Wheat Bread', brand: '', calories: 247, protein: 13, carbs: 41, fat: 4 },
  { id: 'l046', name: 'Pasta (cooked)', brand: '', calories: 158, protein: 5.8, carbs: 31, fat: 0.9 },
  { id: 'l047', name: 'Spaghetti (cooked)', brand: '', calories: 158, protein: 5.8, carbs: 31, fat: 0.9 },
  { id: 'l048', name: 'Quinoa (cooked)', brand: '', calories: 120, protein: 4.4, carbs: 21, fat: 1.9 },
  { id: 'l049', name: 'Sweet Potato (cooked)', brand: '', calories: 90, protein: 2, carbs: 21, fat: 0.1 },
  { id: 'l050', name: 'White Potato (cooked)', brand: '', calories: 87, protein: 1.9, carbs: 20, fat: 0.1 },
  { id: 'l051', name: 'Tortilla (flour)', brand: '', calories: 312, protein: 8, carbs: 52, fat: 8 },
  { id: 'l052', name: 'Corn Tortilla', brand: '', calories: 218, protein: 5.7, carbs: 46, fat: 3 },
  { id: 'l053', name: 'Bagel (plain)', brand: '', calories: 245, protein: 10, carbs: 48, fat: 1.5 },
  { id: 'l054', name: 'Granola', brand: '', calories: 471, protein: 10, carbs: 64, fat: 20 },

  // ── Vegetables ────────────────────────────────────────────
  { id: 'l060', name: 'Broccoli (raw)', brand: '', calories: 34, protein: 2.8, carbs: 7, fat: 0.4 },
  { id: 'l061', name: 'Spinach (raw)', brand: '', calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4 },
  { id: 'l062', name: 'Kale (raw)', brand: '', calories: 49, protein: 4.3, carbs: 9, fat: 0.9 },
  { id: 'l063', name: 'Lettuce (romaine)', brand: '', calories: 17, protein: 1.2, carbs: 3.3, fat: 0.3 },
  { id: 'l064', name: 'Tomato', brand: '', calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2 },
  { id: 'l065', name: 'Cucumber', brand: '', calories: 15, protein: 0.7, carbs: 3.6, fat: 0.1 },
  { id: 'l066', name: 'Bell Pepper (red)', brand: '', calories: 31, protein: 1, carbs: 6, fat: 0.3 },
  { id: 'l067', name: 'Carrot (raw)', brand: '', calories: 41, protein: 0.9, carbs: 10, fat: 0.2 },
  { id: 'l068', name: 'Onion', brand: '', calories: 40, protein: 1.1, carbs: 9.3, fat: 0.1 },
  { id: 'l069', name: 'Garlic', brand: '', calories: 149, protein: 6.4, carbs: 33, fat: 0.5 },
  { id: 'l070', name: 'Avocado', brand: '', calories: 160, protein: 2, carbs: 9, fat: 15 },
  { id: 'l071', name: 'Corn (cooked)', brand: '', calories: 96, protein: 3.4, carbs: 21, fat: 1.5 },
  { id: 'l072', name: 'Green Beans (cooked)', brand: '', calories: 35, protein: 1.9, carbs: 8, fat: 0.3 },
  { id: 'l073', name: 'Mushrooms (raw)', brand: '', calories: 22, protein: 3.1, carbs: 3.3, fat: 0.3 },
  { id: 'l074', name: 'Zucchini (cooked)', brand: '', calories: 17, protein: 1.2, carbs: 3.5, fat: 0.3 },
  { id: 'l075', name: 'Cauliflower (raw)', brand: '', calories: 25, protein: 1.9, carbs: 5, fat: 0.3 },
  { id: 'l076', name: 'Asparagus (cooked)', brand: '', calories: 22, protein: 2.4, carbs: 4.1, fat: 0.2 },

  // ── Fruits ────────────────────────────────────────────────
  { id: 'l080', name: 'Apple', brand: '', calories: 52, protein: 0.3, carbs: 14, fat: 0.2 },
  { id: 'l081', name: 'Banana', brand: '', calories: 89, protein: 1.1, carbs: 23, fat: 0.3 },
  { id: 'l082', name: 'Orange', brand: '', calories: 47, protein: 0.9, carbs: 12, fat: 0.1 },
  { id: 'l083', name: 'Strawberries', brand: '', calories: 32, protein: 0.7, carbs: 7.7, fat: 0.3 },
  { id: 'l084', name: 'Blueberries', brand: '', calories: 57, protein: 0.7, carbs: 14, fat: 0.3 },
  { id: 'l085', name: 'Grapes', brand: '', calories: 69, protein: 0.7, carbs: 18, fat: 0.2 },
  { id: 'l086', name: 'Mango', brand: '', calories: 60, protein: 0.8, carbs: 15, fat: 0.4 },
  { id: 'l087', name: 'Watermelon', brand: '', calories: 30, protein: 0.6, carbs: 7.6, fat: 0.2 },
  { id: 'l088', name: 'Pineapple', brand: '', calories: 50, protein: 0.5, carbs: 13, fat: 0.1 },
  { id: 'l089', name: 'Peach', brand: '', calories: 39, protein: 0.9, carbs: 10, fat: 0.3 },

  // ── Legumes ───────────────────────────────────────────────
  { id: 'l090', name: 'Black Beans (cooked)', brand: '', calories: 132, protein: 8.9, carbs: 24, fat: 0.5 },
  { id: 'l091', name: 'Chickpeas (cooked)', brand: '', calories: 164, protein: 8.9, carbs: 27, fat: 2.6 },
  { id: 'l092', name: 'Lentils (cooked)', brand: '', calories: 116, protein: 9, carbs: 20, fat: 0.4 },
  { id: 'l093', name: 'Edamame (cooked)', brand: '', calories: 122, protein: 11, carbs: 10, fat: 5 },
  { id: 'l094', name: 'Peanut Butter', brand: '', calories: 588, protein: 25, carbs: 20, fat: 50 },

  // ── Nuts & Seeds ──────────────────────────────────────────
  { id: 'l100', name: 'Almonds', brand: '', calories: 579, protein: 21, carbs: 22, fat: 50 },
  { id: 'l101', name: 'Walnuts', brand: '', calories: 654, protein: 15, carbs: 14, fat: 65 },
  { id: 'l102', name: 'Cashews', brand: '', calories: 553, protein: 18, carbs: 30, fat: 44 },
  { id: 'l103', name: 'Chia Seeds', brand: '', calories: 486, protein: 17, carbs: 42, fat: 31 },
  { id: 'l104', name: 'Sunflower Seeds', brand: '', calories: 584, protein: 21, carbs: 20, fat: 51 },
  { id: 'l105', name: 'Olive Oil', brand: '', calories: 884, protein: 0, carbs: 0, fat: 100 },
  { id: 'l106', name: 'Coconut Oil', brand: '', calories: 862, protein: 0, carbs: 0, fat: 100 },

  // ── Common Meals ──────────────────────────────────────────
  { id: 'l110', name: 'Pizza (cheese, 1 slice)', brand: '', calories: 272, protein: 12, carbs: 34, fat: 10 },
  { id: 'l111', name: 'Cheeseburger (fast food)', brand: '', calories: 303, protein: 15, carbs: 33, fat: 13 },
  { id: 'l112', name: 'French Fries', brand: '', calories: 312, protein: 3.4, carbs: 41, fat: 15 },
  { id: 'l113', name: 'Caesar Salad', brand: '', calories: 158, protein: 4, carbs: 8, fat: 13 },
  { id: 'l114', name: 'Sushi Rice (per roll)', brand: '', calories: 150, protein: 3, carbs: 30, fat: 1 },
  { id: 'l115', name: 'Burrito (chicken)', brand: '', calories: 217, protein: 11, carbs: 28, fat: 6.5 },
  { id: 'l116', name: 'Scrambled Eggs (2 eggs)', brand: '', calories: 148, protein: 10, carbs: 1.6, fat: 11 },
  { id: 'l117', name: 'Pancakes (plain)', brand: '', calories: 227, protein: 6, carbs: 34, fat: 8 },
  { id: 'l118', name: 'Sandwich (turkey)', brand: '', calories: 230, protein: 18, carbs: 26, fat: 5 },

  // ── Snacks & Sweets ───────────────────────────────────────
  { id: 'l120', name: 'Protein Bar', brand: '', calories: 200, protein: 20, carbs: 22, fat: 7 },
  { id: 'l121', name: 'Dark Chocolate (70%)', brand: '', calories: 598, protein: 8, carbs: 46, fat: 43 },
  { id: 'l122', name: 'Milk Chocolate', brand: '', calories: 535, protein: 7.7, carbs: 60, fat: 30 },
  { id: 'l123', name: 'Rice Cakes', brand: '', calories: 387, protein: 8, carbs: 81, fat: 3 },
  { id: 'l124', name: 'Potato Chips', brand: '', calories: 536, protein: 7, carbs: 53, fat: 35 },
  { id: 'l125', name: 'Popcorn (plain)', brand: '', calories: 375, protein: 11, carbs: 74, fat: 4.5 },
  { id: 'l126', name: 'Hummus', brand: '', calories: 166, protein: 8, carbs: 14, fat: 10 },
  { id: 'l127', name: 'Protein Shake (1 scoop + water)', brand: '', calories: 120, protein: 25, carbs: 3, fat: 1.5 },

  // ── Drinks ────────────────────────────────────────────────
  { id: 'l130', name: 'Orange Juice', brand: '', calories: 45, protein: 0.7, carbs: 10, fat: 0.2 },
  { id: 'l131', name: 'Whole Milk (1 cup)', brand: '', calories: 149, protein: 8, carbs: 12, fat: 8 },
  { id: 'l132', name: 'Almond Milk (unsweetened)', brand: '', calories: 13, protein: 0.4, carbs: 0.3, fat: 1.1 },
  { id: 'l133', name: 'Coffee (black)', brand: '', calories: 2, protein: 0.3, carbs: 0, fat: 0 },
]

export function searchLocalFoods(query) {
  if (!query.trim()) return []
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  const scored = LOCAL_FOODS
    .map((food) => {
      const name = food.name.toLowerCase()
      let score = 0
      for (const term of terms) {
        if (name.startsWith(term)) score += 3
        else if (name.includes(term)) score += 1
      }
      return { food, score }
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
  return scored.slice(0, 10).map(({ food }) => food)
}
