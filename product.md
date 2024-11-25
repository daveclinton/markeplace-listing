{
  "title": "Premium Wireless Noise-Cancelling Headphones",
  "description": "Experience superior sound quality with our advanced noise-cancelling technology. Comfortable over-ear design with up to 30 hours of battery life.",
  "category": "Electronics",
  "condition": "New",
  "basePrice": 249.99,
  "pictures": [
    "https://example.com/headphones-front.jpg",
    "https://example.com/headphones-side.jpg"
  ],
  "specifics": {
    "color": "Black",
    "bluetooth": true,
    "wirelessRange": 10
  },
  "inventory": {
    "quantity": 100,
    "lowStockThreshold": 20,
    "location": "Warehouse A",
    "autoReorder": true,
    "reorderQuantity": 50
  },
  "shipping": {
    "service": "Express International",
    "cost": "15.99",
    "dispatchDays": 1,
    "dimensions": {
      "length": 20,
      "width": 15,
      "height": 8,
      "unit": "cm"
    },
    "weight": {
      "value": 0.5,
      "unit": "kg"
    }
  },
  "returns": {
    "accepted": true,
    "period": 30,
    "shippingPaidBy": "Seller",
    "restockingFee": 10,
    "conditions": [
      "Product must be unused",
      "Original packaging intact"
    ]
  },
  "variants": [
    {
      "attributes": {
        "color": "Black",
        "storage": "Standard"
      },
      "price": 249.99,
      "quantity": 50
    },
    {
      "attributes": {
        "color": "White",
        "storage": "Extended Battery"
      },
      "price": 279.99,
      "quantity": 30
    }
  ],
  "bundleInfo": {
    "isBundle": false
  },
  "seoMetadata": {
    "metaTitle": "Premium Wireless Noise-Cancelling Headphones",
    "metaDescription": "High-quality wireless headphones with advanced noise cancellation and long battery life.",
    "keywords": ["wireless headphones", "noise cancelling", "premium audio"]
  }
}



curl -X POST \
  "https://graph.facebook.com/v18.0/1145905063127700/items" \
  -H "Authorization: Bearer EAAQSMdA76pQBOwmOs2vwPJTY0emFJTm7MzJ2tqHGTPm6gEnoqRpTPk7NHIbfekIwjtR8vt9OMi8dFGNVJowha9RLcnYyYBDfIRUtG3UZBiGlG3QV5ZCrQQHRRRHnfeZAj3Cr40uU2hyTzzFdwwNWMZBdfDCqXcLfH7owVSXxMMQzZA4VbjgfzIlkdm4v5uYiawoyl0E0efkmC01HgUbAcEPzGKw0w3ZAw7qJIKPIYX0mehtjiuMJ4xz6iaobMA" \
  -H "Content-Type: application/json" \
  -d '{
    "availability": "in stock",
    "brand": "Sample Brand",
    "category": "CLOTHING_ACCESSORIES",
    "condition": "new",
    "description": "This is a sample product description",
    "image_urls": ["https://placekitten.com/200/200"],
    "name": "Sample Product",
    "price": 29.99,
    "url": "https://example.com/product",
    "retailer_id": "test_item_1"
  }'
 <!-- verify your page access: -->
  curl -X GET \
  "https://graph.facebook.com/v18.0/me/catalogs" \
  -H "Authorization: Bearer EAAQSMdA76pQBO2E0Fbee0Vs8wyR54d0SiZC270ZAUxia54ZBNKzmrlFBxKE5uHiMQWb3BS4mWlnlpS42IxCtsZBniTmjxcqwnjP1p0yNldwsVafKtcfkHNZACkLOKXuWkOcERO6vZBeUZC2sU0zUgg9E7XrT8hW0YyAH3sHhRNU1me44zkq8q6gLwg6x9jACwp9reQjv3dfQnL6ZBTQfjaItE4luV8ZARsbSt7hfThMslZBN4DTclG2CBCz9VTeSy4"

  <!-- get your catalog ID:
   -->
curl -X GET \
  "https://graph.facebook.com/v20.0/me/businesses" \
  -H "Authorization: Bearer EAAQSMdA76pQBO2E0Fbee0Vs8wyR54d0SiZC270ZAUxia54ZBNKzmrlFBxKE5uHiMQWb3BS4mWlnlpS42IxCtsZBniTmjxcqwnjP1p0yNldwsVafKtcfkHNZACkLOKXuWkOcERO6vZBeUZC2sU0zUgg9E7XrT8hW0YyAH3sHhRNU1me44zkq8q6gLwg6x9jACwp9reQjv3dfQnL6ZBTQfjaItE4luV8ZARsbSt7hfThMslZBN4DTclG2CBCz9VTeSy4"
"catalog_management", and "commerce_account_read_orders";

# Migrations

src/migrations/CreateUserTable: This specifies the folder (src/migrations) and the migration name (CreateUserTable)
pnpm migration:create src/migrations/CreateUserTable