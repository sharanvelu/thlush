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
}