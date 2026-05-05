interface Configuration {
  app_name: string,
  db_table_prefix: string,

  ignore_tax: boolean,

  [key: string]: string | boolean | number;
}

export const Config: Configuration = {
  app_name: "Thlush",
  db_table_prefix: "thlush",

  ignore_tax: false,
  // ignore_tax: false,
};
