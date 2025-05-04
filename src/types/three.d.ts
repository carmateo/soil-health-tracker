// This file provides basic type declarations for three.js
// You might need a more comprehensive solution like @types/three if you use more features.

declare module 'three' {
  export class TextureLoader {
    load(url: string): any; // Replace 'any' with a more specific Texture type if known
  }
  export class MeshPhongMaterial {
    constructor(options?: any); // Replace 'any' with specific material options type if known
    map?: any; // Replace 'any' with Texture type
    bumpMap?: any; // Replace 'any' with Texture type
    bumpScale?: number;
    specularMap?: any; // Replace 'any' with Texture type
    specular?: Color;
    shininess?: number;
  }
  export class Color {
    constructor(colorRepresentation?: string | number);
  }
  // Add other classes and types from three.js as needed
  // e.g., export class Scene { ... }
  // e.g., export interface Vector3 { x: number; y: number; z: number; }
}
