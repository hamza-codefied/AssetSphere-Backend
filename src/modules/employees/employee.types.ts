export type EmployeeRole = 'admin' | 'pmo' | 'dev';

export const EMPLOYEE_ROLES: EmployeeRole[] = ['admin', 'pmo', 'dev'];

/** Roles an admin is allowed to assign when creating an employee. */
export const EMPLOYEE_CREATABLE_ROLES: EmployeeRole[] = ['pmo', 'dev'];

export type EmployeeStatus = 'Active' | 'Inactive';
