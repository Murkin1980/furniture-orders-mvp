export const STEP_STATUSES = ["pending", "done", "skipped"];

export const PROJECT_TEMPLATES = [
  {
    code: "kitchen-basic",
    name: "Kitchen project",
    furnitureType: "kitchen",
    steps: [
      ["measure_room", "Уточнить размеры помещения", "manager"],
      ["confirm_layout", "Подтвердить планировку", "designer"],
      ["approve_materials", "Согласовать материалы и фасады", "manager"],
      ["approve_hardware", "Согласовать фурнитуру", "manager"],
      ["confirm_budget", "Подтвердить бюджет", "manager"],
      ["final_quote", "Подготовить финальный расчёт", "manager"],
      ["confirm_order", "Подписать или подтвердить заказ", "manager"],
      ["start_production", "Запустить в производство", "production"],
      ["production_check", "Контроль готовности", "production"],
      ["delivery_installation", "Доставка и монтаж", "production"],
      ["final_handover", "Финальная сдача", "manager"]
    ]
  },
  {
    code: "wardrobe-basic",
    name: "Wardrobe project",
    furnitureType: "wardrobe",
    steps: [
      ["measure_niche", "Замер ниши или помещения", "manager"],
      ["confirm_configuration", "Подтверждение конфигурации", "designer"],
      ["confirm_filling", "Подтверждение наполнения", "designer"],
      ["approve_color_material", "Согласование цвета и материала", "manager"],
      ["approve_price", "Согласование стоимости", "manager"],
      ["production", "Производство", "production"],
      ["delivery", "Доставка", "production"],
      ["installation", "Монтаж", "production"],
      ["acceptance", "Приёмка", "manager"]
    ]
  },
  {
    code: "casework-basic",
    name: "Simple casework project",
    furnitureType: "table",
    aliases: ["commercial", "soft", "repair"],
    steps: [
      ["confirm_size", "Уточнить размеры", "manager"],
      ["approve_shape_material", "Согласовать форму и материал", "manager"],
      ["approve_finish", "Подтвердить отделку", "designer"],
      ["approve_price", "Согласовать цену", "manager"],
      ["start_production", "Запуск в производство", "production"],
      ["quality_check", "Контроль качества", "production"],
      ["handover_delivery", "Выдача или доставка", "manager"]
    ]
  }
];

export function isStepStatus(value) {
  return STEP_STATUSES.includes(value);
}

export function findProjectTemplate(furnitureType) {
  const normalizedType = furnitureType || "table";
  return PROJECT_TEMPLATES.find((template) => {
    return template.furnitureType === normalizedType || template.aliases?.includes(normalizedType);
  }) || PROJECT_TEMPLATES.find((template) => template.furnitureType === "table");
}

export function getTemplateSteps(template) {
  return template.steps.map(([stepCode, title, defaultAssigneeRole], index) => ({
    stepCode,
    title,
    sortOrder: (index + 1) * 10,
    required: true,
    defaultAssigneeRole
  }));
}
