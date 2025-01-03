export const PAYMENT_STATUS = {
    PENDING: 'PENDING',
    PAID: 'PAID',
}

export const VENDOR_BILL_STATUS = {
    PENDING: 'PENDING',
    PAID: 'FULL PAID',
    PARTIAL: 'PARTIALLY PAID',
}
 export const VENDOR_PAYMENT_MODES = {
    CASH: 'CASH',
    BANK: 'BANK',
    UPI: 'UPI',
    CHEQUE: 'CHEQUE',
    OTHER: 'OTHER',
 }

 export const VENDOR_BILL_TYPES = {
    ADD: 'ADD',
    SUB: 'SUB',
 }
 export const USER_ROLES = {
    MANAGER: 'manager',
    ADMIN: 'admin',
 }

 export const PERMISSIONS = {
    PARTY_BILLS: 'PARTY_BILLS',
    WORKER_BILLS: 'WORKER_BILLS',
    SECTIONS: 'SECTIONS',
    ITEMS: 'ITEMS',
    VENDORS: 'VENDORS',
    WORKERS: 'WORKERS',
    FINAL_PRODUCT: 'FINAL_PRODUCT',
    PLATTING: 'PLATTING',
 }

export const PLATTING_TYPES = {
    INWARD: 'INWARD',
    OUTWARD: 'OUTWARD',
 }
export const ACTION_PERMISSIONS = {
    CREATE: 'CREATE',
    UPDATE: 'UPDATE',
    DELETE: 'DELETE',
 }

export const ALL_PERMISSIONS = {
    PARTY_BILLS_CREATE: 'PARTY_BILLS_CREATE',
    PARTY_BILLS_UPDATE: 'PARTY_BILLS_UPDATE',
    PARTY_BILLS_DELETE: 'PARTY_BILLS_DELETE',
    WORKER_BILLS_CREATE: 'WORKER_BILLS_CREATE',
    WORKER_BILLS_UPDATE: 'WORKER_BILLS_UPDATE',
    WORKER_BILLS_DELETE: 'WORKER_BILLS_DELETE',
    SECTIONS_CREATE: 'SECTIONS_CREATE',
    SECTIONS_UPDATE: 'SECTIONS_UPDATE',
    SECTIONS_DELETE: 'SECTIONS_DELETE',
    ITEMS_CREATE: 'ITEMS_CREATE',
    ITEMS_UPDATE: 'ITEMS_UPDATE',
    ITEMS_DELETE: 'ITEMS_DELETE',
    VENDORS_CREATE: 'VENDORS_CREATE',
    VENDORS_UPDATE: 'VENDORS_UPDATE',
    VENDORS_DELETE: 'VENDORS_DELETE',
    WORKERS_CREATE: 'WORKERS_CREATE',
    WORKERS_UPDATE: 'WORKERS_UPDATE',
    WORKERS_DELETE: 'WORKERS_DELETE',
    FINAL_PRODUCT_CREATE: 'FINAL_PRODUCT_CREATE',
    FINAL_PRODUCT_UPDATE: 'FINAL_PRODUCT_UPDATE',
    FINAL_PRODUCT_DELETE: 'FINAL_PRODUCT_DELETE',
}

export const FINAL_PRODUCT_SECTION = 'Final Product'
export const checkPermission = (user, permission) => {
    return user?.role === USER_ROLES.ADMIN || user?.permissions?.includes(permission);
}

