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

export const EQUIPMENT_CONDITION = {
    WORKING: 'WORKING',
    IDLE: 'IDLE',
    UNDER_MAINTENANCE: 'UNDER MAINTENANCE',
 }


 export const EQUIPMENT_FIELDS = {
    TYPE: 'TYPE',
    COMPANY: 'COMPANY',
    CAPACITY: 'CAPACITY',
 }
 export const PERMISSIONS = {

 }

export const ACTION_PERMISSIONS = {
    CREATE: 'CREATE',
    UPDATE: 'UPDATE',
    DELETE: 'DELETE',
 }

export const ALL_PERMISSIONS = {

}

export const FINAL_PRODUCT_SECTION = 'Final Product'
export const checkPermission = (user, permission) => {
    return user?.role === USER_ROLES.ADMIN || user?.permissions?.includes(permission);
}

