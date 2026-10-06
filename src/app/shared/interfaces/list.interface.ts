export interface ListFilter {
  columnName: string | string[];
  type: string;
  value: any;
}

export interface ListRequest {
  filterList: ListFilter[];
  sortHeader: string;
  sortDirection: string;
  page: number;
  limit: number;
  isPagination: boolean;
}
