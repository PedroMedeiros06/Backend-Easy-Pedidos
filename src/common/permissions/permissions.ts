export const Permissions = {
  // Pedidos
  OrdersCreate: 'orders.create',
  OrdersView: 'orders.view',
  OrdersChangeStatus: 'orders.change_status',
  OrdersCancel: 'orders.cancel',

  // Catálogo (itens e categorias)
  CatalogView: 'catalog.view',
  CatalogManage: 'catalog.manage',

  // Estoque
  StockView: 'stock.view',
  StockCreate: 'stock.create',
  StockUpdate: 'stock.update',
  StockDelete: 'stock.delete',

  // Financeiro
  FinancialView: 'financial.view',

  // Membros
  MembersView: 'members.view',
  MembersCreate: 'members.create',
  MembersUpdate: 'members.update',
  MembersDelete: 'members.delete',
  MembersManagePermissions: 'members.manage_permissions',

  // Empresa
  CompanyView: 'company.view',
  CompanyUpdate: 'company.update',
} as const;

export type Permission = (typeof Permissions)[keyof typeof Permissions];
