// Source of truth for the "Add default categories" action on the
// categories screen (src/app/(protected)/categories.tsx). Category names
// are looked up via i18n keys (`categories.defaults.<key>`,
// `categories.defaultsSub.<key>.<subKey>`, `categories.defaultsIncome.<key>`)
// rather than hardcoded here, so this file only carries the structure
// (which icon, which subcategories) and en/pt copy lives in the locale
// files like every other user-facing string in this app.
//
// This replaces the DEFAULT_CATEGORY_SEED constant that used to live inline
// in categories.tsx — pulled out into its own file so it can be reused (and
// kept in sync) by scripts/seed_default_categories.sql, which performs the
// same reset as a one-shot SQL script for households that want to wipe and
// start over rather than fill in gaps in place.

export type DefaultCategorySeedEntry = {
  key: string;
  icon: string;
  subcategories: readonly { key: string; icon: string }[];
};

export const DEFAULT_EXPENSE_CATEGORY_SEED: readonly DefaultCategorySeedEntry[] = [
  {
    key: "housing",
    icon: "home-outline",
    subcategories: [
      { key: "rentMortgage", icon: "key-outline" },
      { key: "homeInsurance", icon: "shield-checkmark-outline" },
      { key: "maintenance", icon: "build-outline" },
    ],
  },
  {
    key: "utilities",
    icon: "flash-outline",
    subcategories: [
      { key: "electricity", icon: "flash-outline" },
      { key: "water", icon: "water-outline" },
      { key: "internetPhone", icon: "wifi-outline" },
    ],
  },
  {
    key: "groceries",
    icon: "cart-outline",
    subcategories: [
      { key: "supermarket", icon: "basket-outline" },
      { key: "householdSupplies", icon: "file-tray-outline" },
    ],
  },
  {
    key: "transportation",
    icon: "car-outline",
    subcategories: [
      { key: "fuel", icon: "speedometer-outline" },
      { key: "publicTransit", icon: "bus-outline" },
      { key: "carMaintenance", icon: "build-outline" },
    ],
  },
  {
    key: "healthWellness",
    icon: "medical-outline",
    subcategories: [
      { key: "doctorPharmacy", icon: "medkit-outline" },
      { key: "healthInsurance", icon: "shield-checkmark-outline" },
      { key: "fitness", icon: "fitness-outline" },
    ],
  },
  {
    key: "diningEntertainment",
    icon: "restaurant-outline",
    subcategories: [
      { key: "restaurantsTakeout", icon: "fast-food-outline" },
      { key: "streamingSubscriptions", icon: "play-circle-outline" },
      { key: "leisureHobbies", icon: "game-controller-outline" },
    ],
  },
  {
    key: "shoppingPersonalCare",
    icon: "bag-outline",
    subcategories: [
      { key: "clothing", icon: "shirt-outline" },
      { key: "personalCare", icon: "sparkles-outline" },
      { key: "electronicsGadgets", icon: "phone-portrait-outline" },
    ],
  },
  {
    key: "familyEducation",
    icon: "school-outline",
    subcategories: [
      { key: "childcare", icon: "people-outline" },
      { key: "tuitionCourses", icon: "book-outline" },
      { key: "kidsActivities", icon: "happy-outline" },
    ],
  },
  {
    key: "savingsInvestments",
    icon: "trending-up-outline",
    subcategories: [
      { key: "emergencyFund", icon: "umbrella-outline" },
      { key: "investments", icon: "stats-chart-outline" },
      { key: "retirement", icon: "hourglass-outline" },
    ],
  },
  {
    key: "debtObligations",
    icon: "card-outline",
    subcategories: [
      { key: "loanPayments", icon: "cash-outline" },
      { key: "creditCardPayments", icon: "card-outline" },
      { key: "taxesFees", icon: "document-text-outline" },
    ],
  },
];

// Income categories are kept flat (no subcategories) — a second level of
// nesting doesn't pull its weight for most households' income sources.
export const DEFAULT_INCOME_CATEGORY_SEED: readonly DefaultCategorySeedEntry[] = [
  { key: "salary", icon: "cash-outline", subcategories: [] },
  { key: "freelance", icon: "briefcase-outline", subcategories: [] },
  { key: "bonusCommissions", icon: "trophy-outline", subcategories: [] },
  { key: "investmentIncome", icon: "trending-up-outline", subcategories: [] },
  { key: "rentalIncome", icon: "home-outline", subcategories: [] },
  { key: "businessIncome", icon: "business-outline", subcategories: [] },
  { key: "giftsInheritance", icon: "gift-outline", subcategories: [] },
  { key: "refundsReimbursements", icon: "receipt-outline", subcategories: [] },
  { key: "governmentBenefits", icon: "shield-checkmark-outline", subcategories: [] },
  { key: "otherIncome", icon: "ellipsis-horizontal-circle-outline", subcategories: [] },
];
