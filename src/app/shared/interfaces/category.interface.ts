export interface Category {
  _id: string;
  title: string;
  description?: string;
}

export type CategoryInput = Omit<Category, '_id'>;
