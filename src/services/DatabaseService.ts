import {Config} from "@/config";

export const DatabaseService = {
  prepare_table_name: (table_name: string): string => {
    const dbTableNamePrefix: string = Config.db_table_prefix.trim();

    if (dbTableNamePrefix === '') {
      return table_name;
    }

    if (dbTableNamePrefix.endsWith('_')) {
      return dbTableNamePrefix + table_name;
    }

    return dbTableNamePrefix + '_' + table_name;
  },

  table_names: {
    customers: '',
    bills: '',
    bill_items: '',
    menu_items: '',
    categories: '',
  },
}

// Initialize table_names after DatabaseService is defined
DatabaseService.table_names = {
  customers: DatabaseService.prepare_table_name('customers'),
  bills: DatabaseService.prepare_table_name('bills'),
  bill_items: DatabaseService.prepare_table_name('bill_items'),
  menu_items: DatabaseService.prepare_table_name('menu_items'),
  categories: DatabaseService.prepare_table_name('categories'),
};