import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'EasyPharma API',
      version: '2.0.0',
      description: 'Professional pharmacy management system REST API',
      contact: { name: 'EasyPharma Support', email: 'support@easypharma.com' },
    },
    servers: [{ url: '/api', description: 'EasyPharma API Server' }],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Medicine: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            generalName: { type: 'string' },
            brandName: { type: 'string' },
            scientificName: { type: 'string' },
            manufacturer: { type: 'string' },
            category: { type: 'string' },
            unitName: { type: 'string' },
            unitType: { type: 'string', enum: ['tablet','capsule','bottle','tube','injection','vial','ampoule','packet','box','strip','carton','ml','litre','gram','kilogram'] },
            barcode: { type: 'string' },
            medicineCode: { type: 'string' },
            isControlled: { type: 'boolean' },
            requiresPrescription: { type: 'boolean' },
            reorderLevel: { type: 'integer' },
          },
        },
        StockItem: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            medicineId: { type: 'string', format: 'uuid' },
            quantity: { type: 'integer' },
            sellingPrice: { type: 'string' },
            buyingPrice: { type: 'string' },
            expiryDate: { type: 'string', format: 'date-time' },
          },
        },
        Bill: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            customerName: { type: 'string' },
            totalAmount: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Authentication' },
      { name: 'Medicines', description: 'Medicine catalog' },
      { name: 'Stock', description: 'Stock management' },
      { name: 'Billing', description: 'Customer billing & POS' },
      { name: 'Analytics', description: 'Profit analytics' },
      { name: 'Suppliers', description: 'Supplier management' },
      { name: 'Expenses', description: 'Expense tracking' },
      { name: 'Reports', description: 'Daily reports' },
      { name: 'Notifications', description: 'Notification center' },
      { name: 'System', description: 'System health & backups' },
      { name: 'Users', description: 'User management' },
      { name: 'External API', description: 'Public API with API key' },
    ],
  },
  apis: ['./src/routes/*.js'],
};

export const swaggerSpec = swaggerJsdoc(options);
