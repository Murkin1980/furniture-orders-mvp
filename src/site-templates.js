export const SITE_TEMPLATES = Object.freeze([
  {
    key: "default-furniture",
    label: "Универсальная мебель",
    accentColor: "#116466",
    primaryOffer: "Мебель на заказ по размерам вашего помещения",
    furnitureTypes: ["Кухни", "Шкафы", "Гардеробные"],
    advantages: ["Бесплатная консультация", "Проектирование под помещение", "Монтаж готовой мебели"]
  },
  {
    key: "kitchen",
    label: "Кухни на заказ",
    accentColor: "#9b4f2f",
    primaryOffer: "Кухни на заказ с проектированием и монтажом",
    furnitureTypes: ["Прямые кухни", "Угловые кухни", "Кухни до потолка"],
    advantages: ["Замер и проект", "Выбор материалов", "Монтаж под ключ"]
  },
  {
    key: "wardrobe",
    label: "Шкафы и гардеробные",
    accentColor: "#4f5d75",
    primaryOffer: "Шкафы и гардеробные под точные размеры",
    furnitureTypes: ["Шкафы-купе", "Распашные шкафы", "Гардеробные"],
    advantages: ["Продуманное наполнение", "Точный замер", "Аккуратный монтаж"]
  },
  {
    key: "casework",
    label: "Корпусная мебель",
    accentColor: "#6b5b3e",
    primaryOffer: "Корпусная мебель для дома и бизнеса",
    furnitureTypes: ["ТВ-зоны", "Прихожие", "Офисная мебель"],
    advantages: ["Единый стиль", "Практичные материалы", "Изготовление по проекту"]
  }
]);

export function getSiteTemplate(templateKey) {
  return SITE_TEMPLATES.find((template) => template.key === templateKey) || SITE_TEMPLATES[0];
}

export function buildTemplateSiteBrief(templateKey, overrides = {}) {
  const template = getSiteTemplate(templateKey);
  return {
    primaryOffer: template.primaryOffer,
    furnitureTypes: [...template.furnitureTypes],
    advantages: [...template.advantages],
    accentColor: template.accentColor,
    ...overrides
  };
}
