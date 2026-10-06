export interface User {
  _id: string;
  firstName: string;
  middleName: string;
  lastName: string;
  primaryEmail: string;
  secondaryEmail: string;
  primaryPhone: string;
  secondaryPhone: string;
  role: string;
  notes: string;
  isActive: boolean;
}

export interface ChangeUserPasswordInput {
  oldPassword: string;
  newPassword: string;
}

export interface UserInput {
  firstName: string;
  middleName: string;
  lastName: string;
  primaryEmail: string;
  secondaryEmail?: string;
  primaryPhone: string;
  secondaryPhone?: string;
  password?: string;
  role: string;
  notes: string;
  isActive?: boolean;
}
