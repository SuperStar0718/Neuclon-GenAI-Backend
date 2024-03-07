export interface ICollection {
  collectionName: string;
  headers: string;
  status: boolean;
}

export interface ITable {
  name: string;
  collections: ICollection[];
}
