const isNode = typeof process !== "undefined" && process.versions != null && process.versions.node != null;

// Use different implementations based on environment
if (isNode) {
  // Node.js specific code
} else {
  // Browser specific code
}

// ESM version
let cryptoModule;
if (typeof window === "undefined") {
  cryptoModule = await import("crypto");
} else {
  // Use Web Crypto API
  cryptoModule = {
    randomBytes: (size) => {
      const array = new Uint8Array(size);
      window.crypto.getRandomValues(array);
      return array;
    },
  };
}
