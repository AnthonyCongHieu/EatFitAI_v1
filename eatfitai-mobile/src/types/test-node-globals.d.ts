declare const __dirname: string;

declare module 'fs' {
  const fs: any;
  export = fs;
  export const readFileSync: any;
  export const existsSync: any;
}

declare module 'path' {
  const path: any;
  export = path;
}
