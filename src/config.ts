interface Configuration {
  ignore_tax: boolean,

  [key: string]: string | boolean | number;
}

export const Config: Configuration = {
  // ignore_tax: true,
  ignore_tax: false,
};