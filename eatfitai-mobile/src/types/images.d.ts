declare module '*.png' {
  const content: number;
  export default content;
}

declare module '*.jpg' {
  const content: number;
  export default content;
}

declare module '*.jpeg' {
  const content: number;
  export default content;
}

declare module '*.svg' {
  import type * as React from 'react';
  const content: React.ComponentType<any>;
  export default content;
}

declare module '*.glb' {
  const content: number;
  export default content;
}

declare module '*.gltf' {
  const content: number;
  export default content;
}

declare module '*.bin' {
  const content: number;
  export default content;
}
