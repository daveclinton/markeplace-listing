{
  "title": string;
  "description": string;
  "category": string;
  "condition": string;
  "basePrice": number;
  "pictures": string[];
  "inventory": {
    "quantity": number;
    "lowStockThreshold": number;
    "autoReorder": boolean;
    "reorderQuantity"?: number;
  };
  "shipping": {
    "service": string;
    "cost": string;
    "dispatchDays": number;
  };
  "specifics"?: Record<string, string | number>;
}