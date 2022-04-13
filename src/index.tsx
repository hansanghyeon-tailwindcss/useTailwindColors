import { createDistributionValues, createHueScale, createSaturationScale } from './scales';
import { output } from './responses';
import { PaletteConfig } from './types';


export function luminanceFromRGB(r: number, g: number, b: number) {
  // Formula from WCAG 2.0

  const [R, G, B] = [r, g, b].map((c) => {
    c /= 255; // to 0-1 range
    return c < 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 21.26 * R + 71.52 * G + 7.22 * B;
}

export function luminanceFromHex(H: string) {
  const rgb = hexToRGB(H);
  return round(luminanceFromRGB(rgb.r, rgb.g, rgb.b), 2);
}

// TODO: Even out this function, luminance values aren't linear/good

export function lightnessFromHSLum(H: number, S: number, Lum: number) {
  const vals: any = {};
  for (let L = 99; L >= 0; L--) {
    const rgb = HSLtoRGB(H, S, L);
    vals[L] = Math.abs(Lum - luminanceFromRGB(rgb.r, rgb.g, rgb.b));
  }

  // Run through all these and find the closest to 0

  let lowestDiff = 100;
  let newL = 100;
  for (let i = Object.keys(vals).length - 1; i >= 0; i--) {
    if (vals[i] < lowestDiff) {
      newL = i;
      lowestDiff = vals[i];
    }
  }

  return newL;
}

export function hexToRGB(H: string) {
  if (H.length === 6 && !H.startsWith('#')) {
    H = `#${H}`;
  }

  let r = '0';
  let g = '0';
  let b = '0';
  if (H.length === 4) {
    r = `0x${H[1]}${H[1]}`;
    g = `0x${H[2]}${H[2]}`;
    b = `0x${H[3]}${H[3]}`;
  } else if (H.length === 7) {
    r = `0x${H[1]}${H[2]}`;
    g = `0x${H[3]}${H[4]}`;
    b = `0x${H[5]}${H[6]}`;
  }

  return { r: parseInt(r), g: parseInt(g), b: parseInt(b) };
}

export function hexToHSL(H: string) {
  if (H.length === 6 && !H.startsWith('#')) {
    H = `#${H}`;
  }

  // Convert hex to RGB first

  let { r, g, b } = hexToRGB(H);

  // Then to HSL

  r /= 255;
  g /= 255;
  b /= 255;
  const cmin = Math.min(r, g, b);
  const cmax = Math.max(r, g, b);
  const delta = cmax - cmin;
  let h = 0;
  let s = 0;
  let l = 0;

  if (delta === 0) { h = 0 }
  else if (cmax === r) { h = ((g - b) / delta) % 6 }
  else if (cmax === g) { h = (b - r) / delta + 2 }
  else { h = (r - g) / delta + 4 };

  h = Math.round(h * 60);

  if (h < 0) { h += 360 };

  l = (cmax + cmin) / 2;
  s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  s = +(s * 100).toFixed(1);
  l = +(l * 100).toFixed(1);

  //   return `hsl(${h},${s}%,${l}%)`;

  return { h, s, l };
}

export function HSLtoRGB(h: number, s: number, l: number) {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (h >= 0 && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (h >= 300 && h < 360) {
    r = c;
    g = 0;
    b = x;
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

export function HSLToHex(h: number, s: number, l: number) {
  let { r, g, b }: {
    r: string | number;
    g: string | number;
    b: string | number;
  } = HSLtoRGB(h, s, l);

  // Having obtained RGB, convert channels to hex

  r = r.toString(16);
  g = g.toString(16);
  b = b.toString(16);

  // Prepend 0s, if necessary

  if (r.length === 1) { r = `0${r}` };
  if (g.length === 1) { g = `0${g}` };
  if (b.length === 1) { b = `0${b}` };

  return `#${r}${g}${b}`;
}


export function round(value: number, precision = 0) {
  const multiplier = Math.pow(10, precision);
  return Math.round(value * multiplier) / multiplier;
}

export function createSwatches(palette: PaletteConfig) {
  const { value } = palette;

  // Tweaks may be passed in, otherwise use defaults

  const useLightness = palette.useLightness;
  const h = palette.h;
  const s = palette.s;
  const lMin = palette.lMin;
  const lMax = palette.lMax;

  // Create hue and saturation scales based on tweaks

  const hueScale = createHueScale(h);
  const saturationScale = createSaturationScale(s);

  // Get the base hex's H/S/L values

  const { h: valueH, s: valueS, l: valueL } = hexToHSL(value);

  // Create lightness scales based on tweak + lightness/luminance of current value

  const lightnessValue = useLightness ? valueL : luminanceFromHex(value);
  const distributionScale = createDistributionValues(lMin, lMax, lightnessValue);

  const swatches = hueScale.map(({ key }, i) => {
    // Hue value must be between 0-360
    // todo: fix this inside the function

    let newH = valueH + hueScale[i].tweak;
    newH = newH < 0 ? 360 + newH - 1 : newH;
    newH = newH > 720 ? newH - 360 : newH;
    newH = newH > 360 ? newH - 360 : newH;

    // Saturation must be between 0-100
    // todo: fix this inside the function

    let newS: any = valueS + saturationScale[i].tweak;
    newS = newS > 100 ? 100 : newS;

    const newL = useLightness
      ? distributionScale[i].tweak
      : lightnessFromHSLum(newH, newS, distributionScale[i].tweak);

    const newHex = HSLToHex(newH, newS, newL);
    const paletteI = key;

    return {
      stop: paletteI,

      // Sometimes the initial value is changed slightly during conversion,
      // overriding that with the original value

      hex: paletteI === 500 ? `#${palette.value.toUpperCase()}` : newHex.toUpperCase(),

      // Used in graphs

      h: newH,
      hScale: hueScale[i].tweak,
      s: newS,
      sScale: saturationScale[i].tweak,
      l: newL,
    };
  });

  return swatches;
}

type color = {
  'c50': string;
  'c100': string;
  'c200': string;
  'c300': string;
  'c400': string;
  'c500': string;
  'c600': string;
  'c700': string;
  'c800': string;
  'c900': string;
}
function useTailwindColors(value: string): color {
  if (value.includes('#')) {
    value = value.replaceAll('#', '');
  }
  const config: PaletteConfig = {
    id: `1`,
    name: 'name',
    value: value.toUpperCase(),
    h: 0,
    s: 0,
    lMin: 0,
    lMax: 100,
    useLightness: true,
    swatches: [],
  }
  const paletteValue = output([{
    ...config,
    swatches: createSwatches({
      ...config,
      swatches: [],
    })
    // @ts-ignore
  }])?.name;

  return Object.assign(
    {},
    ...Object.keys(paletteValue).
      map(key => ({ [`c${key}`]: paletteValue[key] }))
  );
};

export default useTailwindColors;